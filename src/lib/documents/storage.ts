import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUSINESS_DOCUMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import type { Tables } from "@/lib/supabase/database.types";

export const BUSINESS_DOCUMENT_BUCKET = "business-evidence" as const;
export const BUSINESS_DOCUMENT_PATH_PREFIX = "business-documents" as const;
export const BUSINESS_DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
export const BUSINESS_DOCUMENT_SIGNED_URL_SECONDS = 300;

export const BUSINESS_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type BusinessDocumentMimeType = (typeof BUSINESS_DOCUMENT_MIME_TYPES)[number];
export type BusinessDocumentRow = Tables<"business_documents">;
export type BusinessDocumentLinkRow = Tables<"business_document_links">;

export type BusinessDocumentFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type BusinessDocumentLinkInput = {
  serviceId: string;
  linkPurpose: string;
};

export type BusinessDocumentUploadInput = {
  file: BusinessDocumentFile;
  documentType: string;
  purpose: string;
  link?: BusinessDocumentLinkInput;
};

export type PrivateBusinessDocumentUrl = {
  document: BusinessDocumentRow;
  signedUrl: string;
  expiresInSeconds: number;
};

export type PrivateBusinessDocumentDownload = {
  document: BusinessDocumentRow;
  data: Blob;
};

export type BusinessDocumentServiceReference = {
  documentId: string;
  serviceId: string;
};

export type BusinessDocumentErrorCode =
  | "invalid_document_input"
  | "invalid_document_file"
  | "unsupported_document_type"
  | "document_file_too_large"
  | "document_file_empty"
  | "unsafe_document_filename"
  | "document_file_type_mismatch"
  | "invalid_document_path"
  | "document_not_found"
  | "document_storage_upload_failed"
  | "document_metadata_write_failed"
  | "document_link_target_invalid"
  | "document_link_write_failed"
  | "document_storage_read_failed"
  | "document_storage_cleanup_failed";

const DOCUMENT_TYPE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,99}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCUMENT_SELECT =
  "id,bucket_id,object_path,original_filename,mime_type,file_size,document_type,purpose,uploaded_by,created_at,updated_at";

const documentMetadataSchema = z.object({
  documentType: z.string().trim().regex(DOCUMENT_TYPE_PATTERN).max(100),
  purpose: z.string().trim().min(1).max(2000),
}).strict();

const documentLinkSchema = z.object({
  serviceId: z.string().uuid(),
  linkPurpose: z.string().trim().min(1).max(200),
}).strict();

const documentServiceReferenceSchema = z.object({
  documentId: z.string().uuid(),
  serviceId: z.string().uuid(),
}).strict();

export class BusinessDocumentError extends Error {
  readonly code: BusinessDocumentErrorCode;

  constructor(
    code: BusinessDocumentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BusinessDocumentError";
    this.code = code;
  }
}

function documentError(code: BusinessDocumentErrorCode, message: string): BusinessDocumentError {
  return new BusinessDocumentError(code, message);
}

