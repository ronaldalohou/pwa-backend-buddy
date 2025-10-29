-- Ajouter le champ whatsapp à la table profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;

-- Mettre à jour les prix des plans d'abonnement
UPDATE public.subscription_plans 
SET price = 6000 
WHERE name = 'Standard';

UPDATE public.subscription_plans 
SET price = 62000 
WHERE name = 'Premium';