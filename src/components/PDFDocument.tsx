import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { Client, Invoice, InvoiceItem, CompanySettings } from '@/types';

// Define Styles for PDF Layout
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  
  // Theme highlights
  invoiceIndicator: {
    height: 4,
    backgroundColor: '#4f46e5', // indigo-600
    marginBottom: 20,
  },
  quotationIndicator: {
    height: 4,
    backgroundColor: '#d97706', // amber-600
    marginBottom: 20,
  },

  // Header section
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 20,
    marginBottom: 20,
  },
  companyDetails: {
    flexDirection: 'column',
    maxWidth: '60%',
  },
  pdfLogo: {
    maxHeight: 35,
    maxWidth: 110,
    objectFit: 'contain',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  companyText: {
    color: '#64748b',
    lineHeight: 1.4,
  },
  companyTaxId: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 6,
  },
  documentMeta: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    maxWidth: '40%',
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 3,
  },
  metaValue: {
    fontWeight: 'bold',
    color: '#1e293b',
  },

  // Bill To section
  billingContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  billingColumn: {
    flexDirection: 'column',
    width: '50%',
  },
  billingTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  clientName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  clientCompany: {
    fontSize: 9,
    fontWeight: 'semibold',
    color: '#475569',
    marginBottom: 4,
  },
  clientText: {
    color: '#64748b',
    lineHeight: 1.3,
  },

  // Program Description block
  descriptionContainer: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#4f46e5',
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.4,
  },

  // Items Table
  tableContainer: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
  },
  
  // Table widths
  colDesc: { width: '45%' },
  colQty: { width: '10%', textAlign: 'right' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTax: { width: '10%', textAlign: 'right' },
  colDisc: { width: '10%', textAlign: 'right' },
  colTotal: { width: '10%', textAlign: 'right', fontWeight: 'bold' },

  // Summary section
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    marginBottom: 20,
  },
  summaryBlock: {
    width: '40%',
    flexDirection: 'column',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 9,
    color: '#64748b',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 9,
    color: '#dc2626',
  },
  grandTotalBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    marginTop: 5,
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Footer / Terms
  footerContainer: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 15,
  },
  termsBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  termsCol: {
    width: '48%',
  },
  bankTitle: {
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  thankYouText: {
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 15,
  }
});

