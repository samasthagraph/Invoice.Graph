'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Plus, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  Edit3, 
  DollarSign, 
  Calendar, 
  Package, 
  Sparkles, 
  ExternalLink,
  Printer,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  Check,
  Copy
} from 'lucide-react';
import { db } from '@/lib/db';
import { Client, Invoice, RentalRecord } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotations' | 'rentals' | 'profile'>('invoices');

  // Edit client modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: ''
  });
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    async function loadClientData() {
      try {
        setLoading(true);
        const [clientData, allInvoices, allRentals] = await Promise.all([
          db.getClientById(id),
          db.getInvoices(),
          db.getRentalRecords()
        ]);

        if (!clientData) {
          router.push('/clients');
          return;
        }

        setClient(clientData);
        setClientForm({
          name: clientData.name,
          slug: clientData.slug || '',
          email: clientData.email || '',
          phone: clientData.phone || '',
          address: clientData.address || ''
        });

        // Filter for this client using true client ID
        const clientInvoices = allInvoices.filter(inv => inv.client_id === clientData.id);
        const clientRentals = allRentals.filter(r => r.client_id === clientData.id);

        setInvoices(clientInvoices);
        setRentals(clientRentals);
      } catch (err) {
        console.error('Error fetching client details:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadClientData();
  }, [id, router]);

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim() || !client) return;

    try {
      setSavingClient(true);
      const updated = await db.updateClient(client.id, clientForm);
      setClient(updated);
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update client', err);
      alert('Failed to update client profile.');
    } finally {
      setSavingClient(false);
    }
  };

  // Compute Account Balances & Metrics
  const invoiceDocs = invoices.filter(doc => doc.document_type === 'invoice');
  const quotationDocs = invoices.filter(doc => doc.document_type === 'quotation');

  // 1. Total Invoiced (Grand Total of all invoices)
  const totalInvoiced = invoiceDocs.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);

  // 2. Total Paid / Cleared:
  // If status is 'paid', paid amount is grand_total. Otherwise, it's the advance_payment amount.
  const totalPaid = invoiceDocs.reduce((sum, inv) => {
    if (inv.status === 'paid') {
      return sum + Number(inv.grand_total || 0);
    }
    return sum + Number(inv.advance_payment || 0);
  }, 0);

  // 3. Debit / Outstanding Balance Due:
  // For unpaid/sent/draft invoices: grand_total - advance_payment
  const totalDebit = invoiceDocs.reduce((sum, inv) => {
    if (inv.status === 'paid') return sum;
    const balance = Number(inv.grand_total || 0) - Number(inv.advance_payment || 0);
    return sum + Math.max(0, balance);
  }, 0);

  // 4. Total Quotations estimated value
  const totalQuotationsValue = quotationDocs.reduce((sum, q) => sum + Number(q.grand_total || 0), 0);

  // 5. Active Rentals
  const activeRentalsCount = rentals.filter(r => r.status === 'rented').length;

  // Copy to clipboard state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const getStatementMessage = () => {
    if (!client) return '';
    const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    let msg = `📄 *ACCOUNT STATEMENT / LEDGER*\n`;
    msg += `Client: *${client.name}*\n`;
    msg += `Date: ${dateStr}\n`;
    msg += `─────────────────────────\n`;
    msg += `• Total Invoiced (Billed): *${formatCurrency(totalInvoiced)}*\n`;
    msg += `• Total Payments Received: *${formatCurrency(totalPaid)}*\n`;
    msg += `• *Outstanding Debit (Due): ${formatCurrency(totalDebit)}*\n`;
    msg += `─────────────────────────\n`;
    
    const unpaidInvs = invoiceDocs.filter(i => i.status !== 'paid');
    if (unpaidInvs.length > 0) {
      msg += `\n*Unpaid / Pending Invoices:*\n`;
      unpaidInvs.forEach((inv, idx) => {
        const balance = Number(inv.grand_total || 0) - Number(inv.advance_payment || 0);
        msg += `${idx + 1}. ${inv.document_number} (${inv.issue_date}) - Due: ${formatCurrency(balance)}\n`;
      });
    }
    msg += `\nPlease let us know if you have any questions or need copies of any invoice. Thank you!`;
    return msg;
  };

  const getReminderMessage = () => {
    if (!client) return '';
    let msg = `🔔 *PAYMENT REMINDER*\n\n`;
    msg += `Dear *${client.name}*,\n`;
    msg += `This is a friendly reminder regarding your pending balance of *${formatCurrency(totalDebit)}* with us.\n\n`;
    
    const unpaidInvs = invoiceDocs.filter(i => i.status !== 'paid');
    if (unpaidInvs.length > 0) {
      msg += `*Pending Invoices:*\n`;
      unpaidInvs.forEach((inv, idx) => {
        const balance = Number(inv.grand_total || 0) - Number(inv.advance_payment || 0);
        msg += `• ${inv.document_number} (Due: ${inv.due_date}) → *${formatCurrency(balance)}*\n`;
      });
      msg += `\n`;
    }
    msg += `Kindly arrange for the payment at your earliest convenience. Thank you!`;
    return msg;
  };

  const handlePrintStatement = () => {
    window.print();
  };

  const handleWhatsAppSend = (text: string) => {
    if (!client) return;
    const phone = client.phone?.replace(/[^0-9]/g, '');
    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  if (loading || !client) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium text-sm">Loading Client Profile & Account...</p>
        </div>
      </div>
    );
  }

  const clientInitials = client.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const statementMsg = getStatementMessage();
  const reminderMsg = getReminderMessage();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 print:bg-white print:p-0">
      
      {/* Header Sticky Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-3.5">
          <Link
            href="/clients"
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                {client.name}
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Client Account Profile • Ledger & Document History
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* WhatsApp Statement & Copy Buttons */}
          <div className="inline-flex items-center rounded-xl shadow-sm border border-emerald-600 overflow-hidden">
            <button
              onClick={() => handleWhatsAppSend(statementMsg)}
              className="inline-flex items-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer"
              title="Send Account Statement via WhatsApp"
            >
              <WhatsAppIcon className="h-3.5 w-3.5 mr-1.5 fill-white" />
              WhatsApp Statement
            </button>
            <button
              onClick={() => handleCopyText(statementMsg, 'statement')}
              className={`inline-flex items-center px-2.5 py-2 text-xs font-bold transition-all cursor-pointer border-l border-emerald-700 ${
                copiedKey === 'statement' 
                  ? 'bg-emerald-800 text-emerald-200' 
                  : 'bg-emerald-650 bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
              title="Copy Statement text to clipboard"
            >
              {copiedKey === 'statement' ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-300" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </>
              )}
            </button>
          </div>

          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            Edit Profile
          </button>

          <button
            onClick={handlePrintStatement}
            className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            Print Ledger
          </button>

          <Link
            href={`/documents/create?client_id=${client.id}`}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Invoice
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-8">
        
        {/* Top Profile Summary Card */}
        <div className={`border rounded-2xl p-6 sm:p-8 shadow-sm transition-all ${
          totalDebit > 0 
            ? 'bg-gradient-to-br from-rose-50/50 via-white to-rose-50/20 border-rose-300 shadow-rose-500/5 ring-1 ring-rose-200/80' 
            : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            
            {/* Left: Avatar & Identity */}
            <div className="flex items-start sm:items-center space-x-4 sm:space-x-5">
              <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                totalDebit > 0 
                  ? 'bg-gradient-to-tr from-rose-600 to-rose-500 shadow-rose-600/20 ring-2 ring-rose-300' 
                  : 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-indigo-600/20'
              }`}>
                {clientInitials || <Building className="h-8 w-8" />}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={`text-xl sm:text-2xl font-black tracking-tight truncate ${
                    totalDebit > 0 ? 'text-rose-950' : 'text-slate-900'
                  }`}>
                    {client.name}
                  </h2>
                  {totalDebit > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse flex items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                      Debit Due: {formatCurrency(totalDebit)}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Account Settled (Clear)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium flex items-center flex-wrap gap-2 mt-1">
                  <span>Client ID: <span className="font-mono text-slate-500">{client.id.substring(0, 8)}...</span></span>
                  {client.slug && (
                    <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      /clients/{client.slug}
                    </span>
                  )}
                  {client.created_at && (
                    <> • Registered {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                  )}
                </p>
              </div>
            </div>

            {/* Right: Direct Contact Shortcuts */}
            <div className="flex flex-wrap items-center gap-3">
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="inline-flex items-center px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                  {client.phone}
                </a>
              )}
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="inline-flex items-center px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                  {client.email}
                </a>
              )}
              {client.address && (
                <div className="hidden xl:flex items-center px-3.5 py-2 bg-slate-50 text-slate-600 text-xs font-medium rounded-xl border border-slate-200 max-w-xs truncate">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 text-indigo-500 flex-shrink-0" />
                  <span className="truncate">{client.address}</span>
                </div>
              )}
            </div>

          </div>

          {/* KPI Account Summary Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6">
            
            {/* 1. Debit / Outstanding Balance */}
            <div className={`p-5 rounded-2xl border transition-all ${
              totalDebit > 0 
                ? 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200 shadow-sm shadow-rose-500/5' 
                : 'bg-emerald-50/50 border-emerald-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Total Debit (Due)
                </span>
                <span className={`p-1.5 rounded-lg ${totalDebit > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  <CreditCard className="h-4 w-4" />
                </span>
              </div>
              <div className={`text-2xl lg:text-3xl font-black mt-2 tracking-tight ${
                totalDebit > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {formatCurrency(totalDebit)}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">
                {totalDebit > 0 
                  ? `Pending balance across ${invoiceDocs.filter(i => i.status !== 'paid').length} unpaid invoices` 
                  : 'All invoices settled & clear'}
              </p>
            </div>

            {/* 2. Total Invoiced (Billed) */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Total Billed
                </span>
                <span className="p-1.5 rounded-lg bg-indigo-500 text-white">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {formatCurrency(totalInvoiced)}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">
                Lifetime billing across {invoiceDocs.length} invoices
              </p>
            </div>

            {/* 3. Total Received (Paid) */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Total Payments
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {formatCurrency(totalPaid)}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">
                Cleared payments & advance deposits
              </p>
            </div>

            {/* 4. Quotations & Rentals */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Quotations & Rentals
                </span>
                <span className="p-1.5 rounded-lg bg-amber-500 text-white">
                  <Package className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {quotationDocs.length} <span className="text-sm font-bold text-slate-500">Quotes</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">
                {activeRentalsCount} active equipment rental(s)
              </p>
            </div>

          </div>
        </div>

        {/* Debit Warning Alert Banner */}
        {totalDebit > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-rose-500/20 animate-in fade-in duration-200">
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-white animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-100">
                  Outstanding Debit Balance Due
                </h4>
                <p className="text-sm font-extrabold text-white mt-0.5">
                  This client currently owes <span className="underline underline-offset-2 decoration-rose-200">{formatCurrency(totalDebit)}</span> across {invoiceDocs.filter(i => i.status !== 'paid').length} pending invoice(s).
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto flex-shrink-0">
              <button
                onClick={() => handleWhatsAppSend(reminderMsg)}
                className="inline-flex items-center justify-center px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
                title="Send Reminder via WhatsApp"
              >
                <WhatsAppIcon className="h-4 w-4 mr-1.5 fill-rose-700" />
                Send via WhatsApp
              </button>
              <button
                onClick={() => handleCopyText(reminderMsg, 'reminder')}
                className={`inline-flex items-center justify-center px-3.5 py-2 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap border ${
                  copiedKey === 'reminder'
                    ? 'bg-rose-900 text-rose-100 border-rose-800'
                    : 'bg-rose-700/80 hover:bg-rose-800 text-white border-rose-400/40'
                }`}
                title="Copy Payment Reminder message"
              >
                {copiedKey === 'reminder' ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-300" />
                    Copied Reminder!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Reminder Text
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Quick Shortcut Buttons Row */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Link
            href={`/documents/create?client_id=${client.id}`}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create New Invoice
          </Link>
          <Link
            href={`/documents/create?client_id=${client.id}&type=quotation`}
            className="inline-flex items-center px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Quotation / Estimate
          </Link>
          <Link
            href={`/assets?client_id=${client.id}`}
            className="inline-flex items-center px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Package className="h-4 w-4 mr-1.5" />
            Check Out Equipment Rental
          </Link>
        </div>

        {/* Tab Navigation & Detailed Content */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200 px-6 bg-slate-50/70 overflow-x-auto print:hidden">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-4 font-bold text-xs border-b-2 flex items-center transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'invoices'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Invoices & Debit Ledger ({invoiceDocs.length})
            </button>

            <button
              onClick={() => setActiveTab('quotations')}
              className={`py-4 px-4 font-bold text-xs border-b-2 flex items-center transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'quotations'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="h-4 w-4 mr-2 text-amber-500" />
              Quotations & Proposals ({quotationDocs.length})
            </button>

            <button
              onClick={() => setActiveTab('rentals')}
              className={`py-4 px-4 font-bold text-xs border-b-2 flex items-center transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'rentals'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="h-4 w-4 mr-2 text-indigo-500" />
              Equipment Rentals ({rentals.length})
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-4 font-bold text-xs border-b-2 flex items-center transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building className="h-4 w-4 mr-2 text-slate-400" />
              Full Profile & Address Details
            </button>
          </div>

          {/* TAB 1: Invoices & Debit Ledger */}
          {activeTab === 'invoices' && (
            <div className="p-6">
              {invoiceDocs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <h4 className="text-sm font-bold text-slate-700">No invoices yet</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    No billing documents have been issued to this client so far.
                  </p>
                  <Link
                    href={`/documents/create?client_id=${client.id}`}
                    className="inline-flex items-center mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Draft First Invoice
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Issue Date</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Grand Total</th>
                        <th className="py-3 px-4 text-right">Paid / Advance</th>
                        <th className="py-3 px-4 text-right">Debit (Balance)</th>
                        <th className="py-3 px-4 text-right print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {invoiceDocs.map(inv => {
                        const paidAmount = inv.status === 'paid' ? Number(inv.grand_total) : Number(inv.advance_payment || 0);
                        const balanceDue = inv.status === 'paid' ? 0 : Math.max(0, Number(inv.grand_total) - Number(inv.advance_payment || 0));

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-indigo-600">
                              <Link href={`/documents/${inv.id}`} className="hover:underline flex items-center">
                                {inv.document_number}
                                <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                              </Link>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {inv.issue_date}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {inv.due_date}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                inv.status === 'unpaid' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                inv.status === 'sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                              {formatCurrency(inv.grand_total)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-emerald-600 font-bold">
                              {formatCurrency(paidAmount)}
                            </td>
                            <td className={`py-3.5 px-4 text-right font-extrabold ${
                              balanceDue > 0 ? 'text-rose-600' : 'text-slate-400'
                            }`}>
                              {formatCurrency(balanceDue)}
                            </td>
                            <td className="py-3.5 px-4 text-right print:hidden">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => {
                                    const msg = `📄 *Invoice Details: ${inv.document_number}*\n` +
                                      `Client: *${client.name}*\n` +
                                      `Issue Date: ${inv.issue_date} | Due Date: ${inv.due_date}\n` +
                                      `Grand Total: *${formatCurrency(inv.grand_total)}*\n` +
                                      `Balance Due: *${formatCurrency(balanceDue)}*\n` +
                                      `Status: ${inv.status.toUpperCase()}`;
                                    handleCopyText(msg, inv.id);
                                  }}
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    copiedKey === inv.id 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
                                  }`}
                                  title="Copy invoice details to clipboard"
                                >
                                  {copiedKey === inv.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                </button>
                                <Link
                                  href={`/documents/${inv.id}`}
                                  className="inline-flex items-center px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors"
                                >
                                  View
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 font-black text-slate-900 bg-slate-50/50">
                        <td colSpan={4} className="py-3.5 px-4 uppercase text-xs tracking-wider">
                          Account Totals
                        </td>
                        <td className="py-3.5 px-4 text-right text-sm">
                          {formatCurrency(totalInvoiced)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-sm text-emerald-600">
                          {formatCurrency(totalPaid)}
                        </td>
                        <td className={`py-3.5 px-4 text-right text-sm ${totalDebit > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatCurrency(totalDebit)}
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Quotations & Proposals */}
          {activeTab === 'quotations' && (
            <div className="p-6">
              {quotationDocs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <h4 className="text-sm font-bold text-slate-700">No quotations found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    No quotations or cost proposals have been created for this client.
                  </p>
                  <Link
                    href={`/documents/create?client_id=${client.id}&type=quotation`}
                    className="inline-flex items-center mt-4 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-amber-600"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create Quotation
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider">
                        <th className="py-3 px-4">Quotation #</th>
                        <th className="py-3 px-4">Issue Date</th>
                        <th className="py-3 px-4">Valid Until</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Estimated Amount</th>
                        <th className="py-3 px-4 text-right print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {quotationDocs.map(q => (
                        <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-amber-600">
                            <Link href={`/documents/${q.id}`} className="hover:underline flex items-center">
                              {q.document_number}
                              <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{q.issue_date}</td>
                          <td className="py-3.5 px-4 text-slate-500">{q.due_date}</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-amber-50 text-amber-700 border-amber-200">
                              {q.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(q.grand_total)}
                          </td>
                          <td className="py-3.5 px-4 text-right print:hidden">
                            <Link
                              href={`/documents/${q.id}`}
                              className="inline-flex items-center px-2.5 py-1 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 rounded-lg text-xs font-bold transition-colors"
                            >
                              View Quote
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Equipment Rentals */}
          {activeTab === 'rentals' && (
            <div className="p-6">
              {rentals.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <h4 className="text-sm font-bold text-slate-700">No rental records</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    This client has not checked out or rented any equipment yet.
                  </p>
                  <Link
                    href={`/assets?client_id=${client.id}`}
                    className="inline-flex items-center mt-4 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-slate-900"
                  >
                    <Package className="h-3.5 w-3.5 mr-1" />
                    Browse Equipment Catalog
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider">
                        <th className="py-3 px-4">Asset / Equipment</th>
                        <th className="py-3 px-4">Serial #</th>
                        <th className="py-3 px-4">Daily Rate</th>
                        <th className="py-3 px-4">Checkout Date</th>
                        <th className="py-3 px-4">Expected Return</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right print:hidden">Billed Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {rentals.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {r.asset?.name || 'Asset Item'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {r.asset?.serial_number || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            {formatCurrency(r.rental_rate_at_checkout)} / day
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {r.checkout_date}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {r.expected_return_date || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              r.status === 'rented' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              r.status === 'returned' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right print:hidden">
                            {r.invoice_id ? (
                              <Link
                                href={`/documents/${r.invoice_id}`}
                                className="inline-flex items-center text-xs font-bold text-indigo-600 hover:underline"
                              >
                                View Bill
                                <ArrowUpRight className="h-3 w-3 ml-0.5" />
                              </Link>
                            ) : (
                              <Link
                                href={`/documents/create?client_id=${client.id}&rental_id=${r.id}&description=Equipment Rental: ${encodeURIComponent(r.asset?.name || '')}&quantity=1&unit_price=${r.rental_rate_at_checkout}`}
                                className="inline-flex items-center px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg transition-colors"
                              >
                                Generate Bill
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Full Profile & Address Details */}
          {activeTab === 'profile' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center">
                    <Building className="h-4 w-4 mr-1.5 text-indigo-500" />
                    Client Profile Info
                  </h4>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Client Name</span>
                      <span className="text-slate-800 font-extrabold text-sm">{client.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Client Profile URL</span>
                      <span className="text-indigo-600 font-mono font-bold">
                        /clients/{client.slug || client.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Client System ID</span>
                      <span className="text-slate-600 font-mono">{client.id}</span>
                    </div>
                    {client.created_at && (
                      <div>
                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Account Created</span>
                        <span className="text-slate-700">{new Date(client.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center">
                    <Mail className="h-4 w-4 mr-1.5 text-indigo-500" />
                    Contact & Communication
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Email Address</span>
                      <span className="text-slate-800 font-semibold">{client.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Phone Number</span>
                      <span className="text-slate-800 font-semibold">{client.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Registered Billing Address</span>
                      <span className="text-slate-800 font-medium whitespace-pre-line">{client.address || '—'}</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Edit Profile Information
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-extrabold text-sm uppercase tracking-wider">
                Edit Client Profile
              </span>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={e => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Profile URL Slug</label>
                  <span className="text-[11px] text-slate-400 font-mono">/clients/{clientForm.slug || 'slug'}</span>
                </div>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg px-2.5 py-1.5 text-xs text-slate-500 font-mono">
                    /clients/
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. markaz"
                    value={clientForm.slug}
                    onChange={e => setClientForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-r-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Direct URL shortcut for this client profile.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={e => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={e => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Billing Address</label>
                <textarea
                  rows={2.5}
                  value={clientForm.address}
                  onChange={e => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                ></textarea>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClient}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingClient ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.249 8.477 3.518 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.59 1.966 14.12 .949 11.49 .949c-5.437 0-9.862 4.371-9.866 9.8c-.001 1.77.463 3.5 1.34 5.044l-.949 3.468 3.553-.931zm10.915-4.88c-.285-.143-1.688-.832-1.948-.928-.26-.096-.45-.143-.64.143-.19.285-.733.928-.9 1.12-.167.193-.335.215-.62.072-.285-.143-1.204-.444-2.293-1.415-.848-.756-1.42-1.69-1.587-1.975-.167-.285-.018-.439.125-.58.128-.127.285-.335.428-.5.143-.167.19-.285.285-.473.095-.19.047-.355-.024-.5-.071-.143-.64-1.543-.877-2.112-.23-.553-.464-.477-.64-.486-.165-.008-.354-.01-.543-.01-.19 0-.5.07-.762.354-.26.285-.992.97-1.01 2.373-.017 1.4.996 2.76 1.135 2.95.14.19 2.015 3.077 4.88 4.316.682.295 1.215.47 1.63.602.685.218 1.31.187 1.803.114.549-.08 1.688-.69 1.927-1.357.24-.667.24-1.238.168-1.357-.071-.12-.26-.19-.545-.332z" />
  </svg>
);
