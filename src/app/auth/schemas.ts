import { z } from "zod";

export const signupInputSchema = z.object({
  email: z.string().trim().email("Veuillez saisir une adresse email valide."),
  password: z.string().min(8, "Le mot de passe doit comporter au moins 8 caractères."),
  companyName: z.string().trim().min(2, "Le nom de l'entreprise doit comporter au moins 2 caractères."),
});

export type SignupInput = z.infer<typeof signupInputSchema>;
