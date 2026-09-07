export interface ParsedCSVRow {
  lineNumber: number;
  data: Record<string, string>;
}

export interface CSVParsingResult {
  delimiter: string;
  headers: string[];
  normalizedHeaders: string[];
  rows: ParsedCSVRow[];
  errors: Array<{ row: number; message: string }>;
}

/**
 * Strips UTF-8 Byte Order Mark (BOM) if present.
 */
export function stripBOM(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * Detects the most probable delimiter from the first unquoted line:
 * checks ';', '\t', ',' in that priority/count order.
 */
export function detectDelimiter(firstLine: string): string {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  let tabs = 0;

  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (char === ";") semicolons++;
      else if (char === "\t") tabs++;
      else if (char === ",") commas++;
    }
  }

  if (semicolons >= commas && semicolons >= tabs && semicolons > 0) return ";";
  if (tabs >= commas && tabs >= semicolons && tabs > 0) return "\t";
  return ",";
}

/**
 * Pure RFC-4180 state-machine tokenizer that handles:
 * - Comma, semicolon, or tab delimiters
 * - Quoted fields containing delimiters, commas, semicolons, tabs, and newlines
 * - Escaped double quotes ("") inside quoted fields
 * - Exact line numbers even when cells span multiple physical lines
 */
export function tokenizeCSV(
  input: string,
  delimiter: string
): { matrix: string[][]; rowLineNumbers: number[]; syntaxErrors: Array<{ row: number; message: string }> } {
  const content = stripBOM(input);
  const matrix: string[][] = [];
  const rowLineNumbers: number[] = [];
  const syntaxErrors: Array<{ row: number; message: string }> = [];

  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let rowStartLine = 1;
  let currentLine = 1;
  let fieldHadQuotes = false;

  let i = 0;
  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        if (char === "\n") {
          currentLine++;
        }
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        fieldHadQuotes = true;
        i++;
        continue;
      }

      if (char === delimiter) {
        currentRow.push(fieldHadQuotes ? currentField : currentField.trim());
        currentField = "";
        fieldHadQuotes = false;
        i++;
        continue;
      }

      if (char === "\r") {
        if (nextChar === "\n") {
          i++;
        }
        // End of line
        currentRow.push(fieldHadQuotes ? currentField : currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          matrix.push(currentRow);
          rowLineNumbers.push(rowStartLine);
        }
        currentRow = [];
        currentField = "";
        fieldHadQuotes = false;
        currentLine++;
        rowStartLine = currentLine;
        i++;
        continue;
      }

      if (char === "\n") {
        // End of line
        currentRow.push(fieldHadQuotes ? currentField : currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          matrix.push(currentRow);
          rowLineNumbers.push(rowStartLine);
        }
        currentRow = [];
        currentField = "";
        fieldHadQuotes = false;
        currentLine++;
        rowStartLine = currentLine;
        i++;
        continue;
      }

      currentField += char;
      i++;
    }
  }

  // EOF
  if (inQuotes) {
    syntaxErrors.push({
      row: rowStartLine,
      message: `Guillemet ouvrant non refermé à la fin du fichier (débuté ligne ${rowStartLine}).`,
    });
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(fieldHadQuotes ? currentField : currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      matrix.push(currentRow);
      rowLineNumbers.push(rowStartLine);
    }
  }

  return { matrix, rowLineNumbers, syntaxErrors };
}

/**
 * Standardizes common header names in French and English.
 */
