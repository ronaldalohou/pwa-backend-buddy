import { z } from "zod";

// Auth validation schemas
export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email est trop long"),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .max(100, "Le mot de passe est trop long"),
  confirmPassword: z
    .string()
    .min(1, "Veuillez confirmer votre mot de passe"),
  fullName: z
    .string()
    .trim()
    .min(1, "Le nom complet est requis")
    .max(100, "Le nom est trop long"),
  businessName: z
    .string()
    .trim()
    .min(1, "Le nom du commerce est requis")
    .max(100, "Le nom du commerce est trop long"),
  phone: z
    .string()
    .trim()
    .min(1, "Le téléphone est requis")
    .regex(/^(\+?(?:229|225)[\s]?)0[1-9][\s]?\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}$/, "Le format doit être : +229 ou +225 suivi de 01 XX XX XX XX"),
  whatsapp: z
    .string()
    .trim()
    .min(1, "Le numéro WhatsApp est requis")
    .regex(/^(\+?(?:229|225)[\s]?)0[1-9][\s]?\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}$/, "Le format WhatsApp doit être : +229 ou +225 suivi de 01 XX XX XX XX"),
  ifu: z
    .string()
    .trim()
    .max(20, "L'IFU est trop long")
    .optional()
    .or(z.literal("")),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email est trop long"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .max(100, "Le mot de passe est trop long"),
});

// Product validation schema
export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom du produit est requis")
    .max(200, "Le nom est trop long"),
  description: z
    .string()
    .trim()
    .max(1000, "La description est trop longue")
    .optional()
    .or(z.literal("")),
  category_id: z
    .string()
    .uuid("Catégorie invalide")
    .optional()
    .or(z.literal("")),
  price: z
    .string()
    .min(1, "Le prix est requis")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Le prix doit être un nombre positif",
    }),
  cost_price: z
    .string()
    .refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
      message: "Le prix de revient doit être un nombre positif",
    })
    .optional()
    .or(z.literal("")),
  stock_quantity: z
    .string()
    .min(1, "La quantité en stock est requise")
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
      message: "La quantité doit être un nombre positif",
    }),
  min_stock_level: z
    .string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
      message: "Le seuil doit être un nombre positif",
    }),
  barcode: z
    .string()
    .trim()
    .max(50, "Le code-barres est trop long")
    .optional()
    .or(z.literal("")),
  sku: z
    .string()
    .trim()
    .max(50, "Le SKU est trop long")
    .optional()
    .or(z.literal("")),
  tax_rate: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, {
      message: "La TVA doit être entre 0 et 100",
    }),
});

// Customer validation schema
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom du client est requis")
    .max(200, "Le nom est trop long"),
  phone: z
    .string()
    .trim()
    .max(20, "Le téléphone est trop long")
    .regex(/^[+]?[\d\s-()]*$/, "Format de téléphone invalide")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Format d'email invalide")
    .max(255, "L'email est trop long")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(500, "L'adresse est trop longue")
    .optional()
    .or(z.literal("")),
  credit_limit: z
    .number()
    .min(0, "La limite de crédit doit être positive")
    .max(999999999, "La limite de crédit est trop élevée"),
});

// Category validation schema
export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom de la catégorie est requis")
    .max(100, "Le nom est trop long"),
  description: z
    .string()
    .trim()
    .max(500, "La description est trop longue")
    .optional()
    .or(z.literal("")),
  icon: z
    .string()
    .trim()
    .max(10, "L'icône est invalide"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Format de couleur invalide"),
  type: z.enum(["product", "service"], {
    required_error: "Le type est requis",
  }),
});

// Supplier validation schema
export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom du fournisseur est requis")
    .max(200, "Le nom est trop long"),
  contact_person: z
    .string()
    .trim()
    .max(100, "Le nom du contact est trop long")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20, "Le téléphone est trop long")
    .regex(/^[+]?[\d\s-()]*$/, "Format de téléphone invalide")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Format d'email invalide")
    .max(255, "L'email est trop long")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(500, "L'adresse est trop longue")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(1000, "Les notes sont trop longues")
    .optional()
    .or(z.literal("")),
});

// Profile update validation schema
export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Le nom complet est requis")
    .max(100, "Le nom est trop long"),
  businessName: z
    .string()
    .trim()
    .min(1, "Le nom du commerce est requis")
    .max(100, "Le nom du commerce est trop long"),
  phone: z
    .string()
    .trim()
    .min(1, "Le téléphone est requis")
    .regex(/^(\+?(?:229|225)[\s]?)0[1-9][\s]?\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}$/, "Le format doit être : +229 ou +225 suivi de 01 XX XX XX XX"),
  ifu: z
    .string()
    .trim()
    .max(20, "L'IFU est trop long")
    .optional()
    .or(z.literal("")),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type SupplierFormData = z.infer<typeof supplierSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
