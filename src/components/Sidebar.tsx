'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Database,
  CloudOff,
  Menu,
  X,
  FileSpreadsheet,
  Boxes
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'supabase' | 'offline'>('offline');

  useEffect(() => {
    const usePostgres = process.env.NEXT_PUBLIC_USE_POSTGRES === 'true';
    if (usePostgres) {
      setDbStatus('online');
    } else if (isSupabaseConfigured) {
      setDbStatus('supabase');
    } else {
      setDbStatus('offline');
    }
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Invoices & Quotes', href: '/documents', icon: FileText },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Assets & Rentals', href: '/assets', icon: Boxes },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-50 shadow-md">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="h-6 w-6 text-indigo-400" />
          <span className="font-bold text-lg tracking-wider font-sans bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            ANTIGRAVITY BILL
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1 hover:bg-slate-800 rounded-md focus:outline-none transition-colors"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out h-full
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Logo Section */}
          <div className="px-6 py-8 border-b border-slate-800 flex items-center space-x-3">
            <div className="bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-500/20 shadow-inner">
              <FileSpreadsheet className="h-6 w-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wide text-white block">
                Graph.Invoice
              </span>
              <span className="text-xs text-slate-400 tracking-widest font-semibold block uppercase">

              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-8 px-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group
                    ${isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/15'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'}
                  `}
                >
                  <Icon className={`
                    mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110
                    ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}
                  `} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Database Status Indicator */}
        <div className="p-4 border-t border-slate-800">
          {dbStatus === 'online' ? (
            <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 flex items-center space-x-3 shadow-inner">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <Database className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Neon DB Connected</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Direct Postgres sync active</p>
              </div>
            </div>
          ) : dbStatus === 'supabase' ? (
            <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 flex items-center space-x-3 shadow-inner">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <Database className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Supabase Connected</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Cloud Database sync active</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-2xl p-4 flex items-center space-x-3 shadow-inner">
              <div className="bg-amber-500/20 p-2 rounded-lg">
                <CloudOff className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Local Storage Mode</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Offline mode. Connect in Settings.</p>
              </div>
            </div>
          )}
          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-500 font-medium">Internal Corporate Portal v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
