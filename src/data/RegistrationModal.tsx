import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { InverterWrenchIcon, SolarCartIcon } from './WorkTypeIcons.tsx';
import { THAILAND_PROVINCES } from '../data/thailandProvinces.ts';
import type { CreateTeamRecordInput, WorkType } from '../types.ts';

interface RegistrationModalProps {
  isOpen: boolean;
  initialWorkType: WorkType;
  onClose: () => void;
  onSubmit: (input: CreateTeamRecordInput) => Promise<void>;
}

export function RegistrationModal({
  isOpen,
  initialWorkType,
  onClose,
  onSubmit,
}: RegistrationModalProps) {
  const [workType, setWorkType] = useState<WorkType>(initialWorkType);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWorkType(initialWorkType);
      setName('');
      setPhone('');
      setSubdistrict('');
      setDistrict('');
      setProvince('');
      setErrorMsg(null);
    }
  }, [isOpen, initialWorkType]);

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

    if (!name.trim() || !phone.trim() || !subdistrict.trim() || !district.trim() || !province.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบทุกช่อง (ชื่อ, เบอร์โทร, ตำบล, อำเภอ, จังหวัด)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        workType,
        name: name.trim(),
        phone: phone.trim(),
        subdistrict: subdistrict.trim(),
        district: district.trim(),
        province: province.trim(),
      });
      setName('');
      setPhone('');
      setSubdistrict('');
      setDistrict('');
      setProvince('');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
              บันทึกข้อมูลทีมงานอิสระ
            </h2>
            <p className="text-xs text-slate-500">
              กรอกข้อมูลเบื้องต้นเพื่อบันทึกลงฐานข้อมูล Excel และปักหมุดพื้นที่
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="ปิดหน้าต่าง"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Segmented Work Type Selector */}
          <div>
            <span className="mb-2 block text-xs font-medium text-slate-600">ประเภทงานที่เลือก</span>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setWorkType('assembly')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  workType === 'assembly'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <InverterWrenchIcon className="h-5 w-5 shrink-0" />
                <span>งานประกอบสินค้า</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkType('sales')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  workType === 'sales'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SolarCartIcon className="h-5 w-5 shrink-0" />
                <span>งานขายสินค้า</span>
              </button>
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="field-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                ชื่อ - นามสกุล <span className="text-red-600">*</span>
              </label>
              <input
                id="field-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label htmlFor="field-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                เบอร์โทร <span className="text-red-600">*</span>
              </label>
              <input
                id="field-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          {/* Address: Tambon, Amphoe, Changwat */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="field-subdistrict" className="mb-1.5 block text-sm font-medium text-slate-700">
                ตำบล / แขวง <span className="text-red-600">*</span>
              </label>
              <input
                id="field-subdistrict"
                type="text"
                required
                value={subdistrict}
                onChange={(e) => setSubdistrict(e.target.value)}
                placeholder="เช่น สุเทพ"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label htmlFor="field-district" className="mb-1.5 block text-sm font-medium text-slate-700">
                อำเภอ / เขต <span className="text-red-600">*</span>
              </label>
              <input
                id="field-district"
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="เช่น เมืองเชียงใหม่"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label htmlFor="field-province" className="mb-1.5 block text-sm font-medium text-slate-700">
                จังหวัด <span className="text-red-600">*</span>
              </label>
              <input
                id="field-province"
                type="text"
                list="thailand-provinces-list"
                required
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="เช่น เชียงใหม่"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <datalist id="thailand-provinces-list">
                {THAILAND_PROVINCES.map((p) => (
                  <option key={p.name} value={p.name} />
                ))}
              </datalist>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
            >
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-60 ${
                workType === 'assembly'
                  ? 'bg-blue-700 hover:bg-blue-800'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>บันทึกลงฐานข้อมูล Excel</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
