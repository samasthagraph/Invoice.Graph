'use client';

import React from 'react';
import { Client, Invoice, InvoiceItem, CompanySettings } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileSpreadsheet, Sparkles } from 'lucide-react';

interface InvoicePreviewProps {
  formData: Omit<Invoice, 'id' | 'created_at'> & { items: Omit<InvoiceItem, 'id' | 'invoice_id'>[] };
  settings: CompanySettings;
  selectedClient?: Client;
}

export default function InvoicePreview({ formData, settings, selectedClient }: InvoicePreviewProps) {
  const isInvoice = formData.document_type === 'invoice';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Real-time Indicator Badge */}
      <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[11px] font-bold text-indigo-700 shadow-sm shadow-indigo-500/5">
        <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-500" />
        Live A4 Print Preview
      </div>

      {/* Main A4 sheet sheet */}
      <div className="w-full max-w-[800px] min-h-[1130px] bg-white border border-slate-200 rounded-2xl shadow-xl p-8 lg:p-12 text-slate-800 flex flex-col justify-between relative print:shadow-none print:border-none print:p-0 print:m-0">
        
        {/* Subtle Decorative Gradient Bar */}
        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
          isInvoice ? 'from-indigo-600 to-cyan-500' : 'from-amber-500 to-orange-400'
        }`} />

        <div className="space-y-8">
          {/* Header: Company Logo & Info + Doc Title & Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-8">
            {/* Company Info & Logo */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {settings.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={settings.logo_url} 
                    alt="Company Logo" 
                    className="h-10 max-w-[150px] object-contain"
                  />
                ) : (
                  <div className={`p-2.5 rounded-xl text-white ${isInvoice ? 'bg-indigo-600' : 'bg-amber-500'}`}>
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                )}
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  {settings.company_name}
                </span>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed font-medium">
                {settings.company_address && <p className="whitespace-pre-line">{settings.company_address}</p>}
                {settings.company_phone && <p className="mt-1">Phone: {settings.company_phone}</p>}
                {settings.company_email && <p>Email: {settings.company_email}</p>}
                {settings.tax_id && <p className="mt-1.5 font-semibold text-slate-700">Tax ID / GSTIN: {settings.tax_id}</p>}
              </div>
            </div>

            {/* Document Meta Info */}
            <div className="text-left sm:text-right space-y-3.5">
              <h2 className={`text-2xl font-black uppercase tracking-wider ${
                isInvoice ? 'text-indigo-600' : 'text-amber-600'
              }`}>
                {isInvoice ? 'Tax Invoice' : 'Quotation'}
              </h2>
              <div className="text-xs text-slate-500 space-y-1.5 font-medium">
                <p>
                  <span className="text-slate-400 uppercase tracking-wider font-bold">Doc #: </span>
                  <span className="font-extrabold text-slate-800">{formData.document_number || '---'}</span>
                </p>
                <p>
                  <span className="text-slate-400 uppercase tracking-wider font-bold">Date: </span>
                  <span className="font-semibold text-slate-700">{formatDate(formData.issue_date)}</span>
                </p>
                <p>
                  <span className="text-slate-400 uppercase tracking-wider font-bold">
                    {isInvoice ? 'Due Date: ' : 'Valid Until: '}
                  </span>
                  <span className="font-semibold text-slate-700">{formatDate(formData.due_date)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Client Info Grid */}
          <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                {isInvoice ? 'Bill To' : 'Quotation For'}
              </span>
              {selectedClient ? (
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-800">{selectedClient.name}</h4>
                  {selectedClient.company_name && (
                    <p className="text-xs font-semibold text-slate-600">{selectedClient.company_name}</p>
                  )}
                  {selectedClient.phone && <p className="text-[11px] text-slate-500">Phone: {selectedClient.phone}</p>}
                  {selectedClient.email && <p className="text-[11px] text-slate-500">Email: {selectedClient.email}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No client selected</p>
              )}
            </div>
            <div>
              {selectedClient?.address && (
                <>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Billing Address</span>
                  <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">{selectedClient.address}</p>
                </>
              )}
            </div>
          </div>

          {/* Program / Project Description */}
          {formData.project_description && (
            <div className={`border-l-4 px-5 py-4 rounded-r-xl ${
              isInvoice ? 'border-indigo-500 bg-indigo-50/30' : 'border-amber-500 bg-amber-50/30'
            }`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Program / Project Description
              </span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-semibold">
                {formData.project_description}
              </p>
            </div>
          )}

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5">Item & Description</th>
                  <th className="py-2.5 text-right w-16">Qty</th>
                  <th className="py-2.5 text-right w-24">Unit Price</th>
                  <th className="py-2.5 text-right w-16">Tax</th>
                  <th className="py-2.5 text-right w-16">Disc</th>
                  <th className="py-2.5 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {formData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 pr-4">
                      <p className="font-extrabold text-slate-800 whitespace-pre-line">{item.description || 'Untitled item'}</p>
                    </td>
                    <td className="py-3.5 text-right font-bold text-slate-700">{item.quantity}</td>
                    <td className="py-3.5 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3.5 text-right text-slate-500">{item.tax_rate > 0 ? `${item.tax_rate}%` : '0%'}</td>
                    <td className="py-3.5 text-right text-slate-500">{item.discount_rate > 0 ? `${item.discount_rate}%` : '0%'}</td>
                    <td className="py-3.5 text-right font-bold text-slate-800">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations Block */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <div className="w-64 space-y-2.5 text-xs font-medium">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{formatCurrency(formData.subtotal)}</span>
              </div>
              {formData.discount_total > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Total Discount:</span>
                  <span>-{formatCurrency(formData.discount_total)}</span>
                </div>
              )}
              {formData.tax_total > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Total Tax:</span>
                  <span>{formatCurrency(formData.tax_total)}</span>
                </div>
              )}
              <div className={`flex justify-between p-3 rounded-xl font-extrabold text-sm ${
                isInvoice ? 'bg-indigo-50 text-indigo-900 border border-indigo-100/50' : 'bg-amber-50 text-amber-900 border border-amber-100/50'
              }`}>
                <span>Grand Total:</span>
                <span>{formatCurrency(formData.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Notes Section */}
        <div className="border-t border-slate-100 pt-8 mt-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[10px] font-medium text-slate-400 leading-relaxed">
            {/* Notes display */}
            <div>
              {formData.notes && (
                <>
                  <span className="font-bold uppercase tracking-wider block mb-1 text-slate-400">Terms & Instructions</span>
                  <p className="whitespace-pre-line text-slate-500">{formData.notes}</p>
                </>
              )}
            </div>

            {/* Bank details prefill */}
            <div className="sm:text-right">
              {settings.bank_name && (
                <>
                  <span className="font-bold uppercase tracking-wider block mb-1 text-slate-400">Payment Account details</span>
                  <div className="text-slate-500 space-y-0.5 font-semibold">
                    <p>Bank: {settings.bank_name}</p>
                    <p>A/C: {settings.bank_account_no}</p>
                    {settings.bank_ifsc && <p>IFSC: {settings.bank_ifsc}</p>}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
            Thank you for your business!
          </div>
        </div>

      </div>
    </div>
  );
}
