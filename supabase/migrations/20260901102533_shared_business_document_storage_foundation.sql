-- Shared private business-evidence document metadata foundation.
--
-- This migration owns application metadata only. The private Supabase Storage
-- bucket is provisioned separately through the approved dashboard procedure;
-- this file intentionally never writes storage.* tables.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.business_documents') IS NOT NULL
        OR to_regclass('public.business_document_links') IS NOT NULL
    THEN
        RAISE EXCEPTION 'Business document storage preflight: metadata table already exists';
    END IF;
END;
$$;

CREATE TABLE public.business_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text NOT NULL DEFAULT 'business-evidence',
    object_path text NOT NULL UNIQUE,
    original_filename text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    document_type text NOT NULL,
    purpose text NOT NULL,
    uploaded_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT business_documents_bucket_check CHECK (bucket_id = 'business-evidence'),
    CONSTRAINT business_documents_object_path_check CHECK (
        object_path ~ '^business-documents/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](pdf|jpg|png)$'
        AND (
            (mime_type = 'application/pdf' AND object_path ~ '[.]pdf$')
            OR (mime_type = 'image/jpeg' AND object_path ~ '[.]jpg$')
            OR (mime_type = 'image/png' AND object_path ~ '[.]png$')
        )
    ),
    CONSTRAINT business_documents_filename_check CHECK (
        char_length(btrim(original_filename)) BETWEEN 1 AND 255
        AND original_filename = btrim(original_filename)
        AND original_filename NOT IN ('.', '..')
        AND original_filename !~ '[[:cntrl:]]'
        AND position('/' IN original_filename) = 0
        AND position(E'\\' IN original_filename) = 0
    ),
    CONSTRAINT business_documents_mime_type_check CHECK (
        mime_type IN ('application/pdf', 'image/jpeg', 'image/png')
    ),
    CONSTRAINT business_documents_file_size_check CHECK (
        file_size BETWEEN 1 AND 26214400
    ),
    CONSTRAINT business_documents_type_check CHECK (
        document_type ~ '^[a-z0-9][a-z0-9_-]{0,99}$'
    ),
    CONSTRAINT business_documents_purpose_check CHECK (
        char_length(btrim(purpose)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT business_documents_uploaded_by_check CHECK (
        char_length(btrim(uploaded_by)) BETWEEN 1 AND 255
    )
);

CREATE TABLE public.business_document_links (
    document_id uuid NOT NULL REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    link_purpose text NOT NULL,
    linked_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    PRIMARY KEY (document_id, service_id, link_purpose),
    CONSTRAINT business_document_links_purpose_check CHECK (
        char_length(btrim(link_purpose)) BETWEEN 1 AND 200
    ),
    CONSTRAINT business_document_links_linked_by_check CHECK (
        char_length(btrim(linked_by)) BETWEEN 1 AND 255
    )
);

COMMENT ON TABLE public.business_documents IS
    'Private business-evidence metadata; object bytes live in the private business-evidence Storage bucket.';
COMMENT ON TABLE public.business_document_links IS
    'Narrow document-to-Service links; domain actions authorize the Service record before access.';

ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_document_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.business_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.business_document_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.business_documents TO service_role;
GRANT ALL ON TABLE public.business_document_links TO service_role;

COMMIT;
