-- Permettre NULL sur la colonne category de la table expenses
-- car le champ est optionnel dans l'interface utilisateur
ALTER TABLE public.expenses 
ALTER COLUMN category DROP NOT NULL;