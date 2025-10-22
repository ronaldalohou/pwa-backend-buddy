-- Insert default categories for existing users who don't have them yet
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT id FROM public.profiles
  LOOP
    -- Insert Produit category if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_record.id AND name = 'Produit' AND type = 'product') THEN
      INSERT INTO public.categories (user_id, name, description, type, icon, color)
      VALUES (user_record.id, 'Produit', 'Articles physiques avec gestion de stock', 'product', 'Package', 'blue');
    END IF;
    
    -- Insert Service category if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_record.id AND name = 'Service' AND type = 'service') THEN
      INSERT INTO public.categories (user_id, name, description, type, icon, color)
      VALUES (user_record.id, 'Service', 'Prestations de services', 'service', 'Briefcase', 'green');
    END IF;
    
    -- Insert Restauration category if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_record.id AND name = 'Restauration' AND type = 'service') THEN
      INSERT INTO public.categories (user_id, name, description, type, icon, color)
      VALUES (user_record.id, 'Restauration', 'Nourriture et boissons', 'service', 'Utensils', 'orange');
    END IF;
  END LOOP;
END $$;

-- Create a function to automatically create default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, description, type, icon, color)
  VALUES 
    (NEW.id, 'Produit', 'Articles physiques avec gestion de stock', 'product', 'Package', 'blue'),
    (NEW.id, 'Service', 'Prestations de services', 'service', 'Briefcase', 'green'),
    (NEW.id, 'Restauration', 'Nourriture et boissons', 'service', 'Utensils', 'orange');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create categories for new users
DROP TRIGGER IF EXISTS create_default_categories_trigger ON public.profiles;
CREATE TRIGGER create_default_categories_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_categories();