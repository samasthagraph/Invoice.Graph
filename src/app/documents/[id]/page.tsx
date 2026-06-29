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
  const [sharing, setSharing] = useState(false);

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

  const handleWhatsAppShare = async () => {
    if (!invoice || !settings) return;
    try {
      setSharing(true);
      const isInvoice = invoice.document_type === 'invoice';
      const docTypeLabel = isInvoice ? 'Invoice' : 'Quotation';
      const clientName = invoice.client?.company_name || invoice.client?.name || 'Client';
      
      const balanceDue = Number(invoice.grand_total) - Number(invoice.advance_payment || 0);
      const shareText = `Here is ${docTypeLabel} ${invoice.document_number} for ${clientName}.\n` +
        `Grand Total: Rs. ${Number(invoice.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
        (Number(invoice.advance_payment || 0) > 0 
          ? `Balance Due: Rs. ${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`
          : '') +
        `Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;

      // 1. Try to compile PDF and use Web Share API if supported
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const { pdf } = await import('@react-pdf/renderer');
          const PDFDocument = (await import('@/components/PDFDocument')).default;
          
          const doc = <PDFDocument invoice={invoice} settings={settings} />;
          const blob = await pdf(doc).toBlob();
          const file = new File([blob], `${invoice.document_number}.pdf`, { type: 'application/pdf' });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `${docTypeLabel} ${invoice.document_number}`,
              text: shareText
            });
            setSharing(false);
            return;
          }
        } catch (shareErr) {
          console.warn('Native share failed, falling back to WhatsApp Web link:', shareErr);
        }
      }

      // 2. Fallback: Prefilled WhatsApp Web/App Text Link
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    } catch (err) {
      console.error('Failed to share to WhatsApp:', err);
    } finally {
      setSharing(false);
    }
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

          {/* WhatsApp Share Button */}
          <button
            onClick={handleWhatsAppShare}
            disabled={sharing}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 cursor-pointer disabled:cursor-wait"
          >
            {sharing ? (
              <span className="h-4 w-4 mr-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <WhatsAppIcon className="h-4 w-4 mr-1.5 fill-white" />
            )}
            {sharing ? 'Compiling...' : 'Share to WhatsApp'}
          </button>

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

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.249 8.477 3.518 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.59 1.966 14.12 .949 11.49 .949c-5.437 0-9.862 4.371-9.866 9.8c-.001 1.77.463 3.5 1.34 5.044l-.949 3.468 3.553-.931zm10.915-4.88c-.285-.143-1.688-.832-1.948-.928-.26-.096-.45-.143-.64.143-.19.285-.733.928-.9 1.12-.167.193-.335.215-.62.072-.285-.143-1.204-.444-2.293-1.415-.848-.756-1.42-1.69-1.587-1.975-.167-.285-.018-.439.125-.58.128-.127.285-.335.428-.5.143-.167.19-.285.285-.473.095-.19.047-.355-.024-.5-.071-.143-.64-1.543-.877-2.112-.23-.553-.464-.477-.64-.486-.165-.008-.354-.01-.543-.01-.19 0-.5.07-.762.354-.26.285-.992.97-1.01 2.373-.017 1.4.996 2.76 1.135 2.95.14.19 2.015 3.077 4.88 4.316.682.295 1.215.47 1.63.602.685.218 1.31.187 1.803.114.549-.08 1.688-.69 1.927-1.357.24-.667.24-1.238.168-1.357-.071-.12-.26-.19-.545-.332z" />
  </svg>
);
