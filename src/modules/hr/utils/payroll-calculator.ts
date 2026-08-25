export interface MoroccanPayrollCalculation {
  grossSalary: number;
  cnssDeduction: number;
  amoDeduction: number;
  fraisPro: number;
  netTaxable: number;
  igrDeduction: number;
  netSalary: number;
}

/**
 * Pure Moroccan Payroll Calculation Function
 * Computes CNSS, AMO, Frais Professionnels, and IGR according to Moroccan Code Général des Impôts.
 */
export function calculateMoroccanPayroll(grossSalary: number): MoroccanPayrollCalculation {
  const gross = Math.max(0, grossSalary);

  // 1. CNSS (4.48% with monthly ceiling of 6,000 MAD = max 268.80 MAD)
  const cnssCeiling = 6000;
  const cnssDeduction = Math.min(gross, cnssCeiling) * 0.0448;

  // 2. AMO (2.26% uncapped)
  const amoDeduction = gross * 0.0226;

  // 3. Frais Professionnels (35% with monthly ceiling of 2,916.67 MAD = 35,000 MAD/year)
  const fraisPro = Math.min(gross * 0.35, 2916.67);

  // 4. Salaire Net Imposable (SNI)
  const netTaxable = Math.max(0, gross - cnssDeduction - amoDeduction - fraisPro);

  // 5. Impôt sur le Revenu (IGR) - Progressive Monthly Scale (Barème IGR Maroc)
  let igrDeduction = 0;
  if (netTaxable <= 3333.33) {
    igrDeduction = 0;
  } else if (netTaxable <= 4166.67) {
    igrDeduction = netTaxable * 0.10 - 333.33;
  } else if (netTaxable <= 5000.00) {
    igrDeduction = netTaxable * 0.20 - 750.00;
  } else if (netTaxable <= 6666.67) {
    igrDeduction = netTaxable * 0.30 - 1250.00;
  } else if (netTaxable <= 15000.00) {
    igrDeduction = netTaxable * 0.34 - 1516.67;
  } else {
    igrDeduction = netTaxable * 0.38 - 2116.67;
  }

  igrDeduction = Math.max(0, igrDeduction);

  // 6. Net Take-Home Pay (Salaire Net à Payer)
  const netSalary = gross - cnssDeduction - amoDeduction - igrDeduction;

  return {
    grossSalary: Math.round(gross * 100) / 100,
    cnssDeduction: Math.round(cnssDeduction * 100) / 100,
    amoDeduction: Math.round(amoDeduction * 100) / 100,
    fraisPro: Math.round(fraisPro * 100) / 100,
    netTaxable: Math.round(netTaxable * 100) / 100,
    igrDeduction: Math.round(igrDeduction * 100) / 100,
    netSalary: Math.round(netSalary * 100) / 100,
  };
}
