import { FileSpreadsheet, Lock } from 'lucide-react';
import type { AppPage } from '../types.ts';

interface NavbarProps {
  currentPage: AppPage;
  isAdmin: boolean;
  onNavigate: (page: AppPage) => void;
  onExportExcel: () => void;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  recordCount: number;
}

export function Navbar({
  currentPage,
  isAdmin,
  onNavigate,
  onExportExcel,
  onOpenAdminLogin,
  onLogoutAdmin,
  recordCount,
}: NavbarProps) {
  const adminNavItems: Array<{ id: AppPage; label: string }> = [
    { id: 'home', label: 'หน้าหลัก' },
    { id: 'database', label: 'ฐานข้อมูล Excel' },
    { id: 'map', label: 'แผนที่สรุปจำนวน' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:gap-8 sm:px-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          ทีมงานอิสระ
        </button>

        {/* Zone 2: Navigation links (only visible when authenticated as Admin) */}
        <nav aria-label="เมนูหลัก" className="flex items-center gap-3 sm:gap-6 overflow-x-auto">
          {isAdmin && (
            <>
              {adminNavItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative py-2 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-slate-900"
                      />
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onLogoutAdmin}
                className="py-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-red-600 whitespace-nowrap shrink-0 cursor-pointer"
              >
                ออกจาก Admin
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          {isAdmin ? (
            <button
              type="button"
              onClick={onExportExcel}
              disabled={recordCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>ส่งออก Excel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