function isSupportedMimeType(value: string): value is BusinessDocumentMimeType {
  return (BUSINESS_DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

function extensionForMimeType(mimeType: BusinessDocumentMimeType): "pdf" | "jpg" | "png" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  return "png";
}

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function matchesFileSignature(bytes: Uint8Array, mimeType: BusinessDocumentMimeType): boolean {
  if (mimeType === "application/pdf") {
    return hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  }

  if (mimeType === "image/jpeg") {
    return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
  }

  return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function isSafeOriginalFilename(filename: string): boolean {
  return (
    filename.length > 0 &&
    filename.length <= 255 &&
    filename === filename.trim() &&
    filename !== "." &&
    filename !== ".." &&
    !/[\\/]/u.test(filename) &&
    !/[\u0000-\u001f\u007f]/u.test(filename)
  );
}

function asFile(value: unknown): BusinessDocumentFile {
  if (typeof value !== "object" || value === null) {
    throw documentError("invalid_document_file", "A document file is required.");
  }

  const file = value as Partial<BusinessDocumentFile>;
  if (
    typeof file.name !== "string" ||
    typeof file.type !== "string" ||
    typeof file.size !== "number" ||
    !Number.isFinite(file.size) ||
    !Number.isInteger(file.size) ||
    typeof file.arrayBuffer !== "function"
  ) {
    throw documentError("invalid_document_file", "A valid document file is required.");
  }

  return file as BusinessDocumentFile;
}

function parseUploadInput(input: unknown): BusinessDocumentUploadInput {
  if (typeof input !== "object" || input === null) {
    throw documentError("invalid_document_input", "Document metadata is invalid.");
  }

  const value = input as Partial<BusinessDocumentUploadInput>;
  const metadata = documentMetadataSchema.safeParse({
    documentType: value.documentType,
    purpose: value.purpose,
  });
  if (!metadata.success) {
    throw documentError("invalid_document_input", "Document metadata is invalid.");
  }

  let link: BusinessDocumentLinkInput | undefined;
  if (value.link !== undefined) {
    const parsedLink = documentLinkSchema.safeParse(value.link);
    if (!parsedLink.success) {
      throw documentError("invalid_document_input", "Document link metadata is invalid.");
    }
    link = parsedLink.data;
  }

  return {
    file: asFile(value.file),
    documentType: metadata.data.documentType,
    purpose: metadata.data.purpose,
    link,
  };
}

export async function validateBusinessDocumentFile(fileValue: unknown): Promise<{
  originalFilename: string;
  mimeType: BusinessDocumentMimeType;
  fileSize: number;
  uploadBody: Blob;
}> {
  const file = asFile(fileValue);
  if (!isSafeOriginalFilename(file.name)) {
    throw documentError("unsafe_document_filename", "The document filename is unsafe.");
  }

  const mimeType = file.type.toLowerCase();
  if (!isSupportedMimeType(mimeType)) {
    throw documentError("unsupported_document_type", "Only PDF, JPEG, and PNG documents are supported.");
  }

  if (file.size === 0) {
    throw documentError("document_file_empty", "The document file is empty.");
  }
  if (file.size > BUSINESS_DOCUMENT_MAX_BYTES) {
    throw documentError("document_file_too_large", "The document file exceeds the 25 MB limit.");
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw documentError("invalid_document_file", "The document file could not be read.");
  }

  if (bytes.byteLength === 0) {
    throw documentError("document_file_empty", "The document file is empty.");
  }
  if (bytes.byteLength !== file.size || bytes.byteLength > BUSINESS_DOCUMENT_MAX_BYTES) {
    throw documentError("invalid_document_file", "The document file size is invalid.");
  }
  if (!matchesFileSignature(bytes, mimeType)) {
    throw documentError("document_file_type_mismatch", "The document content does not match its declared type.");
  }

  return {
    originalFilename: file.name,
    mimeType,
    fileSize: bytes.byteLength,
    uploadBody: new Blob([bytes.buffer as ArrayBuffer], { type: mimeType }),
  };
}

export async function preflightPrivateBusinessDocumentUpload(
  fileValue: unknown,
): Promise<void> {
  await requirePermission(BUSINESS_DOCUMENT_PERMISSIONS.write);
  await validateBusinessDocumentFile(fileValue);
}

export function buildBusinessDocumentObjectPath(
  documentId: string,
  mimeType: BusinessDocumentMimeType,
): string {
  if (!UUID_PATTERN.test(documentId)) {
    throw documentError("invalid_document_path", "The document path is invalid.");
  }
  return `${BUSINESS_DOCUMENT_PATH_PREFIX}/${documentId}.${extensionForMimeType(mimeType)}`;
}

export function isSafeBusinessDocumentObjectPath(path: string): boolean {
  return new RegExp(
    `^${BUSINESS_DOCUMENT_PATH_PREFIX}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(?:pdf|jpg|png)$`,
    "i",
  ).test(path);
}

function documentIdFromInput(input: unknown): string {
  const value = typeof input === "string" ? input : (input as { documentId?: unknown } | null)?.documentId;
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw documentError("invalid_document_input", "The document identifier is invalid.");
  }
  return value;
}

function documentServiceReferenceFromInput(input: unknown): BusinessDocumentServiceReference {
  const parsed = documentServiceReferenceSchema.safeParse(input);
  if (!parsed.success) {
    throw documentError("invalid_document_input", "The document and Service identifiers are invalid.");
  }
  return parsed.data;
}

async function loadDocument(
  supabase: ReturnType<typeof createAdminClient>,
  documentId: string,
): Promise<BusinessDocumentRow> {
  const { data, error } = await supabase
    .from("business_documents")
    .select(DOCUMENT_SELECT)
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw documentError("document_storage_read_failed", "The document could not be loaded.");
  }
  if (!data) {
    throw documentError("document_not_found", "The document was not found.");
  }
  if (
    data.bucket_id !== BUSINESS_DOCUMENT_BUCKET ||
    !isSafeBusinessDocumentObjectPath(data.object_path)
  ) {
    throw documentError("invalid_document_path", "The document path is invalid.");
  }
  return data;
}

