-- Add currency field to payment_reminders table
ALTER TABLE public.payment_reminders 
ADD COLUMN currency text DEFAULT 'USD' NOT NULL;