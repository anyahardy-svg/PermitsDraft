-- Optional attachments on contractor records (e.g. traffic management plans).
-- Files are stored in the existing private `training-records` bucket under
-- `{company}/{contractor}/other_attachments/…` paths; this column stores metadata only.

ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contractors.attachments IS
  'Array of { id, label, name, path, uploadedAt } for non-training document uploads';
