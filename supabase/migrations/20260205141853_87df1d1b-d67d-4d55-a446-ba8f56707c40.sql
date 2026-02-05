-- Add new plan types to subscription_plan enum
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'quarterly';
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'semiannual';