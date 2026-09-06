"use server";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import {
  BusinessDocumentError,
  createPrivateBusinessDocumentUrlForService,
  linkPrivateBusinessDocumentToService,
  uploadPrivateBusinessDocument,
} from "./storage";

export type BusinessDocumentActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; code: string; error: string };

function normalizeServiceUploadInput(input: unknown): unknown {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    const serviceId = input.get("serviceId");
    const linkPurpose = input.get("linkPurpose");
    return {
      file: input.get("file"),
      documentType: input.get("documentType"),
      purpose: input.get("purpose"),
      link: { serviceId, linkPurpose },
    };
  }

  if (typeof input === "object" && input !== null) {
    const value = input as Record<string, unknown>;
    return {
      file: value.file,
      documentType: value.documentType,
      purpose: value.purpose,
      link: {
        serviceId: value.serviceId,
        linkPurpose: value.linkPurpose,
      },
    };
  }

  return input;
}

function normalizeServiceLinkInput(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const value = input as Record<string, unknown>;
  return {
    documentId: value.documentId,
    link: {
      serviceId: value.serviceId,
      linkPurpose: value.linkPurpose,
    },
  };
}

function actionFailure<T>(error: unknown, action: string): BusinessDocumentActionResult<T> {
  if (error instanceof UnauthorizedError) {
    return { success: false, code: "UNAUTHORIZED", error: "Unauthorized" };
  }
  if (error instanceof ForbiddenError) {
    return { success: false, code: "FORBIDDEN", error: "Forbidden" };
  }
  if (error instanceof BusinessDocumentError) {
    return { success: false, code: error.code, error: error.message };
  }
  console.error(`[${action}] Unexpected document operation failure`);
  return { success: false, code: "DOCUMENT_OPERATION_FAILED", error: "Document operation failed." };
}

export async function uploadServiceBusinessDocument(
  input: unknown,
): Promise<BusinessDocumentActionResult<Awaited<ReturnType<typeof uploadPrivateBusinessDocument>>>> {
  try {
    await requirePermission("services:write");
    return { success: true, data: await uploadPrivateBusinessDocument(normalizeServiceUploadInput(input)) };
  } catch (error) {
    return actionFailure(error, "uploadServiceBusinessDocument");
  }
}

export async function createServiceBusinessDocumentViewUrl(
  input: unknown,
): Promise<BusinessDocumentActionResult<Awaited<ReturnType<typeof createPrivateBusinessDocumentUrlForService>>>> {
  try {
    await requirePermission("services:read");
    return { success: true, data: await createPrivateBusinessDocumentUrlForService(input) };
  } catch (error) {
    return actionFailure(error, "createServiceBusinessDocumentViewUrl");
  }
}

export async function linkServiceBusinessDocument(
  input: unknown,
): Promise<BusinessDocumentActionResult<Awaited<ReturnType<typeof linkPrivateBusinessDocumentToService>>>> {
  try {
    await requirePermission("services:write");
    return { success: true, data: await linkPrivateBusinessDocumentToService(normalizeServiceLinkInput(input)) };
  } catch (error) {
    return actionFailure(error, "linkServiceBusinessDocument");
  }
}
