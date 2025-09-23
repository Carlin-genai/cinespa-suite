-- Create enums for reminder types and statuses
CREATE TYPE reminder_type AS ENUM ('daily', 'weekly', 'annually');
CREATE TYPE reminder_status AS ENUM ('open', 'pending_authorization', 'pending_payment', 'completed');

-- Add new columns to payment_reminders table
ALTER TABLE public.payment_reminders 
ADD COLUMN reminder_type reminder_type DEFAULT 'daily',
ADD COLUMN reminder_status reminder_status DEFAULT 'open',
ADD COLUMN payment_proof_url text,
ADD COLUMN authorization_required boolean DEFAULT false,
ADD COLUMN authorized_by uuid,
ADD COLUMN authorized_at timestamp with time zone;

-- Update existing reminders to have default values
UPDATE public.payment_reminders 
SET reminder_status = 'completed'::reminder_status 
WHERE status = 'completed';

UPDATE public.payment_reminders 
SET reminder_status = 'open'::reminder_status 
WHERE status = 'pending';