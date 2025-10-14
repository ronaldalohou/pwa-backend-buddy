-- Fix security warning: Set search_path for functions

-- Update handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update generate_sale_number function
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  sale_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.sales
  WHERE sale_number LIKE 'SALE-%';
  
  sale_num := 'SALE-' || LPAD(next_num::TEXT, 6, '0');
  RETURN sale_num;
END;
$$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'caissier')
  );
  RETURN NEW;
END;
$$;

-- Update update_customer_credit function
CREATE OR REPLACE FUNCTION public.update_customer_credit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;