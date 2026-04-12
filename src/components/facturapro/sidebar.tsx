'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import type { Page } from '@/lib/types';

const navItems: { icon: React.ElementType; label: string; page: Page }[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord', page: 'dashboard' },
  { icon: Users, label: 'Clients', page: 'clients' },
  { icon: FileText, label: 'Devis', page: 'devis' },
  { icon: Receipt, label: 'Factures', page: 'invoices' },
  { icon: Settings, label: 'Paramètres', page: 'settings' },
];

export function Sidebar() {
  const {
    user,
    currentPage,
    sidebarOpen,
    mobileSidebarOpen,
    setPage,
    toggleSidebar,
    setMobileSidebarOpen,
    logout,
  } = useAppStore();

  const handleNav = (page: Page) => {
    setPage(page);
    setMobileSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Receipt className="w-5 h-5 text-white" />
        </div>
        {(sidebarOpen || mobileSidebarOpen) && (
          <h1 className="text-lg font-bold text-white tracking-tight">FacturaPro</h1>
        )}
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              onClick={() => handleNav(item.page)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 cursor-pointer
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                }
              `}
              title={item.label}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {(sidebarOpen || mobileSidebarOpen) && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User info */}
      <Separator className="bg-white/10" />
      <div className="px-3 py-4">
        {(sidebarOpen || mobileSidebarOpen) && user && (
          <div className="px-3 mb-3">
            <p className="text-sm font-medium text-white truncate">{user.firstName} {user.name}</p>
            <p className="text-xs text-white/50 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150 cursor-pointer"
          title="Se déconnecter"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(sidebarOpen || mobileSidebarOpen) && <span>Se déconnecter</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col h-screen fixed left-0 top-0
          bg-[#1a1a2e] transition-all duration-300 ease-in-out z-30
          ${sidebarOpen ? 'w-64' : 'w-[72px]'}
        `}
      >
        {sidebarContent}
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 bg-[#1a1a2e] border border-[#2a2a4e] rounded-full
            flex items-center justify-center text-white/70 hover:text-white hover:bg-[#2a2a4e]
            transition-colors cursor-pointer z-40"
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-72 bg-[#1a1a2e] z-50
          transform transition-transform duration-300 ease-in-out lg:hidden
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
