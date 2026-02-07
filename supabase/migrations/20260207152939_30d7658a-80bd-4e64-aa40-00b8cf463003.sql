
-- Add PIX payment fields to profiles (barber config)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;

-- Add payment_status to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
-- Values: 'pending' (pagar depois), 'prepaid' (pagou antecipado), 'awaiting' (escolheu pagar agora mas não confirmou ainda)
