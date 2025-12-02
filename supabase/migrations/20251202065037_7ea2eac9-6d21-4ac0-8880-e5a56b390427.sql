-- Add Telegram integration fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_user_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_username TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS is_telegram_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_connected_at TIMESTAMP WITH TIME ZONE;

-- Add Telegram message tracking to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS telegram_message_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Create index for faster Telegram user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_user_id ON public.profiles(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON public.profiles(telegram_chat_id);

-- Create table for Telegram command history
CREATE TABLE IF NOT EXISTS public.telegram_commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  command TEXT NOT NULL,
  raw_message TEXT,
  processed BOOLEAN DEFAULT FALSE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on telegram_commands
ALTER TABLE public.telegram_commands ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own commands
CREATE POLICY "Users can view their own telegram commands"
ON public.telegram_commands
FOR SELECT
USING (user_id = auth.uid() OR telegram_user_id IN (
  SELECT telegram_user_id FROM public.profiles WHERE id = auth.uid()
));

-- Policy: System can insert commands
CREATE POLICY "System can insert telegram commands"
ON public.telegram_commands
FOR INSERT
WITH CHECK (true);