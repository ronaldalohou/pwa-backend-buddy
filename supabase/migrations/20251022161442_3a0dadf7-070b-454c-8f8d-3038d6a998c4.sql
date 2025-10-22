-- Add type column to categories table to distinguish between products and services
ALTER TABLE public.categories 
ADD COLUMN type text NOT NULL DEFAULT 'product' CHECK (type IN ('product', 'service'));

-- Add comment to explain the column
COMMENT ON COLUMN public.categories.type IS 'Type of category: product (with stock management) or service (without stock management)';