# EV Care - โปรแกรมแจ้งซ่อมรถไฟฟ้าออนไลน์ (v1.4.13)

ระบบแจ้งซ่อมรถไฟฟ้าออนไลน์แบบเรียลไทม์ รองรับมือถือและเดสก์ท็อป พร้อมระบบเสียงพูดแนะนำภาษาไทย หน้าจอ Booting หน้าช่าง หน้า Admin สร้างลิงก์สาขา ดาวน์โหลด Source Code และตารางประวัติสไตล์ Excel

## รายการไฟล์และโฟลเดอร์ทั้งหมดสำหรับอัปโหลดขึ้น GitHub
> หมายเหตุ: สำหรับการอัปโหลดขึ้น GitHub ผ่านมือถือ **ห้ามอัปโหลดโฟลเดอร์ `node_modules/`, `dist/`, `data/`** และไฟล์ที่เตรียมให้ไม่มีไฟล์ `.html` เพิ่มเติมให้เกิดปัญหาระหว่างอัปโหลด (มีเฉพาะไฟล์ `index.html` หลักของ Vite เท่านั้น)

- `.env.example` — ตัวอย่างตัวแปรสภาพแวดล้อม
- `.gitignore` — กำหนดไฟล์ที่ไม่ต้องอัปโหลด (`node_modules/`, `dist/`, `data/`)
- `index.html` — หน้า HTML หลักของแอป Vite
- `metadata.json` — ข้อมูลชื่อและคำอธิบายแอป
- `package.json` — รายการแพ็กเกจและสคริปต์ (`dev`, `build`, `start`)
- `README.md` — คู่มือและรายการตรวจสอบไฟล์ครบชุด
- `server.ts` — Backend Express + WebSocket + บันทึกข้อมูลถาวร
- `tsconfig.json` — การตั้งค่า TypeScript
- `vercel.json` — การตั้งค่า Route สำหรับ Vercel
- `vite.config.ts` — การตั้งค่า Vite + Tailwind CSS
- `src/`
  - `App.tsx`
  - `index.css`
  - `main.tsx`
  - `assets/images/` (รูป 3D การ์ตูนรถไฟฟ้าทั้ง 4 ชนิด)
  - `components/`
    - `ActiveTicketStatus.tsx`
    - `AdminDashboard.tsx`
    - `AuthGateModal.tsx`
    - `BootScreen.tsx`
    - `BranchManagerPanel.tsx`
    - `ExcelHistoryTable.tsx`
    - `InkRipple.tsx`
    - `RepairDetailsModal.tsx`
    - `SourceExportPanel.tsx`
    - `Status3DIcon.tsx`
    - `TechnicianSettingsPanel.tsx`
    - `VehicleSelectorModal.tsx`
  - `constants/`
    - `vehicles.ts`
    - `version.ts`
  - `hooks/`
    - `useRepairSocket.ts`
  - `types/`
    - `repair.ts`
  - `utils/`
    - `apiClient.ts`
    - `notifications.ts`
    - `voice.ts`

## วิธีอัปโหลดขึ้น GitHub ผ่านมือถือไม่ให้เกิด Error
1. สร้าง Repository ใหม่บน GitHub (ยังไม่ต้องกดสร้าง README หรือไฟล์ใดๆ ล่วงหน้าในเว็บ)
2. หากอัปโหลดผ่านเว็บ GitHub บนมือถือ ให้บีบอัดหรือเลือกเฉพาะไฟล์ด้านบน (ไม่รวม `node_modules/`, `dist/`, `data/`) หรือใช้แอป Git บนมือถือ (เช่น Working Copy / Termux / GitHub Mobile)
3. หลังจาก Push ขึ้น GitHub แล้ว สามารถรันคำสั่งติดตั้งและเปิดใช้งานได้ทันที:
   - `npm install`
   - `npm run build`
   - `npm run start`
