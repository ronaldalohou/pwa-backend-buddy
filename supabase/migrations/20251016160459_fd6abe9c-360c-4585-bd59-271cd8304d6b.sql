-- Ajouter la colonne TVA aux produits (18% au Bénin)
ALTER TABLE public.products
ADD COLUMN tax_rate numeric DEFAULT 18 CHECK (tax_rate >= 0 AND tax_rate <= 100);

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN public.products.tax_rate IS 'Taux de TVA en pourcentage (18% par défaut au Bénin)';

-- Mettre à jour les produits existants avec le taux par défaut
UPDATE public.products
SET tax_rate = 18
WHERE tax_rate IS NULL;