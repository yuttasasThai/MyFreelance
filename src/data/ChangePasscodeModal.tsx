import React, { useEffect, useState } from 'react';
import { KeyRound, X, Loader2 } from 'lucide-react';

interface ChangePasscodeModalProps {
  isOpen: boolean;
  adminToken: string | null;
  onClose: () => void;
  onPasscodeChanged: (newToken: string) => void;
}

export function ChangePasscodeModal({
  isOpen,
  adminToken,
  onClose,
  onPasscodeChanged,
}: ChangePasscodeModalProps) {
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPasscode('');
    setNewPasscode('');
    setConfirmPasscode('');
    setErrorMsg(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPasscode.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านเดิม');
      return;
    }
    const cleanNew = newPasscode.trim();
    if (cleanNew.replace(/[\s-]+/g, '').length < 6) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (cleanNew !== confirmPasscode.trim()) {
      setErrorMsg('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    if (!adminToken) {
      setErrorMsg('เซสชันหมดอายุ กรุณาเข้าสู่ระบบ Admin ใหม่');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/change-passcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPasscode: currentPasscode.trim(),
          newPasscode: cleanNew,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
      };

      if (!res.ok || !data.token) {
        setErrorMsg(data.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
        return;
      }

      onPasscodeChanged(data.token);
      onClose();
    } catch {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-passcode-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 id="change-passcode-title" className="text-base font-semibold text-slate-900">
                เปลี่ยนรหัสผ่าน Admin
              </h2>
              <p className="text-xs text-slate-500">
                บันทึกถาวรสำหรับเข้าสู่ระบบครั้งถัดไป
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="ปิดหน้าต่าง"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label htmlFor="current-passcode-input" className="mb-1.5 block text-sm font-medium text-slate-700">
              รหัสผ่านเดิม
            </label>
            <input
              id="current-passcode-input"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={currentPasscode}
              onChange={(e) => setCurrentPasscode(e.target.value)}
              placeholder="กรอกรหัสผ่านเดิมที่ใช้อยู่"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          <div>
            <label htmlFor="new-passcode-input" className="mb-1.5 block text-sm font-medium text-slate-700">
              รหัสผ่านใหม่
            </label>
            <input
              id="new-passcode-input"
              type="password"
              autoComplete="new-password"
              required
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              placeholder="กำหนดรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          <div>
            <label htmlFor="confirm-passcode-input" className="mb-1.5 block text-sm font-medium text-slate-700">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              id="confirm-passcode-input"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            >
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>บันทึกรหัสผ่านใหม่</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
