'use client';

import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu,
  Receipt,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Page } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar() {
  const { currentPage, sidebarOpen, mobileSidebarOpen, setPage, setSidebarOpen, setMobileSidebarOpen } = useAppStore();

  const handleNavClick = (page: Page) => {
    setPage(page);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full bg-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarOpen ? 'w-64' : 'w-[72px]',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 h-16 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 shrink-0">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold tracking-tight whitespace-nowrap">FacturaPro</h1>
              <p className="text-[10px] text-slate-400 -mt-0.5 whitespace-nowrap">Invoice Management</p>
            </div>
          )}
        </div>

        <Separator className="bg-slate-700/50" />

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  !sidebarOpen && 'justify-center px-0',
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-blue-400')} />
                {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <Separator className="bg-slate-700/50" />

        {/* Collapse toggle */}
        <div className="p-3 hidden lg:block">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200"
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span>Collapse</span>
              </>
            ) : (
              <ChevronRight className="h-5 w-5 shrink-0" />
            )}
          </button>
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-4 pb-4">
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-xs text-slate-400">Pro Plan</p>
              <p className="text-xs text-slate-500 mt-0.5">Unlimited invoices</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-700">
                <div className="h-1.5 rounded-full bg-blue-500 w-3/4" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">75% storage used</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
