-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create payment_reminders table
CREATE TABLE public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC,
  notes TEXT,
  collaborators JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  reminder_start_date DATE GENERATED ALWAYS AS (due_date - INTERVAL '10 days') STORED,
  org_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for payment reminders
CREATE POLICY "Users can view reminders they created or collaborate on" 
ON public.payment_reminders 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  auth.uid()::text = ANY(SELECT jsonb_array_elements_text(collaborators)) OR
  get_current_user_role() = 'admin'
);

CREATE POLICY "Users can create payment reminders" 
ON public.payment_reminders 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() AND 
  (org_id IS NULL OR org_id = get_current_user_org_id())
);

CREATE POLICY "Users can update reminders they created or collaborate on" 
ON public.payment_reminders 
FOR UPDATE 
USING (
  created_by = auth.uid() OR 
  auth.uid()::text = ANY(SELECT jsonb_array_elements_text(collaborators)) OR
  get_current_user_role() = 'admin'
);

CREATE POLICY "Users can delete reminders they created" 
ON public.payment_reminders 
FOR DELETE 
USING (created_by = auth.uid() OR get_current_user_role() = 'admin');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_reminders_updated_at
BEFORE UPDATE ON public.payment_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for payment reminders
ALTER TABLE public.payment_reminders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_reminders;