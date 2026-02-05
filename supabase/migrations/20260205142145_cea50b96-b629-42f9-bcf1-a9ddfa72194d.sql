-- Add price columns for quarterly and semiannual plans
ALTER TABLE public.barber_subscriptions 
ADD COLUMN IF NOT EXISTS quarterly_price numeric DEFAULT 134.90,
ADD COLUMN IF NOT EXISTS semiannual_price numeric DEFAULT 254.90;