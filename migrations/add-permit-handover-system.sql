-- Add permit receiver tracking and handover system
-- This migration adds the ability to track permit receiver handovers with audit trail

-- Add current_permit_receiver_id to permits table to track the current receiver
ALTER TABLE permits 
ADD COLUMN current_permit_receiver_id UUID REFERENCES users(id),
ADD COLUMN last_receiver_id UUID REFERENCES users(id);

-- Create permit_handovers table to track all handovers
CREATE TABLE permit_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  from_receiver_id UUID NOT NULL REFERENCES users(id),
  to_receiver_id UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  handover_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient lookups
CREATE INDEX idx_permit_handovers_permit_id ON permit_handovers(permit_id);
CREATE INDEX idx_permit_handovers_from_receiver ON permit_handovers(from_receiver_id);
CREATE INDEX idx_permit_handovers_to_receiver ON permit_handovers(to_receiver_id);

-- Update audit_logs to include handover action type
COMMENT ON TABLE permit_handovers IS 'Tracks all permit receiver handovers with audit trail including who handed over, to whom, when, and acknowledgment';
