-- Migration: Add permitted_issuer column to permits table
-- Created: 2026-02-13
-- Purpose: Store the name of the permit issuer for tracking who issued each permit

ALTER TABLE permits 
ADD COLUMN permitted_issuer TEXT;
