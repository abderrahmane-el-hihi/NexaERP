import type { ClearanceReject } from "./clearance.port";

// Pure helpers live outside the "use server" module: Next.js only allows async
// exports from a server-action file, and this table is also used by the UI.

/** Plain-language translations of platform reject codes, shown next to the field. */
const REJECT_MESSAGES: Record<string, string> = {
  ICE_MISSING: "L'ICE est absent. Renseignez-le dans la fiche société ou client.",
  ICE_INVALID: "L'ICE ne respecte pas le format attendu (15 chiffres).",
  IF_MISSING: "L'identifiant fiscal (IF) est absent de la fiche société.",
  NUMBER_MISMATCH: "Le numéro déclaré ne correspond pas au document transmis.",
  NUMBER_NOT_SEQUENTIAL: "La numérotation présente un saut. Vérifiez le compteur de factures.",
  FORMAT_INVALID: "Le document n'est pas au format UBL 2.1 attendu.",
  TAX_MISMATCH: "La TVA déclarée ne correspond pas aux lignes de la facture.",
  DUPLICATE: "Cette facture a déjà été transmise et validée.",
  SIGNATURE_INVALID: "La signature électronique est invalide ou le certificat a expiré.",
};

export function explainReject(reject: ClearanceReject): string {
  return REJECT_MESSAGES[reject.code] ?? reject.message ?? reject.code;
}
