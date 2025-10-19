-- Add user_id column to tables that don't have it yet
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_store_settings_user_id ON public.store_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);

-- Update RLS policies for products
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Managers can manage products" ON public.products;

CREATE POLICY "Users can view their own products"
ON public.products FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
ON public.products FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
ON public.products FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
ON public.products FOR DELETE
USING (auth.uid() = user_id);

-- Update RLS policies for categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Managers can manage categories" ON public.categories;

CREATE POLICY "Users can view their own categories"
ON public.categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
ON public.categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.categories FOR DELETE
USING (auth.uid() = user_id);

-- Update RLS policies for customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;

CREATE POLICY "Users can view their own customers"
ON public.customers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
ON public.customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
ON public.customers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
ON public.customers FOR DELETE
USING (auth.uid() = user_id);

-- Update RLS policies for suppliers
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Managers can manage suppliers" ON public.suppliers;

CREATE POLICY "Users can view their own suppliers"
ON public.suppliers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers"
ON public.suppliers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers"
ON public.suppliers FOR DELETE
USING (auth.uid() = user_id);

-- Update RLS policies for expenses
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Managers can manage expenses" ON public.expenses;

CREATE POLICY "Users can view their own expenses"
ON public.expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
ON public.expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
ON public.expenses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
ON public.expenses FOR DELETE
USING (auth.uid() = user_id);

-- Update RLS policies for store_settings
DROP POLICY IF EXISTS "Authenticated users can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Managers can update store settings" ON public.store_settings;

CREATE POLICY "Users can view their own store settings"
ON public.store_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own store settings"
ON public.store_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store settings"
ON public.store_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Update RLS policies for sales (via cashier_id which should be user_id)
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Managers can update sales" ON public.sales;

CREATE POLICY "Users can view their own sales"
ON public.sales FOR SELECT
USING (auth.uid() = cashier_id);

CREATE POLICY "Users can insert their own sales"
ON public.sales FOR INSERT
WITH CHECK (auth.uid() = cashier_id);

CREATE POLICY "Users can update their own sales"
ON public.sales FOR UPDATE
USING (auth.uid() = cashier_id);

-- Update RLS policies for stock_movements
DROP POLICY IF EXISTS "Authenticated users can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Managers can manage stock movements" ON public.stock_movements;

CREATE POLICY "Users can view their own stock movements"
ON public.stock_movements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock movements"
ON public.stock_movements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock movements"
ON public.stock_movements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stock movements"
ON public.stock_movements FOR DELETE
USING (auth.uid() = user_id);

-- Update RLS policies for sale_items (join with sales table)
DROP POLICY IF EXISTS "Authenticated users can view sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can create sale items" ON public.sale_items;

CREATE POLICY "Users can view their own sale items"
ON public.sale_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
    AND sales.cashier_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own sale items"
ON public.sale_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
    AND sales.cashier_id = auth.uid()
  )
);

-- Update RLS policies for payments (join with sales table)
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;

CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = payments.sale_id
    AND sales.cashier_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own payments"
ON public.payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = payments.sale_id
    AND sales.cashier_id = auth.uid()
  )
);

-- Add policy for users to update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);