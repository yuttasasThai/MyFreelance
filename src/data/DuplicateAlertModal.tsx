import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DuplicateAlertModalProps {
  isOpen: boolean;
  duplicateBy: 'name' | 'phone' | 'both' | null;
  onClose: () => void;
}

export function DuplicateAlertModal({
  isOpen,
  duplicateBy,
  onClose,
}: DuplicateAlertModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const detailText =
    duplicateBy === 'both'
      ? 'พบทั้งรายชื่อและเบอร์โทรนี้ในระบบแล้ว กรุณาตรวจสอบข้อมูลอีกครั้ง'
      : duplicateBy === 'name'
      ? 'พบรายชื่อนี้ในระบบแล้ว ไม่สามารถบันทึกข้อมูลซ้ำได้'
      : duplicateBy === 'phone'
      ? 'พบเบอร์โทรนี้ในระบบแล้ว ไม่สามารถบันทึกข้อมูลซ้ำได้'
      : 'พบรายชื่อหรือเบอร์โทรนี้ในระบบแล้ว ไม่สามารถบันทึกข้อมูลซ้ำได้';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="duplicate-alert-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="duplicate-alert-title" className="text-lg font-bold text-slate-900">
                มีข้อมูลนี้แล้ว
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">ตรวจสอบพบข้อมูลซ้ำในระบบ</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">{detailText}</p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer sm:w-auto sm:min-w-[100px]"
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
}