export function normalizeHeader(header: string): string {
  const clean = header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, ""); // strip non-alphanumeric

  // Companies mapping
  if (["nom", "raisonsociale", "societe", "name", "company", "client", "fournisseur"].includes(clean)) return "name";
  if (["type", "typetiers", "nature", "partnercategory"].includes(clean)) return "type";
  if (["ice", "identifiantcommundelentreprise"].includes(clean)) return "ICE";
  if (["if", "identifiantfiscal", "taxid"].includes(clean)) return "IF";
  if (["rc", "registrecommerce", "tradeid"].includes(clean)) return "RC";
  if (["ville", "city"].includes(clean)) return "city";
  if (["adresse", "address", "rue"].includes(clean)) return "address";
  if (["telephone", "phone", "tel", "gsm"].includes(clean)) return "phone";
  if (["email", "mail", "courriel"].includes(clean)) return "email";
  if (["contactprenom", "prenomcontact", "contactfirstname", "firstname"].includes(clean)) return "contactFirstName";
  if (["contactnom", "nomcontact", "contactlastname", "lastname"].includes(clean)) return "contactLastName";

  // Products mapping
  if (["reference", "ref", "code", "sku", "codeproduit"].includes(clean)) return "reference";
  if (["designation", "article", "libelleproduit"].includes(clean)) return "name";
  if (["prixvente", "unitprice", "prix", "salesprice", "pu", "prixdevente"].includes(clean)) return "salesPrice";
  if (["prixachat", "costprice", "cout", "purchaseprice", "pa", "prixdachat", "coutdachat"].includes(clean)) return "purchasePrice";
  if (["tva", "tvarate", "tauxtva", "vat"].includes(clean)) return "tvaRate";
  if (["unite", "unit", "mesure"].includes(clean)) return "unit";
  if (["categorie", "category", "famille"].includes(clean)) return "category";
  if (["stockinitial", "initialstock", "stock", "quantiteinitiale"].includes(clean)) return "initialStock";
  if (["entrepot", "warehouse", "depot"].includes(clean)) return "warehouse";

  // Opening balance mapping
  if (["codecompte", "compte", "accountcode", "account", "numcompte", "numero"].includes(clean)) return "accountCode";
  if (["debit", "soldeebit", "soldedebit"].includes(clean)) return "debit";
  if (["credit", "soldecredit"].includes(clean)) return "credit";
  if (["libelle", "description", "label", "intitule", "ecriture"].includes(clean)) return "description";

  return header.trim();
}

/**
 * Parses and validates CSV content into structured rows.
 */
export function parseCSVContent(csvText: string, forcedDelimiter?: string): CSVParsingResult {
  const content = stripBOM(csvText.trim());
  if (!content) {
    return {
      delimiter: ",",
      headers: [],
      normalizedHeaders: [],
      rows: [],
      errors: [{ row: 1, message: "Le fichier CSV est vide." }],
    };
  }

  const firstLine = content.split(/\r?\n/)[0] || "";
  const delimiter = forcedDelimiter || detectDelimiter(firstLine);

  const { matrix, rowLineNumbers, syntaxErrors } = tokenizeCSV(content, delimiter);

  if (syntaxErrors.length > 0) {
    return {
      delimiter,
      headers: [],
      normalizedHeaders: [],
      rows: [],
      errors: syntaxErrors,
    };
  }

  if (matrix.length === 0) {
    return {
      delimiter,
      headers: [],
      normalizedHeaders: [],
      rows: [],
      errors: [{ row: 1, message: "Aucune ligne détectée dans le fichier." }],
    };
  }

  const rawHeaders = matrix[0];
  if (rawHeaders.length === 0 || rawHeaders.every((h) => !h.trim())) {
    return {
      delimiter,
      headers: [],
      normalizedHeaders: [],
      rows: [],
      errors: [{ row: 1, message: "La première ligne d'en-tête est vide ou invalide." }],
    };
  }

  const headers = rawHeaders.map((h) => h.trim());
  const normalizedHeaders = headers.map(normalizeHeader);
  const rows: ParsedCSVRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let r = 1; r < matrix.length; r++) {
    const values = matrix[r];
    const lineNumber = rowLineNumbers[r] ?? r + 1;

    // Skip trailing blank row
    if (values.length === 1 && values[0].trim() === "") {
      continue;
    }

    if (values.length !== headers.length) {
      errors.push({
        row: lineNumber,
        message: `Nombre de colonnes incorrect (${values.length} trouvées, ${headers.length} attendues pour l'en-tête).`,
      });
      continue;
    }

    const rowData: Record<string, string> = {};
    normalizedHeaders.forEach((normKey, idx) => {
      rowData[normKey] = values[idx] !== undefined ? values[idx].trim() : "";
    });

    rows.push({
      lineNumber,
      data: rowData,
    });
  }

  return {
    delimiter,
    headers,
    normalizedHeaders,
    rows,
    errors,
  };
}
