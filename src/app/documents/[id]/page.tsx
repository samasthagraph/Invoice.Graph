'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Printer,
  ChevronDown,
  Sparkles,
  Pencil
} from 'lucide-react';
import { db } from '@/lib/db';
import { Invoice, CompanySettings, InvoiceStatus } from '@/types';
import InvoicePreview from '@/components/InvoicePreview';
import { formatCurrency } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamically import PDF components with SSR disabled to prevent Node environment errors
const PDFDownloadButton = dynamic(
  () => import('@/components/PDFDownloadButton'),
  { ssr: false }
);

export default function DocumentDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setIsClient(true);
    async function loadData() {
      try {
        setLoading(true);
        const doc = await db.getInvoiceById(id);
        if (!doc) {
          router.push('/documents');
          return;
        }
        const compSettings = await db.getSettings();
        setInvoice(doc);
        setSettings(compSettings);
      } catch (err) {
        console.error('Error fetching document', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id, router]);

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return;
    try {
      await db.updateInvoiceStatus(invoice.id, newStatus);
      setInvoice(prev => prev ? { ...prev, status: newStatus } : null);
      setShowStatusDropdown(false);
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update document status.');
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm(`Are you sure you want to delete ${invoice.document_number}?`)) return;

    try {
      setDeleting(true);
      await db.deleteInvoice(invoice.id);
      router.push('/documents');
    } catch (err) {
      console.error('Failed to delete document', err);
      alert('Failed to delete document.');
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !invoice || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium text-sm">Compiling Document Details...</p>
        </div>
      </div>
    );
  }

  const isInvoice = invoice.document_type === 'invoice';
  const availableStatuses: InvoiceStatus[] = isInvoice 
    ? ['draft', 'sent', 'paid', 'unpaid']
    : ['draft', 'sent', 'accepted', 'rejected', 'expired'];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 print:bg-white print:p-0">
      {/* Detail Toolbar Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        {/* Back Link */}
        <div className="flex items-center space-x-3.5">
          <Link
            href="/documents"
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                {invoice.document_number}
              </h1>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                invoice.status === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                invoice.status === 'unpaid' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                invoice.status === 'sent' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                invoice.status === 'draft' ? 'bg-slate-100 border-slate-200 text-slate-600' :
                'bg-amber-50 border-amber-100 text-amber-700'
              }`}>
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Type: <span className="capitalize">{invoice.document_type}</span> • Total: {formatCurrency(invoice.grand_total)}
            </p>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="inline-flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-all cursor-pointer"
            >
              Mark Status
              <ChevronDown className="ml-1.5 h-4 w-4 text-slate-400" />
            </button>

            {showStatusDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)}></div>
                <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                  {availableStatuses.map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full text-left px-4 py-2 text-xs font-bold capitalize transition-colors cursor-pointer ${
                        invoice.status === status
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Edit Button */}
          <Link
            href={`/documents/${invoice.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-pointer"
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit Document
          </Link>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Print Screen
          </button>

          {/* PDF Download Link */}
          {isClient ? (
            <PDFDownloadButton invoice={invoice} settings={settings} />
          ) : (
            <button
              disabled
              className="inline-flex items-center px-4 py-2 bg-indigo-600/50 text-white/80 text-sm font-bold rounded-xl cursor-wait"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Preparing PDF...
            </button>
          )}

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center p-2 border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-xl transition-all cursor-pointer"
            title="Delete Document"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Main Preview Container */}
      <div className="flex-1 p-6 lg:p-8 flex items-start justify-center print:p-0">
        <div className="w-full max-w-[800px] print:w-full print:max-w-none">
          <InvoicePreview
            formData={invoice as any}
            settings={settings}
            selectedClient={invoice.client}
          />
        </div>
      </div>
    </div>
  );
}
