-- Mise à jour de la fonction handle_new_user pour inclure business_name, phone et ifu
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, business_name, phone, ifu, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'ifu',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'caissier')
  );
  RETURN NEW;
END;
$$;