// Helper for Indian Rupee/Default Currency layout representation
function formatPDFCurrency(amount: number) {
  return `Rs. ${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Format ISO date to readable string
function formatPDFDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface PDFDocumentProps {
  invoice: Invoice;
  settings: CompanySettings;
}

export default function PDFDocument({ invoice, settings }: PDFDocumentProps) {
  const isInvoice = invoice.document_type === 'invoice';
  const client = invoice.client;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top Accent Strip */}
        <View style={isInvoice ? styles.invoiceIndicator : styles.quotationIndicator} />

        {/* 1. Header */}
        <View style={styles.headerContainer}>
          {/* Sender company info */}
          <View style={styles.companyDetails}>
            {settings.logo_url ? (
              <Image 
                src={settings.logo_url} 
                style={styles.pdfLogo} 
              />
            ) : null}
            {settings.company_name ? (
              <Text style={styles.companyName}>{settings.company_name}</Text>
            ) : null}
            <Text style={styles.companyText}>{settings.company_address}</Text>
            {settings.company_phone && <Text style={[styles.companyText, { marginTop: 4 }]}>Phone: {settings.company_phone}</Text>}
            {settings.company_email && <Text style={styles.companyText}>Email: {settings.company_email}</Text>}
            {settings.tax_id && (
              <Text style={styles.companyTaxId}>Tax ID / GSTIN: {settings.tax_id}</Text>
            )}
          </View>

          {/* Doc Metadata details */}
          <View style={styles.documentMeta}>
            <Text style={[
              styles.documentTitle, 
              { color: isInvoice ? '#4f46e5' : '#d97706' }
            ]}>
              {isInvoice ? 'Tax Invoice' : 'Quotation'}
            </Text>
            <Text style={styles.metaText}>
              Document #: <Text style={styles.metaValue}>{invoice.document_number}</Text>
            </Text>
            <Text style={styles.metaText}>
              Issue Date: <Text style={styles.metaValue}>{formatPDFDate(invoice.issue_date)}</Text>
            </Text>
            <Text style={styles.metaText}>
              {isInvoice ? 'Due Date: ' : 'Valid Until: '}
              <Text style={styles.metaValue}>{formatPDFDate(invoice.due_date)}</Text>
            </Text>
          </View>
        </View>

        {/* 2. Bill To Billing details */}
        <View style={styles.billingContainer}>
          <View style={styles.billingColumn}>
            <Text style={styles.billingTitle}>{isInvoice ? 'Bill To' : 'Quotation For'}</Text>
            {client ? (
              <View>
                <Text style={styles.clientName}>{client.name}</Text>
                {client.company_name && <Text style={styles.clientCompany}>{client.company_name}</Text>}
                {client.phone && <Text style={styles.clientText}>Phone: {client.phone}</Text>}
                {client.email && <Text style={styles.clientText}>Email: {client.email}</Text>}
              </View>
            ) : (
              <Text style={styles.clientText}>Unspecified Client</Text>
            )}
          </View>
          <View style={styles.billingColumn}>
            {client?.address && (
              <View>
                <Text style={styles.billingTitle}>Billing Address</Text>
                <Text style={styles.clientText}>{client.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 2.5 Program / Project Description */}
        {invoice.project_description ? (
          <View style={[
            styles.descriptionContainer,
            { borderLeftColor: isInvoice ? '#4f46e5' : '#d97706' }
          ]} wrap={false}>
            <Text style={styles.descriptionTitle}>Program / Project Description</Text>
            <Text style={styles.descriptionText}>{invoice.project_description}</Text>
          </View>
        ) : null}

        {/* 3. Items Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colTax]}>Tax</Text>
            <Text style={[styles.tableHeaderCell, styles.colDisc]}>Disc</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {invoice.items && invoice.items.map((item, idx) => (
            <View style={styles.tableRow} key={item.id || idx} wrap={false}>
              <Text style={[styles.tableCell, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{formatPDFCurrency(item.unit_price)}</Text>
              <Text style={[styles.tableCell, styles.colTax]}>{item.tax_rate > 0 ? `${item.tax_rate}%` : '0%'}</Text>
              <Text style={[styles.tableCell, styles.colDisc]}>{item.discount_rate > 0 ? `${item.discount_rate}%` : '0%'}</Text>
              <Text style={[styles.tableCell, styles.colTotal]}>{formatPDFCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* 4. Calculations Summary */}
        <View style={styles.summaryContainer} wrap={false}>
          <View style={styles.summaryBlock}>
            <View style={styles.summaryRow}>
              <Text>Subtotal:</Text>
              <Text>{formatPDFCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.discount_total > 0 && (
              <View style={styles.discountRow}>
                <Text>Total Discount:</Text>
                <Text>-{formatPDFCurrency(invoice.discount_total)}</Text>
              </View>
            )}
            {invoice.tax_total > 0 && (
              <View style={styles.summaryRow}>
                <Text>Total Tax:</Text>
                <Text>{formatPDFCurrency(invoice.tax_total)}</Text>
              </View>
            )}
            <View style={[
              styles.grandTotalBlock,
              { 
                backgroundColor: isInvoice ? '#e0e7ff' : '#fef3c7',
                color: isInvoice ? '#312e81' : '#78350f'
              }
            ]}>
              <Text>Grand Total:</Text>
              <Text>{formatPDFCurrency(invoice.grand_total)}</Text>
            </View>
          </View>
        </View>

        {/* 5. Notes & Bank Accounts */}
        <View style={styles.footerContainer} wrap={false}>
          <View style={styles.termsBlock}>
            {/* Notes column */}
            <View style={styles.termsCol}>
              {invoice.notes ? (
                <View>
                  <Text style={styles.bankTitle}>Terms & Instructions</Text>
                  <Text style={{ color: '#64748b' }}>{invoice.notes}</Text>
                </View>
              ) : null}
            </View>

            {/* Bank details column */}
            <View style={[styles.termsCol, { alignItems: 'flex-end', textAlign: 'right' }]}>
              {settings.bank_name ? (
                <View>
                  <Text style={styles.bankTitle}>Payment Account Details</Text>
                  <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Bank: {settings.bank_name}</Text>
                  <Text style={{ color: '#64748b' }}>Account: {settings.bank_account_no}</Text>
                  {settings.bank_ifsc && <Text style={{ color: '#64748b' }}>IFSC Code: {settings.bank_ifsc}</Text>}
                </View>
              ) : null}
            </View>
          </View>

          <Text style={styles.thankYouText}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
}
