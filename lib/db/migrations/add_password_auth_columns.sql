-- Migration: Add password authentication columns to users table
-- Run this in Supabase SQL Editor
-- Safe to run — all new columns are nullable

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_hash" text,
  ADD COLUMN IF NOT EXISTS "password_set_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "password_attempts" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "password_locked_until" timestamp with time zone;
