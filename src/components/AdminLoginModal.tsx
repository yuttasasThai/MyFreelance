import React, { useEffect, useState } from 'react';
import { Lock, X, Loader2, ShieldCheck } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (token: string) => void;
}

export function AdminLoginModal({
  isOpen,
  onClose,
  onAuthenticated,
}: AdminLoginModalProps) {
  const [passcode, setPasscode] = useState('');
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPasscode('');
    setErrorMsg(null);
    setIsConfigured(null);

    let cancelled = false;
    fetch('/api/admin/status')
      .then((res) => (res.ok ? res.json() : { configured: true }))
      .then((data: { configured?: boolean }) => {
        if (!cancelled) {
          setIsConfigured(Boolean(data.configured));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsConfigured(true);
        }
      });

    return () => {
      cancelled = true;
    };
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

    if (!passcode.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);
    try {
      let configured = isConfigured;
      if (configured === null) {
        const statusRes = await fetch('/api/admin/status').catch(() => null);
        if (statusRes?.ok) {
          const statusData = (await statusRes.json().catch(() => ({}))) as { configured?: boolean };
          configured = Boolean(statusData.configured);
          setIsConfigured(configured);
        } else {
          configured = true;
        }
      }
      const endpoint = configured === false ? '/api/admin/setup' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
      };

      if (!res.ok || !data.token) {
        setErrorMsg(data.error || 'รหัสผ่านไม่ถูกต้อง');
        return;
      }

      setPasscode('');
      onAuthenticated(data.token);
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
      aria-labelledby="admin-modal-title"
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
              {isConfigured === false ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </div>
            <div>
              <h2 id="admin-modal-title" className="text-base font-semibold text-slate-900">
                {isConfigured === false ? 'ตั้งรหัสผ่าน Admin' : 'เข้าสู่ระบบ Admin'}
              </h2>
              <p className="text-xs text-slate-500">
                {isConfigured === false
                  ? 'กำหนดรหัสผ่านสำหรับใช้งานครั้งแรก'
                  : 'สำหรับเข้าดูฐานข้อมูลและแผนที่'}
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
            <label htmlFor="admin-passcode-input" className="mb-1.5 block text-sm font-medium text-slate-700">
              รหัสผ่าน
            </label>
            <input
              id="admin-passcode-input"
              type="password"
              autoComplete={isConfigured === false ? 'new-password' : 'off'}
              autoCapitalize="off"
              spellCheck={false}
              autoFocus
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
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
                  <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <span>ยืนยัน</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
