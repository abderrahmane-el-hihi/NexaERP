import { describe, it, expect } from "vitest";
import {
  parseCSVContent,
  detectDelimiter,
  stripBOM,
  normalizeHeader,
} from "@/modules/importer/services/csv-parser";

describe("CSV Parser & Tokenizer", () => {
  it("strips UTF-8 BOM correctly", () => {
    const withBOM = "\uFEFFNom,Type\nAtlas SARL,Client";
    expect(stripBOM(withBOM)).toBe("Nom,Type\nAtlas SARL,Client");
  });

  it("detects delimiters accurately based on header line", () => {
    expect(detectDelimiter("Nom,Type,ICE")).toBe(",");
    expect(detectDelimiter("Nom;Type;ICE")).toBe(";");
    expect(detectDelimiter("Nom\tType\tICE")).toBe("\t");
  });

  it("normalizes headers in French and English with accents removed", () => {
    expect(normalizeHeader("Raison Sociale")).toBe("name");
    expect(normalizeHeader("Société")).toBe("name");
    expect(normalizeHeader("Type Tiers")).toBe("type");
    expect(normalizeHeader("Prix Vente")).toBe("salesPrice");
    expect(normalizeHeader("Prix d'Achat")).toBe("purchasePrice");
    expect(normalizeHeader("Taux TVA")).toBe("tvaRate");
    expect(normalizeHeader("Stock Initial")).toBe("initialStock");
    expect(normalizeHeader("Code Compte")).toBe("accountCode");
    expect(normalizeHeader("Débit")).toBe("debit");
    expect(normalizeHeader("Crédit")).toBe("credit");
  });

  it("parses comma-separated CSV with simple rows", () => {
    const csv = `Nom,Type,ICE
Atlas SARL,Client,001122334455667
Maroc Chimie,Fournisseur,009988776655443`;
    const res = parseCSVContent(csv);
    expect(res.errors).toHaveLength(0);
    expect(res.delimiter).toBe(",");
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].data.name).toBe("Atlas SARL");
    expect(res.rows[0].data.type).toBe("Client");
    expect(res.rows[0].data.ICE).toBe("001122334455667");
  });

  it("parses semicolon-separated CSV", () => {
    const csv = `Nom;Type;ICE
Atlas SARL;Client;001122334455667
Maroc Chimie;Fournisseur;009988776655443`;
    const res = parseCSVContent(csv);
    expect(res.errors).toHaveLength(0);
    expect(res.delimiter).toBe(";");
    expect(res.rows).toHaveLength(2);
    expect(res.rows[1].data.name).toBe("Maroc Chimie");
    expect(res.rows[1].data.type).toBe("Fournisseur");
  });

  it("parses tab-separated CSV", () => {
    const csv = "Nom\tType\tICE\nAtlas SARL\tClient\t001122334455667";
    const res = parseCSVContent(csv);
    expect(res.errors).toHaveLength(0);
    expect(res.delimiter).toBe("\t");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].data.name).toBe("Atlas SARL");
  });

  it("correctly handles quoted fields containing commas, semicolons, and escaped quotes", () => {
    const csv = `Nom,Type,Adresse,ICE
"Société ""Al Baraka"", SARL",Client,"12, Boulevard d'Anfa, Étage 3",001122334455667
Safi Ciments,Fournisseur,Zone Industrielle,002233445566778`;
    const res = parseCSVContent(csv);
    expect(res.errors).toHaveLength(0);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].data.name).toBe('Société "Al Baraka", SARL');
    expect(res.rows[0].data.address).toBe("12, Boulevard d'Anfa, Étage 3");
  });

  it("correctly handles quoted multiline cells without breaking row numbering", () => {
    const csv = `Nom,Type,Adresse,ICE
"Atlas Multi-Services",Client,"Ligne 1
Ligne 2
Ligne 3",001122334455667
Second Client,Client,Casablanca,002233445566778`;
    const res = parseCSVContent(csv);
    expect(res.errors).toHaveLength(0);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].data.address).toBe("Ligne 1\nLigne 2\nLigne 3");
    // Second row starts on line 5 of the original file
    expect(res.rows[1].lineNumber).toBe(5);
  });

  it("detects syntax error on unclosed quote", () => {
    const csv = `Nom,Type,ICE
"Atlas SARL,Client,001122334455667`;
    const res = parseCSVContent(csv);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0].message).toContain("Guillemet ouvrant non refermé");
  });

  it("detects column count mismatch deterministically with exact line number", () => {
    const csv = `Nom,Type,ICE
Atlas SARL,Client,001122334455667
Incomplete Row,Client
Maroc Chimie,Fournisseur,009988776655443,ExtraCol`;
    const res = parseCSVContent(csv);
    expect(res.errors).toHaveLength(2);
    expect(res.errors[0].row).toBe(3);
    expect(res.errors[0].message).toContain("Nombre de colonnes incorrect");
    expect(res.errors[1].row).toBe(4);
    expect(res.rows).toHaveLength(1); // Row 2 was valid
  });

  it("returns error on empty CSV", () => {
    const res = parseCSVContent("   ");
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].message).toContain("Le fichier CSV est vide");
  });
});