async function cleanupUploadedDocument(
  supabase: ReturnType<typeof createAdminClient>,
  documentId: string,
  objectPath: string,
  removeMetadata: boolean,
  link?: BusinessDocumentLinkInput,
): Promise<boolean> {
  let databaseClean = true;
  if (link) {
    try {
      const { error } = await supabase
        .from("business_document_links")
        .delete()
        .eq("document_id", documentId)
        .eq("service_id", link.serviceId)
        .eq("link_purpose", link.linkPurpose);
      if (error) databaseClean = false;
    } catch {
      databaseClean = false;
    }
  }
  if (removeMetadata) {
    try {
      const { error } = await supabase.from("business_documents").delete().eq("id", documentId);
      if (error) databaseClean = false;
    } catch {
      databaseClean = false;
    }
  }

  // Keep the original object whenever database compensation failed or had an
  // uncertain outcome; removing it would leave persisted state pointing at a
  // missing original evidence object.
  if (!databaseClean) {
    return false;
  }

  try {
    const { error: removeError } = await supabase.storage
      .from(BUSINESS_DOCUMENT_BUCKET)
      .remove([objectPath]);
    return !removeError;
  } catch {
    return false;
  }
}

export async function cleanupUploadedPrivateBusinessDocument(
  document: BusinessDocumentRow,
  link: BusinessDocumentLinkInput,
): Promise<boolean> {
  return cleanupUploadedDocument(
    createAdminClient(),
    document.id,
    document.object_path,
    true,
    link,
  );
}

async function assertSupportedLinkTarget(
  supabase: ReturnType<typeof createAdminClient>,
  serviceId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) {
    throw documentError("document_link_target_invalid", "The Service link target is invalid.");
  }
}

async function assertDocumentLinkedToService(
  supabase: ReturnType<typeof createAdminClient>,
  documentId: string,
  serviceId: string,
): Promise<void> {
  await assertSupportedLinkTarget(supabase, serviceId);
  const { data, error } = await supabase
    .from("business_document_links")
    .select("document_id")
    .eq("document_id", documentId)
    .eq("service_id", serviceId)
    .maybeSingle();
  if (error) {
    throw documentError("document_storage_read_failed", "The Service document link could not be verified.");
  }
  if (!data) {
    throw documentError("document_not_found", "The document was not found for this Service.");
  }
}

async function insertDocumentLink(
  supabase: ReturnType<typeof createAdminClient>,
  documentId: string,
  link: BusinessDocumentLinkInput,
  actorId: string,
): Promise<void> {
  const { error } = await supabase.from("business_document_links").insert({
    document_id: documentId,
    service_id: link.serviceId,
    link_purpose: link.linkPurpose,
    linked_by: actorId,
  });
  if (error) {
    throw documentError("document_link_write_failed", "The document link could not be saved.");
  }
}

export async function uploadPrivateBusinessDocument(
  input: unknown,
): Promise<BusinessDocumentRow> {
  const user = await requirePermission(BUSINESS_DOCUMENT_PERMISSIONS.write);
  const value = parseUploadInput(input);
  const file = await validateBusinessDocumentFile(value.file);
  const documentId = randomUUID();
  const objectPath = buildBusinessDocumentObjectPath(documentId, file.mimeType);
  const supabase = createAdminClient();

  if (value.link) {
    await assertSupportedLinkTarget(supabase, value.link.serviceId);
  }

  const { data: uploadedObject, error: uploadError } = await supabase.storage
    .from(BUSINESS_DOCUMENT_BUCKET)
    .upload(objectPath, file.uploadBody, {
      contentType: file.mimeType,
      upsert: false,
    });

  if (uploadError || uploadedObject?.path !== objectPath) {
    const clean = await cleanupUploadedDocument(supabase, documentId, objectPath, false);
    if (!clean) {
      throw documentError("document_storage_cleanup_failed", "The document upload could not be cleaned up safely.");
    }
    throw documentError("document_storage_upload_failed", "The document could not be uploaded.");
  }

  const { data, error: metadataError } = await supabase
    .from("business_documents")
    .insert({
      id: documentId,
      bucket_id: BUSINESS_DOCUMENT_BUCKET,
      object_path: objectPath,
      original_filename: file.originalFilename,
      mime_type: file.mimeType,
      file_size: file.fileSize,
      document_type: value.documentType,
      purpose: value.purpose,
      uploaded_by: user.clerk_user_id,
    })
    .select(DOCUMENT_SELECT)
    .single();

  if (metadataError || !data) {
    // The metadata request may have committed before returning an error. Delete
    // by the generated document ID as compensation, then remove the object.
    const clean = await cleanupUploadedDocument(supabase, documentId, objectPath, true);
    if (!clean) {
      throw documentError("document_storage_cleanup_failed", "The document metadata could not be saved or cleaned up safely.");
    }
    throw documentError("document_metadata_write_failed", "The document metadata could not be saved.");
  }

  if (value.link) {
    try {
      await insertDocumentLink(supabase, documentId, value.link, user.clerk_user_id);
    } catch (error) {
      const clean = await cleanupUploadedDocument(supabase, documentId, objectPath, true, value.link);
      if (!clean) {
        throw documentError("document_storage_cleanup_failed", "The document link could not be saved or cleaned up safely.");
      }
      throw error;
    }
  }

  return data;
}

