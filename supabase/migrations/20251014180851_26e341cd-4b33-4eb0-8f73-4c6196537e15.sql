-- Add multi-currency support
CREATE TYPE public.currency_code AS ENUM ('XOF', 'XAF', 'NGN', 'GHS', 'MAD');

-- Add payment method enum
CREATE TYPE public.payment_method_type AS ENUM ('cash', 'mtn_money', 'moov_money', 'orange_money', 'credit', 'card');

-- Add payment status enum
CREATE TYPE public.payment_status_type AS ENUM ('completed', 'pending', 'partial', 'credit');

-- Add store settings table
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL,
  currency currency_code DEFAULT 'XOF',
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  receipt_footer TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modify products table to add supplier reference
ALTER TABLE public.products ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Modify sales table for payment method
ALTER TABLE public.sales 
  ALTER COLUMN payment_method DROP DEFAULT,
  ALTER COLUMN payment_method TYPE payment_method_type USING 
    CASE payment_method
      WHEN 'cash' THEN 'cash'::payment_method_type
      ELSE 'cash'::payment_method_type
    END,
  ALTER COLUMN payment_method SET DEFAULT 'cash'::payment_method_type;

-- Modify sales table for payment status
ALTER TABLE public.sales 
  ALTER COLUMN payment_status DROP DEFAULT,
  ALTER COLUMN payment_status TYPE payment_status_type USING 
    CASE payment_status
      WHEN 'completed' THEN 'completed'::payment_status_type
      WHEN 'pending' THEN 'pending'::payment_status_type
      ELSE 'completed'::payment_status_type
    END,
  ALTER COLUMN payment_status SET DEFAULT 'completed'::payment_status_type;

-- Add credit tracking to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS current_credit DECIMAL(10, 2) DEFAULT 0;

-- Add amount paid and remaining for credit sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS amount_remaining DECIMAL(10, 2) DEFAULT 0;

-- Create payments table for credit tracking
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method payment_method_type NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_settings
CREATE POLICY "Authenticated users can view store settings"
  ON public.store_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can update store settings"
  ON public.store_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- RLS Policies for suppliers
CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage suppliers"
  ON public.suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- RLS Policies for payments
CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default store settings
INSERT INTO public.store_settings (store_name, currency, tax_rate)
VALUES ('Mon Commerce', 'XOF', 0);

-- Add indexes for performance
CREATE INDEX idx_products_supplier ON public.products(supplier_id);
CREATE INDEX idx_payments_sale ON public.payments(sale_id);
CREATE INDEX idx_customers_credit ON public.customers(current_credit);

-- Function to update customer credit
CREATE OR REPLACE FUNCTION public.update_customer_credit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'credit' OR NEW.payment_status = 'partial' THEN
    UPDATE public.customers
    SET current_credit = current_credit + NEW.amount_remaining,
        total_purchases = total_purchases + NEW.total
    WHERE id = NEW.customer_id;
  ELSIF NEW.payment_status = 'completed' AND NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET total_purchases = total_purchases + NEW.total
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer credit on sale
CREATE TRIGGER update_credit_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_credit();