-- Create subscription plan type enum
CREATE TYPE public.subscription_plan AS ENUM ('monthly', 'yearly');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('trial', 'paid', 'pending', 'overdue');

-- Create barber subscriptions table
CREATE TABLE public.barber_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type subscription_plan NOT NULL DEFAULT 'monthly',
  trial_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trial_end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  subscription_start_date DATE,
  next_payment_date DATE,
  payment_status payment_status NOT NULL DEFAULT 'trial',
  monthly_price NUMERIC(10,2) DEFAULT 49.90,
  yearly_price NUMERIC(10,2) DEFAULT 499.90,
  last_payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id)
);

-- Enable RLS
ALTER TABLE public.barber_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all subscriptions"
ON public.barber_subscriptions
FOR ALL
USING (public.is_admin());

-- Barbers can view their own subscription
CREATE POLICY "Barbers can view own subscription"
ON public.barber_subscriptions
FOR SELECT
USING (barber_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_barber_subscriptions_updated_at
BEFORE UPDATE ON public.barber_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create subscription when barber is approved
CREATE OR REPLACE FUNCTION public.create_barber_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When barber status changes to approved, create subscription
  IF NEW.role = 'barber' AND NEW.barber_status = 'approved' AND 
     (OLD.barber_status IS NULL OR OLD.barber_status != 'approved') THEN
    INSERT INTO public.barber_subscriptions (barber_id, trial_start_date, trial_end_date)
    VALUES (NEW.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days')
    ON CONFLICT (barber_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating subscription
CREATE TRIGGER create_subscription_on_approval
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_barber_subscription();