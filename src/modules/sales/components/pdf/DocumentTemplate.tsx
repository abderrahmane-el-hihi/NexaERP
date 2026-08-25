import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts if needed, for standard we can use default Helvetica
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  companyInfo: {
    width: '45%',
  },
  documentInfo: {
    width: '45%',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  clientSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  clientBox: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#64748b',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 60,
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
  },
  table: {
    width: '100%',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colDesc: { flex: 2 },
  colQty: { width: 50, textAlign: 'right' },
  colPrice: { width: 80, textAlign: 'right' },
  colTva: { width: 50, textAlign: 'right' },
  colTotal: { width: 80, textAlign: 'right' },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsBox: {
    width: 200,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  }
});

interface DocumentData {
  type: 'DEVIS' | 'FACTURE';
  number: string;
  date: Date;
  validUntil?: Date;
  company: {
    name: string;
    address?: string | null;
    city?: string | null;
    ICE?: string | null;
    IF?: string | null;
    RC?: string | null;
  };
  tenant: {
    name: string;
    legalName?: string | null;
    address?: string | null;
    ICE?: string | null;
    IF?: string | null;
    RC?: string | null;
    Patente?: string | null;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    discountPercent: number;
    lineTotal?: number;
  }>;
  subtotal: number;
  tvaAmount: number;
  total: number;
}

export const DocumentTemplate = ({ data }: { data: DocumentData }) => {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(amount) + ' MAD';
  };
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR').format(new Date(date));
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 5 }}>
              {data.tenant.legalName || data.tenant.name}
            </Text>
            {data.tenant.address && <Text style={{ marginBottom: 2 }}>{data.tenant.address}</Text>}
            <View style={{ marginTop: 5 }}>
              {data.tenant.ICE && <Text style={{ fontSize: 8 }}>ICE: {data.tenant.ICE}</Text>}
              {data.tenant.IF && <Text style={{ fontSize: 8 }}>IF: {data.tenant.IF}</Text>}
              {data.tenant.RC && <Text style={{ fontSize: 8 }}>RC: {data.tenant.RC}</Text>}
              {data.tenant.Patente && <Text style={{ fontSize: 8 }}>Patente: {data.tenant.Patente}</Text>}
            </View>
          </View>
          
          <View style={styles.documentInfo}>
            <Text style={styles.title}>{data.type === 'DEVIS' ? 'DEVIS' : 'FACTURE'}</Text>
            <Text style={{ fontSize: 12, marginBottom: 5 }}>N° {data.number}</Text>
            <Text>Date: {formatDate(data.date)}</Text>
            {data.validUntil && <Text>Valide jusqu'au: {formatDate(data.validUntil)}</Text>}
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.clientSection}>
          <View style={styles.clientBox}>
            <Text style={styles.sectionTitle}>Adressé à :</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>{data.company.name}</Text>
            {data.company.address && <Text>{data.company.address}</Text>}
            {data.company.city && <Text>{data.company.city}</Text>}
            
            <View style={{ marginTop: 8 }}>
              {data.company.ICE && <Text style={{ fontSize: 9 }}>ICE: {data.company.ICE}</Text>}
              {data.company.IF && <Text style={{ fontSize: 9 }}>IF: {data.company.IF}</Text>}
              {data.company.RC && <Text style={{ fontSize: 9 }}>RC: {data.company.RC}</Text>}
            </View>
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Désignation</Text>
            <Text style={styles.colQty}>Qté</Text>
            <Text style={styles.colPrice}>Prix U. HT</Text>
            <Text style={styles.colTva}>TVA</Text>
            <Text style={styles.colTotal}>Total HT</Text>
          </View>
          
          {data.lines.map((line, i) => {
            const rowTotal = line.lineTotal || (line.quantity * line.unitPrice * (1 - line.discountPercent / 100));
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colDesc}>{line.description}</Text>
                <Text style={styles.colQty}>{line.quantity}</Text>
                <Text style={styles.colPrice}>{formatMoney(line.unitPrice)}</Text>
                <Text style={styles.colTva}>{line.tvaRate}%</Text>
                <Text style={styles.colTotal}>{formatMoney(rowTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>Total HT</Text>
              <Text>{formatMoney(data.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Total TVA</Text>
              <Text>{formatMoney(data.tvaAmount)}</Text>
            </View>
            <View style={styles.totalRowBold}>
              <Text>Total TTC</Text>
              <Text>{formatMoney(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {data.tenant.legalName || data.tenant.name} - 
          {data.tenant.ICE ? ` ICE: ${data.tenant.ICE} -` : ''} 
          {data.tenant.RC ? ` RC: ${data.tenant.RC} -` : ''} 
          {data.tenant.IF ? ` IF: ${data.tenant.IF}` : ''}
        </Text>
      </Page>
    </Document>
  );
};
