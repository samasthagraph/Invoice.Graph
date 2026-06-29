'use client';

import React, { useEffect, useState } from 'react';
import { 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  CreditCard, 
  Save, 
  Database,
  Terminal,
  FileSpreadsheet,
  Check,
  Copy,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import { db } from '@/lib/db';
import { CompanySettings } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({
    id: '',
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    tax_id: '',
    logo_url: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError(null);
    if (!file) return;

    // Check size limit: 1MB (1,048,576 bytes)
    if (file.size > 1024 * 1024) {
      setLogoError('Image size is too large. Please upload an image smaller than 1MB to preserve database storage.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSettings(prev => ({
        ...prev,
        logo_url: base64String
      }));
    };
    reader.onerror = () => {
      setLogoError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setSettings(prev => ({
      ...prev,
      logo_url: ''
    }));
    setLogoError(null);
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await db.getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await db.saveSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save company settings.');
    } finally {
      setSaving(false);
    }
  };

  const copySQL = () => {
    const sqlText = `-- Copy-paste into your Supabase SQL Editor
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'quotation')),
    document_number TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'unpaid', 'expired', 'accepted', 'rejected')),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    discount_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'My Company',
    company_email TEXT,
    company_phone TEXT,
    company_address TEXT,
    tax_id TEXT,
    logo_url TEXT,
    bank_name TEXT,
    bank_account_no TEXT,
    bank_ifsc TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium text-sm">Loading profile settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-8 bg-slate-50">
      
      {/* Header welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            Branding & Settings
            <Sparkles className="h-5 w-5 text-indigo-500 ml-2.5 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure your company profile, billing logo, bank accounts, and sync status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Settings Form (Span 2) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Company Profile */}
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center mb-4">
                <Building className="h-5 w-5 mr-2 text-indigo-500" />
                Company Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Company Registered Name *</label>
                  <input
                    type="text"
                    required
                    name="company_name"
                    value={settings.company_name}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Billing Email Address</label>
                  <input
                    type="email"
                    name="company_email"
                    value={settings.company_email || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    name="company_phone"
                    value={settings.company_phone || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tax ID / GSTIN / VAT ID</label>
                  <input
                    type="text"
                    name="tax_id"
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    value={settings.tax_id || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold placeholder:font-normal"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Company Logo</label>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    {/* Current Logo Preview */}
                    <div className="h-20 w-20 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {settings.logo_url ? (
                        <img 
                          src={settings.logo_url} 
                          alt="Company Logo Preview" 
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-1">No Logo</span>
                      )}
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="flex-1 space-y-1.5 w-full">
                      <div className="flex items-center gap-2">
                        <label 
                          htmlFor="logo-uploader" 
                          className="inline-flex items-center px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg cursor-pointer transition-colors border border-indigo-100"
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          Upload Logo Image
                        </label>
                        <input
                          type="file"
                          id="logo-uploader"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        {settings.logo_url && (
                          <button
                            type="button"
                            onClick={handleClearLogo}
                            className="inline-flex items-center px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 text-xs font-bold rounded-lg cursor-pointer transition-colors border border-slate-200"
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Upload a PNG or JPEG logo (recommended size under 200KB, max 1MB). It will be saved directly in the database.
                      </p>
                      {logoError && (
                        <p className="text-[10px] text-rose-500 font-bold leading-normal">
                          {logoError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Registered Business Address</label>
                  <textarea
                    rows={3}
                    name="company_address"
                    value={settings.company_address || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Bank details */}
            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center mb-4">
                <CreditCard className="h-5 w-5 mr-2 text-indigo-500" />
                Receiving Bank Account Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={settings.bank_name || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Account Number</label>
                  <input
                    type="text"
                    name="bank_account_no"
                    value={settings.bank_account_no || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Bank IFSC / SWIFT / Routing Code</label>
                  <input
                    type="text"
                    name="bank_ifsc"
                    value={settings.bank_ifsc || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Submit block */}
            <div className="border-t border-slate-100 pt-6 flex items-center justify-end gap-3">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg animate-fade-in flex items-center">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Settings saved successfully!
                </span>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all flex items-center shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:translate-y-0"
              >
                <Save className="h-4.5 w-4.5 mr-1.5" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

          </form>
        </div>

        {/* Right Side: Setup Guide Widget (Span 1) */}
        <div className="space-y-6">
          
          {/* Supabase Status widget */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest flex items-center">
              <Database className="h-4 w-4 mr-1.5 text-indigo-500" />
              Sync Setup status
            </h2>
            {isSupabaseConfigured ? (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-4.5 space-y-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wide block">Supabase Connected!</span>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-semibold">
                  All transactions and client details are synced in real-time to your Supabase PostgreSQL cloud instance.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-4.5 space-y-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wide block">Unsynchronized (Local Mode)</span>
                <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                  Data is temporarily stored in browser <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">localStorage</code>.
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  To connect your private cloud database, add your credentials in the <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded">.env.local</code> file at the project root and restart the Next.js development server.
                </p>
              </div>
            )}
          </div>

          {/* SQL Editor Copy Card */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center">
                <Terminal className="h-4 w-4 mr-1.5 text-cyan-400" />
                Supabase SQL Setup
              </h2>
              <button
                onClick={copySQL}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Copy SQL Schema"
              >
                {copiedSchema ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                Run this database creation schema inside your Supabase project SQL Editor to enable table mapping.
              </p>
              <div className="relative bg-slate-950/80 rounded-xl p-3 border border-slate-850 font-mono text-[9px] text-cyan-300 max-h-48 overflow-y-auto">
                <pre>{`-- SQL Migration Script
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ...
);`}</pre>
              </div>
              <button
                onClick={copySQL}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-center text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Copy SQL Script to Clipboard
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