export async function getPrivateBusinessDocumentForService(
  input: unknown,
): Promise<BusinessDocumentRow> {
  await requirePermission(BUSINESS_DOCUMENT_PERMISSIONS.read);
  const supabase = createAdminClient();
  const reference = documentServiceReferenceFromInput(input);
  const document = await loadDocument(supabase, reference.documentId);
  await assertDocumentLinkedToService(supabase, reference.documentId, reference.serviceId);
  return document;
}

export async function createPrivateBusinessDocumentUrlForService(
  input: unknown,
): Promise<PrivateBusinessDocumentUrl> {
  await requirePermission(BUSINESS_DOCUMENT_PERMISSIONS.read);
  const supabase = createAdminClient();
  const reference = documentServiceReferenceFromInput(input);
  const document = await loadDocument(supabase, reference.documentId);
  await assertDocumentLinkedToService(supabase, reference.documentId, reference.serviceId);
  const { data, error } = await supabase.storage
    .from(document.bucket_id)
    .createSignedUrl(document.object_path, BUSINESS_DOCUMENT_SIGNED_URL_SECONDS);

  if (error || !data?.signedUrl) {
    throw documentError("document_storage_read_failed", "The private document URL could not be created.");
  }

  return {
    document,
    signedUrl: data.signedUrl,
    expiresInSeconds: BUSINESS_DOCUMENT_SIGNED_URL_SECONDS,
  };
}

export async function downloadPrivateBusinessDocumentForService(
  input: unknown,
): Promise<PrivateBusinessDocumentDownload> {
  await requirePermission(BUSINESS_DOCUMENT_PERMISSIONS.read);
  const supabase = createAdminClient();
  const reference = documentServiceReferenceFromInput(input);
  const document = await loadDocument(supabase, reference.documentId);
  await assertDocumentLinkedToService(supabase, reference.documentId, reference.serviceId);
  const { data, error } = await supabase.storage
    .from(document.bucket_id)
    .download(document.object_path);

  if (error || !data) {
    throw documentError("document_storage_read_failed", "The private document could not be downloaded.");
  }

  return { document, data };
}

export async function linkPrivateBusinessDocumentToService(
  input: unknown,
): Promise<BusinessDocumentLinkRow> {
  const user = await requirePermission(BUSINESS_DOCUMENT_PERMISSIONS.write);
  if (typeof input !== "object" || input === null) {
    throw documentError("invalid_document_input", "Document link metadata is invalid.");
  }

  const value = input as { documentId?: unknown; link?: unknown };
  const documentId = documentIdFromInput(value.documentId);
  const parsedLink = documentLinkSchema.safeParse(value.link);
  if (!parsedLink.success) {
    throw documentError("invalid_document_input", "Document link metadata is invalid.");
  }

  const supabase = createAdminClient();
  await loadDocument(supabase, documentId);
  await assertSupportedLinkTarget(supabase, parsedLink.data.serviceId);

  const { data, error } = await supabase
    .from("business_document_links")
    .insert({
      document_id: documentId,
      service_id: parsedLink.data.serviceId,
      link_purpose: parsedLink.data.linkPurpose,
      linked_by: user.clerk_user_id,
    })
    .select("document_id,service_id,link_purpose,linked_by,created_at")
    .single();

  if (error || !data) {
    throw documentError("document_link_write_failed", "The document link could not be saved.");
  }
  return data;
}
