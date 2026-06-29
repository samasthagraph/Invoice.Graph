'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sliders, Database, Sparkles } from 'lucide-react';
import Link from 'next/link';
import InvoiceForm from '@/components/InvoiceForm';
import InvoicePreview from '@/components/InvoicePreview';
import { db } from '@/lib/db';
import { Client, CompanySettings, InvoiceStatus } from '@/types';

export default function CreateDocument() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  // Initial Form State
  const [formData, setFormData] = useState({
    document_type: 'invoice',
    document_number: '',
    client_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    subtotal: 0,
    tax_total: 0,
    discount_total: 0,
    grand_total: 0,
    project_description: '',
    notes: '1. Please pay within 30 days.\n2. Bank Account details listed below.',
    items: [
      { description: '', quantity: 1, unit_price: 0, tax_rate: 18, discount_rate: 0, total: 0 }
    ]
  });

  // Load initial settings, clients, and generate invoice number
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const compSettings = await db.getSettings();
        const clientList = await db.getClients();
        const allInvoices = await db.getInvoices();

        setSettings(compSettings);
        setClients(clientList);

        // Generate next sequence document number
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const prefix = formData.document_type === 'invoice' ? 'INV' : 'QTN';
        const year = new Date().getFullYear();
        const docNumber = `${prefix}-${year}-${randomNum}`;

        setFormData(prev => ({
          ...prev,
          document_number: docNumber
        }));
      } catch (err) {
        console.error('Failed to initialize page data', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [formData.document_type]);

  // Find selected client details for live preview
  const selectedClient = clients.find(c => c.id === formData.client_id);

  // Handle Save
  const handleSave = async (status: InvoiceStatus) => {
    if (!formData.client_id) {
      alert('Please select a client before saving.');
      return;
    }
    
    if (!formData.document_number) {
      alert('Please enter a document number.');
      return;
    }

    const emptyItems = formData.items.some(item => !item.description.trim());
    if (emptyItems) {
      alert('Please fill out descriptions for all line items.');
      return;
    }

    try {
      setIsSaving(true);
      const savedDoc = await db.saveInvoice({
        ...formData,
        status
      } as any);

      // Redirect to detail page
      router.push(`/documents/${savedDoc.id}`);
    } catch (err) {
      console.error('Failed to save document', err);
      alert('Failed to save document. Please check your inputs or database.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium text-sm">Preparing Billing Canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Top sticky navigation bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <Link
            href="/documents"
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
              New Document Builder
              <Sparkles className="h-4 w-4 text-indigo-500 ml-2 animate-bounce" />
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Drafting a {formData.document_type} for billing or estimation.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500">
          <Database className="h-3.5 w-3.5 text-indigo-500 mr-1" />
          <span>Active Client Database Mode</span>
        </div>
      </header>

      {/* Main Split Interface Area */}
      <div className="flex-1 p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-[1800px] w-full mx-auto">
        
        {/* Left Side: Form */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest">Document Editor</h2>
            <Link 
              href="/settings"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold inline-flex items-center cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 mr-1" />
              Configure Default Terms
            </Link>
          </div>
          <InvoiceForm
            formData={formData as any}
            setFormData={setFormData}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>

        {/* Right Side: A4 Preview */}
        <div className="space-y-6 lg:sticky lg:top-[90px]">
          <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest">A4 PDF Preview</h2>
          <InvoicePreview
            formData={formData as any}
            settings={settings}
            selectedClient={selectedClient}
          />
        </div>

      </div>
    </div>
  );
}
