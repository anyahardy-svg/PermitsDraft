-- Raise training-records bucket upload limit to match application validation (50MB).
-- Run in Supabase SQL Editor if uploads fail with a storage "object too large" error.

UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'training-records';
