import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, TableProperties, MapPin, X } from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './components/HomePage.tsx';
import { ExcelDatabasePage } from './components/ExcelDatabasePage.tsx';
import { SummaryMapPage } from './components/SummaryMapPage.tsx';
import { RegistrationModal } from './components/RegistrationModal.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import { DuplicateAlertModal } from './components/DuplicateAlertModal.tsx';
import { exportRecordsToExcel } from './utils/excelExport.ts';
import type { AppPage, CreateTeamRecordInput, TeamRecord, WorkType } from './types.ts';

function parseFilenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^"]+)"?/i);
  return match?.[1] ? match[1] : fallback;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [records, setRecords] = useState<TeamRecord[]>([]);
  const [sourceRevision, setSourceRevision] = useState<number>(1);
  const [dataRevision, setDataRevision] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingSource, setIsDownloadingSource] = useState(false);
  const [isClearingRecords, setIsClearingRecords] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
  );
  const [isLoadingMapsConfig, setIsLoadingMapsConfig] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalWorkType, setModalWorkType] = useState<WorkType>('assembly');
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState<{
    open: boolean;
    duplicateBy: 'name' | 'phone' | 'both' | null;
  }>({ open: false, duplicateBy: null });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAdmin = Boolean(adminToken);

  useEffect(() => {
    const handleQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/revision')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sourceRevision?: number } | null) => {
        if (!cancelled && typeof data?.sourceRevision === 'number' && data.sourceRevision >= 1) {
          setSourceRevision(data.sourceRevision);
        }
      })
      .catch(() => {
        // Keep default revision if offline
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchMapsConfig = useCallback(async (token: string) => {
    setIsLoadingMapsConfig(true);
    try {
      const r = await fetch('/api/maps-config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = (await r.json()) as { apiKey?: string };
        if (data?.apiKey) {
          setMapsApiKey(data.apiKey.trim());
        }
      }
    } catch {
      // Ignore config fetch error
    } finally {
      setIsLoadingMapsConfig(false);
    }
  }, []);

  const loadAdminData = useCallback(
    async (token: string) => {
      setIsLoading(true);
      try {
        const recordsPromise = fetch('/api/records', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const mapsPromise = !import.meta.env.VITE_GOOGLE_MAPS_API_KEY
          ? fetchMapsConfig(token)
          : Promise.resolve();

        const [res] = await Promise.all([recordsPromise, mapsPromise]);
        if (res.status === 401) {
          setAdminToken(null);
          setCurrentPage('home');
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as {
            records?: TeamRecord[];
            sourceRevision?: number;
            dataRevision?: number;
          };
          if (Array.isArray(data.records)) {
            setRecords(data.records);
          }
          if (typeof data.sourceRevision === 'number') {
            setSourceRevision(data.sourceRevision);
          }
          if (typeof data.dataRevision === 'number') {
            setDataRevision(data.dataRevision);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMapsConfig]
  );

  useEffect(() => {
    if (adminToken) {
      void loadAdminData(adminToken);
    } else {
      setRecords([]);
      setCurrentPage('home');
    }
  }, [adminToken, loadAdminData]);

  useEffect(() => {
    if (adminToken && currentPage === 'map' && !mapsApiKey && !isLoadingMapsConfig) {
      void fetchMapsConfig(adminToken);
    }
  }, [adminToken, currentPage, mapsApiKey, isLoadingMapsConfig, fetchMapsConfig]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleNavigate = useCallback(
    (page: AppPage) => {
      if (page !== 'home' && !adminToken) {
        setAdminModalOpen(true);
        return;
      }
      setCurrentPage(page);
    },
    [adminToken]
  );

  const handleOpenModal = useCallback((workType: WorkType) => {
    setModalWorkType(workType);
    setModalOpen(true);
  }, []);

  const handleCreateRecord = useCallback(
    async (input: CreateTeamRecordInput) => {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (res.status === 409) {
        const dupData = (await res.json().catch(() => ({}))) as {
          error?: string;
          duplicateBy?: 'name' | 'phone' | 'both';
        };
        setDuplicateAlert({
          open: true,
          duplicateBy: dupData.duplicateBy ?? null,
        });
        throw new Error(dupData.error || 'มีข้อมูลนี้แล้ว');
      }

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      const data = (await res.json()) as {
        record?: TeamRecord;
        dataRevision?: number;
        summary?: { name: string };
      };
      if (typeof data.dataRevision === 'number') {
        setDataRevision(data.dataRevision);
      }
      if (adminToken && data.record) {
        setRecords((prev) => [data.record!, ...prev]);
      }
      const savedName = data.summary?.name || data.record?.name || input.name;
      setToastMessage(`บันทึกข้อมูลของ "${savedName}" เรียบร้อยแล้ว`);
    },
    [adminToken]
  );

  const handleUpdateRecord = useCallback(
    async (id: string, patch: Partial<TeamRecord>) => {
      if (!adminToken) return;
      const res = await fetch(`/api/records/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(patch),
      });

      if (res.status === 401) {
        setAdminToken(null);
        return;
      }
      if (res.status === 409) {
        setDuplicateAlert({ open: true, duplicateBy: null });
        return;
      }
      if (!res.ok) return;

      const data = (await res.json()) as { record: TeamRecord; dataRevision?: number };
      setRecords((prev) => prev.map((r) => (r.id === id ? data.record : r)));
      if (typeof data.dataRevision === 'number') {
        setDataRevision(data.dataRevision);
      }
    },
    [adminToken]
  );

  const handleDeleteRecord = useCallback(
    async (id: string) => {
      if (!adminToken) return;
      const res = await fetch(`/api/records/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res.status === 401) {
        setAdminToken(null);
        return;
      }
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { dataRevision?: number };
        setRecords((prev) => prev.filter((r) => r.id !== id));
        if (typeof data.dataRevision === 'number') {
          setDataRevision(data.dataRevision);
        }
      }
    },
    [adminToken]
  );

  const handleClearAllRecords = useCallback(async () => {
    if (!adminToken) return;
    setIsClearingRecords(true);
    try {
      const res = await fetch('/api/records', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res.status === 401) {
        setAdminToken(null);
        return;
      }
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { dataRevision?: number };
        setRecords([]);
        if (typeof data.dataRevision === 'number') {
          setDataRevision(data.dataRevision);
        }
        setToastMessage('ล้างข้อมูลเก่าทั้งหมดเรียบร้อยแล้ว พร้อมเริ่มต้นใช้งานใหม่');
      }
    } finally {
      setIsClearingRecords(false);
    }
  }, [adminToken]);

  const handleExportExcel = useCallback(() => {
    if (!adminToken || records.length === 0) return;
    void exportRecordsToExcel(records, dataRevision);
  }, [adminToken, records, dataRevision]);

  const handleDownloadSource = useCallback(async () => {
    if (!adminToken) return;
    setIsDownloadingSource(true);
    try {
      const res = await fetch('/api/admin/download-source', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res.status === 401) {
        setAdminToken(null);
        return;
      }
      if (!res.ok) {
        setToastMessage('ไม่สามารถดาวน์โหลดไฟล์ Source Code ได้');
        return;
      }

      const headerRev = Number(res.headers.get('X-Source-Revision'));
      const activeRev = Number.isFinite(headerRev) && headerRev > 0 ? headerRev : sourceRevision;
      setSourceRevision(activeRev);

      const filename = parseFilenameFromDisposition(
        res.headers.get('Content-Disposition'),
        `my-freelance-vercel-source-rev${activeRev}.zip`
      );

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToastMessage(`ดาวน์โหลด ${filename} เรียบร้อยแล้ว`);
    } catch {
      setToastMessage('เกิดข้อผิดพลาดระหว่างดาวน์โหลด Source Code');
    } finally {
      setIsDownloadingSource(false);
    }
  }, [adminToken, sourceRevision]);

  const handleAdminAuthenticated = useCallback((token: string) => {
    setAdminToken(token);
    setToastMessage('เข้าสู่ระบบ Admin สำเร็จ');
  }, []);

  const handleLogoutAdmin = useCallback(() => {
    setAdminToken(null);
    setCurrentPage('home');
    setToastMessage('ออกจากระบบ Admin แล้ว');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {quotaExceeded && (
        <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 shadow-sm md:text-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-950 underline hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar
        currentPage={currentPage}
        isAdmin={isAdmin}
        onNavigate={handleNavigate}
        onExportExcel={handleExportExcel}
        onOpenAdminLogin={() => setAdminModalOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
        recordCount={records.length}
      />

      {currentPage === 'home' && (
        <HomePage
          isAdmin={isAdmin}
          isDownloadingSource={isDownloadingSource}
          sourceRevision={sourceRevision}
          onSelectWorkType={handleOpenModal}
          onOpenAdminLogin={() => setAdminModalOpen(true)}
          onNavigate={handleNavigate}
          onDownloadSource={() => void handleDownloadSource()}
        />
      )}

      {isAdmin && currentPage === 'database' && (
        <ExcelDatabasePage
          records={records}
          isLoading={isLoading}
          isDownloadingSource={isDownloadingSource}
          isClearingRecords={isClearingRecords}
          sourceRevision={sourceRevision}
          dataRevision={dataRevision}
          onAddNew={handleOpenModal}
          onUpdateRecord={handleUpdateRecord}
          onDeleteRecord={handleDeleteRecord}
          onClearAllRecords={handleClearAllRecords}
          onDownloadSource={() => void handleDownloadSource()}
        />
      )}

      {isAdmin && currentPage === 'map' && (
        <SummaryMapPage
          records={records}
          apiKey={mapsApiKey}
          isLoadingApiKey={isLoadingMapsConfig}
          onRetryApiKey={() => {
            if (adminToken) {
              void fetchMapsConfig(adminToken);
            }
          }}
        />
      )}

      <RegistrationModal
        isOpen={modalOpen}
        initialWorkType={modalWorkType}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateRecord}
      />

      <AdminLoginModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onAuthenticated={handleAdminAuthenticated}
      />

      <DuplicateAlertModal
        isOpen={duplicateAlert.open}
        duplicateBy={duplicateAlert.duplicateBy}
        onClose={() => setDuplicateAlert({ open: false, duplicateBy: null })}
      />

      {/* Save Confirmation Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex max-w-md items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-lg"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">{toastMessage}</p>
            {isAdmin && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage('database');
                    setToastMessage(null);
                  }}
                  className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <TableProperties className="h-3.5 w-3.5" />
                  <span>เปิดฐานข้อมูล Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage('map');
                    setToastMessage(null);
                  }}
                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 cursor-pointer"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>เปิดแผนที่สรุปจำนวน</span>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="ปิดการแจ้งเตือน"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
