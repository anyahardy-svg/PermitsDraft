-- Migration: Add company column to users table
-- Created: 2026-02-13
-- Purpose: Store company information for each permit issuer/user

ALTER TABLE users 
ADD COLUMN company TEXT;
