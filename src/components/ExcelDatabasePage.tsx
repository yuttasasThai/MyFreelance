import { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Check,
  X,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import type { TeamRecord, WorkType } from '../types.ts';
import { exportRecordsToCsv, exportRecordsToExcel } from '../utils/excelExport.ts';

interface ExcelDatabasePageProps {
  records: TeamRecord[];
  isLoading: boolean;
  isDownloadingSource: boolean;
  isClearingRecords: boolean;
  sourceRevision: number;
  dataRevision: number;
  onAddNew: (workType: WorkType) => void;
  onUpdateRecord: (id: string, patch: Partial<TeamRecord>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onClearAllRecords: () => Promise<void>;
  onDownloadSource: () => void;
}

type EditableField = 'workType' | 'name' | 'phone' | 'subdistrict' | 'district' | 'province';

const COLUMN_LETTERS: Record<EditableField | 'createdAt' | 'actions', string> = {
  workType: 'A',
  name: 'B',
  phone: 'C',
  subdistrict: 'D',
  district: 'E',
  province: 'F',
  createdAt: 'G',
  actions: 'H',
};

export function ExcelDatabasePage({
  records,
  isLoading,
  isDownloadingSource,
  isClearingRecords,
  sourceRevision,
  dataRevision,
  onAddNew,
  onUpdateRecord,
  onDeleteRecord,
  onClearAllRecords,
  onDownloadSource,
}: ExcelDatabasePageProps) {
  const [filterType, setFilterType] = useState<'all' | WorkType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<{
    ref: string;
    value: string;
  }>({ ref: 'A1', value: 'ฐานข้อมูลทีมงานอิสระ' });

  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: EditableField;
    value: string;
  } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((rec) => {
      if (filterType !== 'all' && rec.workType !== filterType) return false;
      if (!q) return true;
      const workLabel = rec.workType === 'assembly' ? 'งานประกอบสินค้า' : 'งานขายสินค้า';
      return (
        rec.name.toLowerCase().includes(q) ||
        rec.phone.toLowerCase().includes(q) ||
        rec.subdistrict.toLowerCase().includes(q) ||
        rec.district.toLowerCase().includes(q) ||
        rec.province.toLowerCase().includes(q) ||
        workLabel.includes(q)
      );
    });
  }, [records, filterType, searchQuery]);

  const assemblyCount = filteredRecords.filter((r) => r.workType === 'assembly').length;
  const salesCount = filteredRecords.filter((r) => r.workType === 'sales').length;

  const startEdit = (rowIndex: number, rec: TeamRecord, field: EditableField) => {
    const currentValue = rec[field];
    const colLetter = COLUMN_LETTERS[field];
    setSelectedCell({
      ref: `${colLetter}${rowIndex + 1}`,
      value:
        field === 'workType'
          ? rec.workType === 'assembly'
            ? 'งานประกอบสินค้า'
            : 'งานขายสินค้า'
          : currentValue,
    });
    setEditingCell({ id: rec.id, field, value: currentValue });
  };

  const commitEdit = async () => {
    if (!editingCell) return;
    const { id, field, value } = editingCell;
    const target = records.find((r) => r.id === id);
    if (!target || target[field] === value.trim() || !value.trim()) {
      setEditingCell(null);
      return;
    }

    setSavingId(id);
    try {
      await onUpdateRecord(id, { [field]: value.trim() });
    } finally {
      setSavingId(null);
      setEditingCell(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteRecord(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmClear = async () => {
    await onClearAllRecords();
    setConfirmClearOpen(false);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Page Title & Primary Excel Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium text-slate-500">หน้า 2 · ฐานข้อมูลตาราง (Admin)</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            ฐานข้อมูลตาราง Excel
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            คลิกที่ช่องข้อมูลเพื่อแก้ไขได้ทันที บันทึกเป็นไฟล์ Excel (.xlsx) หรือล้างข้อมูลเก่าเพื่อเริ่มต้นใหม่
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            disabled={records.length === 0 || isClearingRecords}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-700 whitespace-nowrap hover:bg-red-50 disabled:opacity-40 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Clear ข้อมูลเก่า</span>
          </button>

          <button
            type="button"
            onClick={onDownloadSource}
            disabled={isDownloadingSource}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50 disabled:opacity-50 cursor-pointer tabular-nums"
          >
            <Download className="h-4 w-4" />
            <span>
              {isDownloadingSource
                ? 'กำลังเตรียม ZIP...'
                : `ดาวน์โหลด Source Code (rev${sourceRevision})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onAddNew('assembly')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มข้อมูล</span>
          </button>

          <button
            type="button"
            onClick={() => exportRecordsToCsv(filteredRecords, dataRevision)}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => void exportRecordsToExcel(filteredRecords, dataRevision)}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shadow-xs hover:bg-emerald-800 disabled:opacity-40 cursor-pointer tabular-nums"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>บันทึกลง Excel (rev{dataRevision})</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 self-start">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ทั้งหมด ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('assembly')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filterType === 'assembly'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            งานประกอบสินค้า ({records.filter((r) => r.workType === 'assembly').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('sales')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filterType === 'sales'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            งานขายสินค้า ({records.filter((r) => r.workType === 'sales').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, เบอร์โทร, จังหวัด..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
      </div>

      {/* Excel Workbook Shell */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs">
        {/* Excel Formula Bar */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <div className="w-14 shrink-0 border-r border-slate-300 pr-2 text-center font-mono font-semibold text-slate-700">
            {selectedCell.ref}
          </div>
          <div className="px-2.5 font-mono italic text-slate-400 select-none">fx</div>
          <div className="truncate font-mono text-slate-700">{selectedCell.value}</div>
        </div>

        {/* Excel Spreadsheet Grid */}
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <FileSpreadsheet className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-800">
              {records.length === 0 ? 'ยังไม่มีข้อมูลในตาราง Excel' : 'ไม่พบข้อมูลที่ตรงกับคำค้นหา'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {records.length === 0
                ? 'พร้อมเริ่มต้นใช้งาน ข้อมูลที่ผู้ใช้กรอกเข้ามาจะแสดงในตารางนี้โดยอัตโนมัติ'
                : 'ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น'}
            </p>
            {records.length === 0 && (
              <button
                type="button"
                onClick={() => onAddNew('assembly')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มรายการแรก</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-mono font-semibold text-slate-500 select-none">
                  <th className="w-11 border-r border-slate-300 bg-slate-200/70 px-2 py-1 text-center" />
                  <th className="border-r border-slate-300 px-3 py-1 text-center">A</th>
                  <th className="border-r border-slate-300 px-3 py-1 text-center">B</th>
                  <th className="border-r border-slate-300 px-3 py-1 text-center">C</th>
                  <th className="border-r border-slate-300 px-3 py-1 text-center">D</th>
                  <th className="border-r border-slate-300 px-3 py-1 text-center">E</th>
                  <th className="border-r border-slate-300 px-3 py-1 text-center">F</th>
                  <th className="border-r border-slate-300 px-3 py-1 text-center">G</th>
                  <th className="px-3 py-1 text-center">H</th>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700">
                  <th className="w-11 border-r border-slate-300 bg-slate-100 px-2 py-2.5 text-center font-mono text-slate-500">
                    #
                  </th>
                  <th className="border-r border-slate-200 px-3 py-2.5 whitespace-nowrap">ประเภทงาน</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 whitespace-nowrap">ชื่อ</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 whitespace-nowrap">เบอร์โทร</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 whitespace-nowrap">ตำบล</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 whitespace-nowrap">อำเภอ</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 whitespace-nowrap">จังหวัด</th>
                  <th className="border-r border-slate-200 px-3 py-2.5 whitespace-nowrap">วันที่บันทึก</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.map((rec, idx) => {
                  const isRowSaving = savingId === rec.id;
                  const isRowDeleting = deletingId === rec.id;

                  const renderEditableCell = (
                    field: EditableField,
                    displayValue: string,
                    extraClass = ''
                  ) => {
                    const isEditing = editingCell?.id === rec.id && editingCell?.field === field;

                    if (isEditing) {
                      if (field === 'workType') {
                        return (
                          <div className="flex items-center gap-1">
                            <select
                              autoFocus
                              value={editingCell.value}
                              onChange={async (e) => {
                                const nextVal = e.target.value as WorkType;
                                setEditingCell(null);
                                if (nextVal !== rec.workType) {
                                  setSavingId(rec.id);
                                  try {
                                    await onUpdateRecord(rec.id, { workType: nextVal });
                                  } finally {
                                    setSavingId(null);
                                  }
                                }
                              }}
                              onBlur={() => setEditingCell(null)}
                              className="w-full rounded border border-blue-600 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none"
                            >
                              <option value="assembly">งานประกอบสินค้า</option>
                              <option value="sales">งานขายสินค้า</option>
                            </select>
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="text"
                            value={editingCell.value}
                            onChange={(e) =>
                              setEditingCell({ ...editingCell, value: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void commitEdit();
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            onBlur={() => void commitEdit()}
                            className="w-full min-w-[90px] rounded border border-blue-600 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              void commitEdit();
                            }}
                            aria-label="บันทึก"
                            className="rounded p-1 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setEditingCell(null);
                            }}
                            aria-label="ยกเลิก"
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => startEdit(idx, rec, field)}
                        title="คลิกเพื่อแก้ไขช่องนี้"
                        className={`w-full text-left cursor-text hover:underline hover:decoration-slate-300 ${extraClass}`}
                      >
                        {displayValue}
                      </button>
                    );
                  };

                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        isRowSaving || isRowDeleting ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="border-r border-slate-300 bg-slate-100/80 px-2 py-2.5 text-center font-mono text-xs text-slate-500 tabular-nums select-none">
                        {idx + 1}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2.5 whitespace-nowrap">
                        {renderEditableCell(
                          'workType',
                          rec.workType === 'assembly' ? 'งานประกอบสินค้า' : 'งานขายสินค้า',
                          `font-medium text-xs ${
                            rec.workType === 'assembly' ? 'text-blue-700' : 'text-emerald-700'
                          }`
                        )}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2.5 text-slate-900">
                        {renderEditableCell('name', rec.name)}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2.5 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {renderEditableCell('phone', rec.phone)}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2.5 text-slate-700">
                        {renderEditableCell('subdistrict', rec.subdistrict)}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2.5 text-slate-700">
                        {renderEditableCell('district', rec.district)}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2.5 text-slate-700">
                        {renderEditableCell('province', rec.province)}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2.5 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDate(rec.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => void handleDelete(rec.id)}
                          disabled={isRowDeleting}
                          aria-label={`ลบข้อมูลของ ${rec.name}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Excel Sheet Status Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-300 bg-slate-100 px-4 py-2 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span className="rounded-t border border-b-0 border-slate-300 bg-white px-3 py-1 font-medium text-emerald-800">
              ชีต 1: ฐานข้อมูลทีมงานอิสระ
            </span>
            <span className="font-mono tabular-nums">
              แถวทั้งหมด: {filteredRecords.length}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums">
            <span className="text-blue-700">ประกอบ: {assemblyCount}</span>
            <span className="text-emerald-700">ขาย: {salesCount}</span>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="clear-confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isClearingRecords) {
              setConfirmClearOpen(false);
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 id="clear-confirm-title" className="text-base font-bold text-slate-900">
                  ยืนยัน Clear ข้อมูลเก่า
                </h2>
                <p className="text-xs text-slate-500">ลบข้อมูลทั้งหมดเพื่อเริ่มต้นใช้งานใหม่</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              ข้อมูลทั้งหมดในตาราง Excel ({records.length} รายการ) และหมุดบนแผนที่จะถูกลบออกทั้งหมด
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                disabled={isClearingRecords}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmClear()}
                disabled={isClearingRecords}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isClearingRecords ? 'กำลังล้างข้อมูล...' : 'ยืนยันลบข้อมูลทั้งหมด'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
