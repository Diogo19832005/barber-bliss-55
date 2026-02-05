-- Add 'paused' to the payment_status enum
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'paused';