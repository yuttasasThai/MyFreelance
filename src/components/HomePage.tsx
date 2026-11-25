import { Lock, TableProperties, MapPin, Download } from 'lucide-react';
import { InverterWrenchIcon, SolarCartIcon } from './WorkTypeIcons.tsx';
import type { AppPage, WorkType } from '../types.ts';

interface HomePageProps {
  isAdmin: boolean;
  isDownloadingSource: boolean;
  sourceRevision: number;
  onSelectWorkType: (type: WorkType) => void;
  onOpenAdminLogin: () => void;
  onNavigate: (page: AppPage) => void;
  onDownloadSource: () => void;
}

export function HomePage({
  isAdmin,
  isDownloadingSource,
  sourceRevision,
  onSelectWorkType,
  onOpenAdminLogin,
  onNavigate,
  onDownloadSource,
}: HomePageProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col items-center justify-center px-3 py-8 sm:px-6">
      {/* Cover Header */}
      <section className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
          งานอิสระทำที่บ้าน
        </h1>
        <p className="mt-1.5 font-display text-base font-medium text-slate-600 sm:text-lg">
          &ldquo;งานดี my freelance&rdquo;
        </p>
      </section>

      {/* Focal Anchor: Compact 3D Circular Button Cluster sized for mobile & desktop */}
      <section aria-label="ปุ่มเลือกประเภทงาน 3 มิติ" className="mt-8 w-full max-w-xl">
        <div className="orb-3d-stage relative flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-3 py-9 shadow-sm sm:px-10 sm:py-12">
          {/* Concentric background rings */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl"
          >
            <div className="h-64 w-64 rounded-full border border-slate-200/70 sm:h-80 sm:w-80" />
            <div className="absolute h-44 w-44 rounded-full border border-dashed border-slate-200 sm:h-56 sm:w-56" />
          </div>

          <div className="relative z-10 flex flex-row items-center justify-center gap-3.5 sm:gap-10">
            {/* 1) 3D Circular Button: งานประกอบสินค้า (Hybrid Inverter + ไขควงจิ้มลง) */}
            <button
              type="button"
              onClick={() => onSelectWorkType('assembly')}
              className="orb-3d-assembly group relative flex h-[156px] w-[156px] flex-col items-center justify-center rounded-full p-2.5 text-center text-white cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-orange-500 sm:h-54 sm:w-54 sm:p-5"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-full border border-white/25 sm:inset-2.5"
              />
              <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-white shadow-md ring-2 ring-orange-300/80 transition-transform duration-150 group-hover:scale-105 sm:h-24 sm:w-24">
                <InverterWrenchIcon className="h-14 w-14 sm:h-[68px] sm:w-[68px]" />
              </div>
              <span className="mt-2 text-[13px] font-bold leading-tight tracking-tight sm:mt-3 sm:text-base">
                งานประกอบสินค้า
              </span>
              <span className="mt-0.5 text-[10px] text-blue-100/95 sm:text-xs">
                กดกรอกข้อมูล
              </span>
            </button>

            {/* 2) 3D Circular Button: งานขายสินค้า (รถเข็นมีอุปกรณ์โซลาร์เซลล์) */}
            <button
              type="button"
              onClick={() => onSelectWorkType('sales')}
              className="orb-3d-sales group relative flex h-[156px] w-[156px] flex-col items-center justify-center rounded-full p-2.5 text-center text-white cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-orange-500 sm:h-54 sm:w-54 sm:p-5"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-full border border-white/25 sm:inset-2.5"
              />
              <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-white shadow-md ring-2 ring-orange-300/80 transition-transform duration-150 group-hover:scale-105 sm:h-24 sm:w-24">
                <SolarCartIcon className="h-14 w-14 sm:h-[68px] sm:w-[68px]" />
              </div>
              <span className="mt-2 text-[13px] font-bold leading-tight tracking-tight sm:mt-3 sm:text-base">
                งานขายสินค้า
              </span>
              <span className="mt-0.5 text-[10px] text-emerald-100/95 sm:text-xs">
                กดกรอกข้อมูล
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Admin Access Entry on Home Page */}
      <section className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {!isAdmin ? (
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-100 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span>Admin</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onNavigate('database')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              <TableProperties className="h-4 w-4 text-emerald-700" />
              <span>ฐานข้อมูล Excel</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              <MapPin className="h-4 w-4 text-blue-700" />
              <span>แผนที่สรุปจำนวน</span>
            </button>
            <button
              type="button"
              onClick={onDownloadSource}
              disabled={isDownloadingSource}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-slate-800 disabled:opacity-60 cursor-pointer tabular-nums"
            >
              <Download className="h-4 w-4" />
              <span>
                {isDownloadingSource
                  ? 'กำลังเตรียมไฟล์...'
                  : `ดาวน์โหลด Source Code (rev${sourceRevision})`}
              </span>
            </button>
          </>
        )}
      </section>
    </main>
  );
}
