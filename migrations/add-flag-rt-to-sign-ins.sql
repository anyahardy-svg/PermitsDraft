-- Add flag and RT tracking fields to sign_ins table
-- These track whether a contractor took a flag/RT and which ones, and if they returned them

ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS flag_taken BOOLEAN DEFAULT false;
ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS flag_name TEXT;
ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS flag_returned BOOLEAN;
ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS rt_taken BOOLEAN DEFAULT false;
ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS rt_name TEXT;
ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS rt_returned BOOLEAN;

-- Add indexes for querying unreturned items
CREATE INDEX IF NOT EXISTS idx_sign_ins_flag_taken ON sign_ins(flag_taken);
CREATE INDEX IF NOT EXISTS idx_sign_ins_flag_returned ON sign_ins(flag_returned);
CREATE INDEX IF NOT EXISTS idx_sign_ins_rt_taken ON sign_ins(rt_taken);
CREATE INDEX IF NOT EXISTS idx_sign_ins_rt_returned ON sign_ins(rt_returned);
