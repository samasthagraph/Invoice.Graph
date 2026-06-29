'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Clock, 
  FileCheck2, 
  DollarSign, 
  Plus, 
  ArrowUpRight, 
  FileText,
  UserPlus,
  Sliders,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { db } from '@/lib/db';
import { Invoice, Client } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingCollections, setPendingCollections] = useState(0);
  const [totalInvoiced, setTotalInvoiced] = useState(0);
  const [quotePipeline, setQuotePipeline] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const allInvoices = await db.getInvoices();
        const allClients = await db.getClients();
        
        setInvoices(allInvoices);
        setClientsCount(allClients.length);

        // Calculations
        let revenue = 0;      // Paid invoices
        let pending = 0;      // Unpaid or sent invoices
        let invoicedSum = 0;  // Total invoice grand totals
        let quotesSum = 0;    // Total quotation grand totals

        allInvoices.forEach(inv => {
          if (inv.document_type === 'invoice') {
            invoicedSum += Number(inv.grand_total);
            if (inv.status === 'paid') {
              revenue += Number(inv.grand_total);
            } else if (inv.status === 'unpaid' || inv.status === 'sent') {
              pending += Number(inv.grand_total);
            }
          } else if (inv.document_type === 'quotation') {
            if (inv.status !== 'rejected' && inv.status !== 'expired') {
              quotesSum += Number(inv.grand_total);
            }
          }
        });

        setTotalRevenue(revenue);
        setPendingCollections(pending);
        setTotalInvoiced(invoicedSum);
        setQuotePipeline(quotesSum);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const stats = [
    {
      name: 'Total Revenue',
      value: totalRevenue,
      subtext: 'Completed payments',
      icon: TrendingUp,
      bgColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
      iconColor: 'text-emerald-500',
    },
    {
      name: 'Pending Collections',
      value: pendingCollections,
      subtext: 'Sent & Unpaid invoices',
      icon: Clock,
      bgColor: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
      iconColor: 'text-amber-500',
    },
    {
      name: 'Total Invoiced',
      value: totalInvoiced,
      subtext: 'Accumulated invoices',
      icon: DollarSign,
      bgColor: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600',
      iconColor: 'text-indigo-500',
    },
    {
      name: 'Quotation Pipeline',
      value: quotePipeline,
      subtext: 'Active negotiations',
      icon: FileCheck2,
      bgColor: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600',
      iconColor: 'text-cyan-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium text-sm">Aggregating dashboard analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-8 bg-slate-50">
      {/* Upper Header Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time billing, collections, and quotation tracker.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/documents/create"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Document
          </Link>
        </div>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-500">{stat.name}</span>
                <div className={`p-2.5 rounded-xl border ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {formatCurrency(stat.value)}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">{stat.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Workflows</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link 
            href="/documents/create"
            className="flex items-center p-4 border border-slate-100 hover:border-indigo-100 bg-slate-50/50 hover:bg-indigo-50/30 rounded-xl transition-all group"
          >
            <div className="p-3 bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500/20 rounded-xl transition-colors mr-4">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-700 block text-sm group-hover:text-indigo-700">Create Bill/Quote</span>
              <span className="text-xs text-slate-400 block mt-0.5">Generate client invoices or quotations</span>
            </div>
          </Link>
          <Link 
            href="/clients"
            className="flex items-center p-4 border border-slate-100 hover:border-cyan-100 bg-slate-50/50 hover:bg-cyan-50/30 rounded-xl transition-all group"
          >
            <div className="p-3 bg-cyan-500/10 text-cyan-600 group-hover:bg-cyan-500/20 rounded-xl transition-colors mr-4">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-700 block text-sm group-hover:text-cyan-700">Manage Clients</span>
              <span className="text-xs text-slate-400 block mt-0.5">Add, edit and view directory of {clientsCount} clients</span>
            </div>
          </Link>
          <Link 
            href="/settings"
            className="flex items-center p-4 border border-slate-100 hover:border-violet-100 bg-slate-50/50 hover:bg-violet-50/30 rounded-xl transition-all group"
          >
            <div className="p-3 bg-violet-500/10 text-violet-600 group-hover:bg-violet-50/20 rounded-xl transition-colors mr-4">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-700 block text-sm group-hover:text-violet-700">Settings</span>
              <span className="text-xs text-slate-400 block mt-0.5">Update tax details, banking, company branding</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Split Layout: Invoices & Recent clients summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (Span 2) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Recent Generated Documents</h2>
              <Link 
                href="/documents"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center"
              >
                View all
                <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              {invoices.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium text-sm">No billing records found</p>
                  <Link 
                    href="/documents/create"
                    className="text-indigo-600 font-bold text-xs hover:underline mt-2 inline-block"
                  >
                    Generate your first invoice now
                  </Link>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Number</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.slice(0, 5).map((inv) => (
                      <tr 
                        key={inv.id}
                        className="hover:bg-slate-50/40 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <Link href={`/documents/${inv.id}`} className="font-bold text-slate-700 hover:text-indigo-600 text-sm">
                            {inv.document_number}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-slate-700">{inv.client?.name}</div>
                          {inv.client?.company_name && (
                            <div className="text-[11px] text-slate-400">{inv.client.company_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <span className={`px-2 py-0.5 rounded-full ${
                            inv.document_type === 'invoice' 
                              ? 'bg-indigo-50 text-indigo-700' 
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {inv.document_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                          {formatDate(inv.issue_date)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">
                          {formatCurrency(inv.grand_total)}
                        </td>
                        <td className="px-6 py-4">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          {invoices.length > 5 && (
            <div className="p-4 border-t border-slate-100 text-center bg-slate-50/30">
              <Link 
                href="/documents"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center"
              >
                View Remaining {invoices.length - 5} Documents
                <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Collections Progress visual Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Collection Status</h2>
            <div className="relative pt-2">
              <div className="flex mb-2 items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Invoiced vs Received</span>
                <span className="text-indigo-600">
                  {totalInvoiced > 0 ? ((totalRevenue / totalInvoiced) * 100).toFixed(0) : 0}% Complete
                </span>
              </div>
              <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-100">
                <div 
                  style={{ width: `${totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                ></div>
              </div>
            </div>

            <div className="space-y-4.5 mt-8">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                <div className="flex items-center text-sm font-semibold text-slate-600">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 mr-2.5"></div>
                  Paid Revenue
                </div>
                <span className="text-sm font-bold text-slate-800">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                <div className="flex items-center text-sm font-semibold text-slate-600">
                  <div className="h-3 w-3 rounded-full bg-amber-500 mr-2.5"></div>
                  Pending Invoices
                </div>
                <span className="text-sm font-bold text-slate-800">{formatCurrency(pendingCollections)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm font-semibold text-slate-600">
                  <div className="h-3 w-3 rounded-full bg-indigo-500 mr-2.5"></div>
                  Total Invoiced
                </div>
                <span className="text-sm font-bold text-slate-800">{formatCurrency(totalInvoiced)}</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/40 rounded-xl p-4 border border-indigo-100/30 text-center mt-6">
            <p className="text-xs text-indigo-700 font-semibold">Need to collect funds?</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Filter outstanding invoices and send reminders.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
