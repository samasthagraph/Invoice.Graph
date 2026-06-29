'use client';

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PDFDocument from './PDFDocument';
import { Invoice, CompanySettings } from '@/types';
import { Download } from 'lucide-react';

interface PDFDownloadButtonProps {
  invoice: Invoice;
  settings: CompanySettings;
}

export default function PDFDownloadButton({ invoice, settings }: PDFDownloadButtonProps) {
  return (
    <PDFDownloadLink
      document={<PDFDocument invoice={invoice} settings={settings} />}
      fileName={`${invoice.document_number}.pdf`}
      className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer"
    >
      {/* @ts-ignore */}
      {({ loading }) => (
        <>
          <Download className="h-4 w-4 mr-1.5" />
          {loading ? 'Compiling PDF...' : 'Download PDF'}
        </>
      )}
    </PDFDownloadLink>
  );
}
