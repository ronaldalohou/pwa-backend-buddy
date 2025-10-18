-- Create expenses table for tracking business expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  receipt_url TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses
CREATE POLICY "Authenticated users can view expenses"
ON public.expenses
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create expenses"
ON public.expenses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Managers can manage expenses"
ON public.expenses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.expenses IS 'Business expenses for financial reporting';
COMMENT ON COLUMN public.expenses.receipt_url IS 'URL to uploaded receipt/proof document';