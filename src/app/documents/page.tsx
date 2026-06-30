'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Eye, 
  Trash2, 
  FileCheck2,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { db } from '@/lib/db';
import { Invoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DocumentList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoice' | 'quotation'>('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function loadInvoices() {
      try {
        setLoading(true);
        const list = await db.getInvoices();
        setInvoices(list);
      } catch (err) {
        console.error('Error fetching invoices', err);
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop navigation click
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await db.deleteInvoice(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (err) {
      console.error('Failed to delete', err);
      alert('Failed to delete document.');
    }
  };

  // Filtering Logic
  const filteredDocuments = invoices.filter(inv => {
    // 1. Search Query
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      inv.document_number.toLowerCase().includes(searchLower) ||
      (inv.client?.name || '').toLowerCase().includes(searchLower) ||
      (inv.client?.company_name || '').toLowerCase().includes(searchLower);

    // 2. Type Filter
    const matchesType = typeFilter === 'all' || inv.document_type === typeFilter;

    // 3. Status Filter
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const allStatuses = Array.from(new Set(invoices.map(inv => inv.status)));

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 space-y-8 bg-slate-50 animate-pulse">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="h-8 bg-slate-200 rounded w-48"></div>
            <div className="h-4 bg-slate-200 rounded w-80"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded-xl w-36"></div>
        </div>

        {/* Search & Filter bar placeholder */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="h-10 bg-slate-100 rounded-lg w-full md:max-w-md"></div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="h-10 bg-slate-100 rounded-lg w-28"></div>
            <div className="h-10 bg-slate-100 rounded-lg w-28"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div className="h-4 bg-slate-200 rounded w-32"></div>
            <div className="h-4 bg-slate-200 rounded w-20"></div>
          </div>
          <div className="divide-y divide-slate-100 px-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-28"></div>
                    <div className="h-3 bg-slate-200 rounded w-48"></div>
                  </div>
                </div>
                <div className="h-4 bg-slate-200 rounded w-20"></div>
                <div className="h-4 bg-slate-200 rounded w-16"></div>
                <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                <div className="h-8 bg-slate-200 rounded-lg w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-8 bg-slate-50">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            Invoices & Quotations
            <Sparkles className="h-5 w-5 text-indigo-500 ml-2.5 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse, search, filter, and manage your company billing documents.
          </p>
        </div>
        <Link
          href="/documents/create"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Document
        </Link>
      </div>

      {/* Search & Filters Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client, company, or document number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10.5 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Type Filter Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="invoice">Invoices Only</option>
              <option value="quotation">Quotations Only</option>
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {allStatuses.map(status => (
                <option key={status} value={status} className="capitalize">
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3.5" />
            <h3 className="text-sm font-bold text-slate-700">No documents found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              Try adjusting your filters or search terms, or create a new document.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Number</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Client / Company</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((inv) => (
                  <tr 
                    key={inv.id}
                    onClick={() => window.location.href = `/documents/${inv.id}`}
                    className="hover:bg-slate-50/40 transition-colors group cursor-pointer"
                  >
                    {/* Document Number */}
                    <td className="px-6 py-4.5">
                      <span className="font-bold text-slate-700 group-hover:text-indigo-600 text-sm">
                        {inv.document_number}
                      </span>
                    </td>

                    {/* Client Info */}
                    <td className="px-6 py-4.5">
                      <div className="text-sm font-bold text-slate-700">{inv.client?.name || 'Unknown'}</div>
                      {inv.client?.company_name && (
                        <div className="text-[11px] text-slate-400">{inv.client.company_name}</div>
                      )}
                    </td>

                    {/* Document Type */}
                    <td className="px-6 py-4.5 text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded-full ${
                        inv.document_type === 'invoice' 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {inv.document_type}
                      </span>
                    </td>

                    {/* Issue & Due Date */}
                    <td className="px-6 py-4.5 text-xs font-semibold text-slate-500">
                      <div>Issued: {formatDate(inv.issue_date)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Due: {formatDate(inv.due_date)}</div>
                    </td>

                    {/* Grand Total */}
                    <td className="px-6 py-4.5 text-sm font-extrabold text-slate-800">
                      {formatCurrency(inv.grand_total)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        inv.status === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        inv.status === 'unpaid' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                        inv.status === 'sent' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                        inv.status === 'draft' ? 'bg-slate-100 border-slate-200 text-slate-600' :
                        'bg-amber-50 border-amber-100 text-amber-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1.5">
                        <Link 
                          href={`/documents/${inv.id}`}
                          className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(inv.id, e)}
                          className="p-1.5 border border-rose-100 bg-rose-50/50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
