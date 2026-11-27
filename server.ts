import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import { createServer } from 'http';
import JSZip from 'jszip';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  BranchLink,
  CreateBranchPayload,
  CreateRepairPayload,
  PublicShopInfo,
  RepairStatus,
  RepairTicket,
  ServerWsEvent,
  TechnicianSettingsPayload,
  UpdateBranchPayload,
  UpdateRepairPayload,
  VehicleTypeId,
} from './src/types/repair.ts';
import { REPAIR_STATUS_STEPS, VEHICLE_LABELS } from './src/types/repair.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '0992256601';
const DATA_DIR = path.resolve(__dirname, 'data');
const REPAIRS_FILE = path.join(DATA_DIR, 'repairs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'tech_settings.json');
const BRANCHES_FILE = path.join(DATA_DIR, 'branches.json');

interface StoredTechSettings {
  branchCode: string;
  technicianName: string;
  technicianPhone: string;
  passcode: string;
}

const DEFAULT_MAIN_SETTINGS: StoredTechSettings = {
  branchCode: 'main',
  technicianName: 'สมชาย',
  technicianPhone: '080-000-0000',
  passcode: '1234',
};

const VALID_STATUSES = new Set<RepairStatus>(REPAIR_STATUS_STEPS.map((s) => s.id));
const VALID_VEHICLES = new Set<VehicleTypeId>(['ebike', 'etrike', 'emoto', 'eother']);

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

let repairsStore: RepairTicket[] = readJsonFile<RepairTicket[]>(REPAIRS_FILE, []);
let settingsStore: Record<string, StoredTechSettings> = readJsonFile<
  Record<string, StoredTechSettings>
>(SETTINGS_FILE, { main: DEFAULT_MAIN_SETTINGS });
if (!settingsStore.main) {
  settingsStore.main = { ...DEFAULT_MAIN_SETTINGS };
  writeJsonFile(SETTINGS_FILE, settingsStore);
}
let branchesStore: BranchLink[] = readJsonFile<BranchLink[]>(BRANCHES_FILE, []);

// Migrate older repair records cleanly if missing branchCode
repairsStore = repairsStore.map((r) => ({
  ...r,
  branchCode: r.branchCode || 'main',
  branchName: r.branchName || 'สาขาหลัก',
}));

const adminTokens = new Set<string>();
const techTokenMap = new Map<string, string>(); // token -> branchCode

function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function generateTicketCode(existing: RepairTicket[]): string {
  const num = existing.length + 1;
  const datePart = new Date().toISOString().slice(2, 7).replace('-', '');
  return `EV-${datePart}-${String(num).padStart(3, '0')}`;
}

function generateBranchCode(existing: BranchLink[]): string {
  let code = '';
  do {
    const rand = Math.floor(1000 + Math.random() * 9000);
    code = `BR-${rand}`;
  } while (existing.some((b) => b.code === code));
  return code;
}

function isBranchExpired(branch: BranchLink): boolean {
  if (!branch.isActive) return true;
  const exp = Date.parse(branch.expiresAt);
  if (Number.isNaN(exp)) return true;
  return Date.now() > exp;
}

function getShopInfoForBranch(rawCode?: string): PublicShopInfo {
  const code = (rawCode || 'main').trim() || 'main';
  if (code === 'main') {
    const s = settingsStore.main || DEFAULT_MAIN_SETTINGS;
    return {
      branchCode: 'main',
      branchName: 'สาขาหลัก',
      technicianName: s.technicianName,
      technicianPhone: s.technicianPhone,
      isExpired: false,
      isNotFound: false,
      expiresAt: null,
    };
  }

  const branch = branchesStore.find((b) => b.code === code);
  if (!branch) {
    return {
      branchCode: code,
      branchName: 'ไม่พบสาขา',
      technicianName: DEFAULT_MAIN_SETTINGS.technicianName,
      technicianPhone: DEFAULT_MAIN_SETTINGS.technicianPhone,
      isExpired: true,
      isNotFound: true,
      expiresAt: null,
    };
  }

  const branchSettings = settingsStore[branch.code];
  return {
    branchCode: branch.code,
    branchName: branch.branchName,
    technicianName: branchSettings?.technicianName || branch.technicianName || 'ช่างประจำสาขา',
    technicianPhone: branchSettings?.technicianPhone || branch.technicianPhone || '',
    isExpired: isBranchExpired(branch),
    isNotFound: false,
    expiresAt: branch.expiresAt,
  };
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = String(req.headers['x-admin-token'] || '');
  if (!token || !adminTokens.has(token)) {
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ Admin ก่อนใช้งาน' });
    return;
  }
  next();
}

function requireTechOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminToken = String(req.headers['x-admin-token'] || '');
  if (adminToken && adminTokens.has(adminToken)) {
    next();
    return;
  }
  const techToken = String(req.headers['x-tech-token'] || '');
  if (techToken && techTokenMap.has(techToken)) {
    next();
    return;
  }
  res.status(401).json({ error: 'กรุณาเข้าสู่ระบบสำหรับช่างก่อนใช้งาน' });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  function broadcast(event: ServerWsEvent): void {
    const payload = JSON.stringify(event);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  wss.on('connection', (ws) => {
    const initPayload: ServerWsEvent = {
      type: 'init',
      repairs: repairsStore,
    };
    ws.send(JSON.stringify(initPayload));
  });

  // Health check for Express backend detection
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, engine: 'express' });
  });

  // Public Shop / Branch Info (for TTS technician name, phone button, and branch expiry status)
  app.get('/api/shop-info', (req, res) => {
    const branchCode = typeof req.query.branch === 'string' ? req.query.branch : 'main';
    res.json({ shop: getShopInfoForBranch(branchCode) });
  });

  // Admin Login
  app.post('/api/auth/admin', (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode || passcode !== ADMIN_PASSCODE) {
      res.status(401).json({ error: 'รหัสผ่าน Admin ไม่ถูกต้อง' });
      return;
    }
    const token = generateToken();
    adminTokens.add(token);
    res.json({ ok: true, token });
  });

  // Technician Login (Main shop passcode OR Branch username + password)
  app.post('/api/auth/technician', (req, res) => {
    const branchCode =
      typeof req.body?.branchCode === 'string' && req.body.branchCode.trim()
        ? req.body.branchCode.trim()
        : 'main';
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';

    if (branchCode === 'main') {
      const mainSettings = settingsStore.main || DEFAULT_MAIN_SETTINGS;
      if (!passcode || passcode !== mainSettings.passcode) {
        res.status(401).json({ error: 'รหัสผ่านช่างไม่ถูกต้อง' });
        return;
      }
      const token = generateToken();
      techTokenMap.set(token, 'main');
      res.json({
        ok: true,
        token,
        shop: getShopInfoForBranch('main'),
      });
      return;
    }

    const branch = branchesStore.find((b) => b.code === branchCode);
    if (!branch) {
      res.status(404).json({ error: 'ไม่พบข้อมูลสาขานี้' });
      return;
    }
    if (isBranchExpired(branch)) {
      res.status(403).json({ error: 'ลิงก์สาขานี้หมดอายุแล้ว กรุณาติดต่อ Admin' });
      return;
    }

    const branchSettings = settingsStore[branch.code];
    const expectedPass = branchSettings?.passcode || branch.password;
    if (!username || username !== branch.username || !passcode || passcode !== expectedPass) {
      res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านสาขาไม่ถูกต้อง' });
      return;
    }

    const token = generateToken();
    techTokenMap.set(token, branch.code);
    res.json({
      ok: true,
      token,
      shop: getShopInfoForBranch(branch.code),
    });
  });

  // Technician Settings GET & PATCH
  app.get('/api/technician/settings', requireTechOrAdmin, (req, res) => {
    const branchCode =
      typeof req.query.branch === 'string' && req.query.branch.trim()
        ? req.query.branch.trim()
        : 'main';
    const info = getShopInfoForBranch(branchCode);
    res.json({
      settings: {
        branchCode: info.branchCode,
        branchName: info.branchName,
        technicianName: info.technicianName,
        technicianPhone: info.technicianPhone,
      },
    });
  });

  app.patch('/api/technician/settings', requireTechOrAdmin, (req, res) => {
    const body = req.body as Partial<TechnicianSettingsPayload>;
    const branchCode =
      typeof body.branchCode === 'string' && body.branchCode.trim()
        ? body.branchCode.trim()
        : 'main';

    const adminToken = String(req.headers['x-admin-token'] || '');
    const techToken = String(req.headers['x-tech-token'] || '');
    const isAdmin = Boolean(adminToken && adminTokens.has(adminToken));
    const techBranch = techTokenMap.get(techToken);

    if (!isAdmin && techBranch !== branchCode) {
      res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขการตั้งค่าของสาขานี้' });
      return;
    }

    const techName = typeof body.technicianName === 'string' ? body.technicianName.trim() : '';
    const techPhone = typeof body.technicianPhone === 'string' ? body.technicianPhone.trim() : '';
    const newPass = typeof body.newPasscode === 'string' ? body.newPasscode.trim() : '';

    if (!techName) {
      res.status(400).json({ error: 'กรุณาระบุชื่อช่าง' });
      return;
    }
    if (!techPhone) {
      res.status(400).json({ error: 'กรุณาระบุเบอร์โทรช่าง' });
      return;
    }

    const existing = settingsStore[branchCode] || {
      branchCode,
      technicianName: techName,
      technicianPhone: techPhone,
      passcode:
        branchCode === 'main'
          ? DEFAULT_MAIN_SETTINGS.passcode
          : branchesStore.find((b) => b.code === branchCode)?.password || '1234',
    };

    const updatedPass = newPass.length >= 4 ? newPass : existing.passcode;
    settingsStore[branchCode] = {
      branchCode,
      technicianName: techName.slice(0, 60),
      technicianPhone: techPhone.slice(0, 30),
      passcode: updatedPass,
    };
    writeJsonFile(SETTINGS_FILE, settingsStore);

    // Keep branch record synced too if branchCode !== 'main'
    if (branchCode !== 'main') {
      const bIdx = branchesStore.findIndex((b) => b.code === branchCode);
      if (bIdx !== -1) {
        branchesStore[bIdx] = {
          ...branchesStore[bIdx],
          technicianName: techName.slice(0, 60),
          technicianPhone: techPhone.slice(0, 30),
          password: updatedPass,
          updatedAt: new Date().toISOString(),
        };
        writeJsonFile(BRANCHES_FILE, branchesStore);
      }
    }

    broadcast({
      type: 'shop:updated',
      branchCode,
      technicianName: settingsStore[branchCode].technicianName,
      technicianPhone: settingsStore[branchCode].technicianPhone,
    });

    res.json({
      ok: true,
      shop: getShopInfoForBranch(branchCode),
    });
  });

  // REST API: List repairs (optionally filtered by branch)
  app.get('/api/repairs', (req, res) => {
    const branch = typeof req.query.branch === 'string' ? req.query.branch.trim() : '';
    if (branch) {
      res.json({ repairs: repairsStore.filter((r) => r.branchCode === branch) });
      return;
    }
    res.json({ repairs: repairsStore });
  });

  // REST API: Get single repair ticket
  app.get('/api/repairs/:id', (req, res) => {
    const found = repairsStore.find((r) => r.id === req.params.id);
    if (!found) {
      res.status(404).json({ error: 'ไม่พบข้อมูลรายการแจ้งซ่อม' });
      return;
    }
    res.json({ repair: found });
  });

  // REST API: Create repair ticket
  app.post('/api/repairs', (req, res) => {
    const body = req.body as Partial<CreateRepairPayload>;
    const branchCode =
      typeof body.branchCode === 'string' && body.branchCode.trim()
        ? body.branchCode.trim()
        : 'main';

    const shopInfo = getShopInfoForBranch(branchCode);
    if (branchCode !== 'main' && (shopInfo.isNotFound || shopInfo.isExpired)) {
      res.status(403).json({ error: 'ลิงก์สาขานี้หมดอายุหรือไม่พร้อมใช้งาน' });
      return;
    }

    const vehicleType = body.vehicleType;
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const issue = typeof body.issue === 'string' ? body.issue.trim() : '';

    if (!vehicleType || !VALID_VEHICLES.has(vehicleType)) {
      res.status(400).json({ error: 'กรุณาเลือกชนิดรถไฟฟ้าให้ถูกต้อง' });
      return;
    }
    if (!customerName || !phone || !issue) {
      res.status(400).json({ error: 'กรุณากรอกชื่อ เบอร์โทร และอาการคร่าวๆ ให้ครบถ้วน' });
      return;
    }

    const lat = typeof body.location?.lat === 'number' ? body.location.lat : 13.7563;
    const lng = typeof body.location?.lng === 'number' ? body.location.lng : 100.5018;
    const addressNote =
      typeof body.location?.addressNote === 'string' ? body.location.addressNote.trim() : '';
    const source = body.location?.source === 'gps' ? 'gps' : 'manual';

    const now = new Date().toISOString();
    const newRepair: RepairTicket = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: generateTicketCode(repairsStore),
      branchCode: shopInfo.branchCode,
      branchName: shopInfo.branchName,
      vehicleType,
      vehicleLabel: VEHICLE_LABELS[vehicleType],
      customerName: customerName.slice(0, 100),
      phone: phone.slice(0, 30),
      issue: issue.slice(0, 500),
      location: {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        addressNote: addressNote.slice(0, 240),
        source,
      },
      status: 'pending',
      technicianNote: '',
      estimatedCost: '',
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: 'pending',
          timestamp: now,
          note: 'ลูกค้าส่งคำขอแจ้งซ่อมเข้าระบบ',
        },
      ],
    };

    repairsStore = [newRepair, ...repairsStore];
    writeJsonFile(REPAIRS_FILE, repairsStore);
    broadcast({ type: 'repair:created', repair: newRepair });

    res.status(201).json({ repair: newRepair });
  });

  // REST API: Update repair status / technician note
  app.patch('/api/repairs/:id', requireTechOrAdmin, (req, res) => {
    const idx = repairsStore.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบรายการแจ้งซ่อมที่ต้องการอัปเดต' });
      return;
    }

    const current = repairsStore[idx];
    const body = req.body as UpdateRepairPayload;
    const now = new Date().toISOString();

    let nextStatus = current.status;
    const nextHistory = [...current.statusHistory];

    if (body.status && VALID_STATUSES.has(body.status)) {
      nextStatus = body.status;
      if (body.status !== current.status) {
        const stepMeta = REPAIR_STATUS_STEPS.find((s) => s.id === body.status);
        nextHistory.push({
          status: body.status,
          timestamp: now,
          note:
            typeof body.technicianNote === 'string' && body.technicianNote.trim()
              ? body.technicianNote.trim()
              : stepMeta?.label,
        });
      }
    }

    const updated: RepairTicket = {
      ...current,
      status: nextStatus,
      technicianNote:
        typeof body.technicianNote === 'string'
          ? body.technicianNote.trim().slice(0, 300)
          : current.technicianNote,
      estimatedCost:
        typeof body.estimatedCost === 'string'
          ? body.estimatedCost.trim().slice(0, 40)
          : current.estimatedCost,
      updatedAt: now,
      statusHistory: nextHistory,
    };

    repairsStore[idx] = updated;
    writeJsonFile(REPAIRS_FILE, repairsStore);
    broadcast({ type: 'repair:updated', repair: updated });

    res.json({ repair: updated });
  });

  // REST API: Delete repair ticket
  app.delete('/api/repairs/:id', requireTechOrAdmin, (req, res) => {
    const exists = repairsStore.some((r) => r.id === req.params.id);
    if (!exists) {
      res.status(404).json({ error: 'ไม่พบรายการแจ้งซ่อม' });
      return;
    }
    repairsStore = repairsStore.filter((r) => r.id !== req.params.id);
    writeJsonFile(REPAIRS_FILE, repairsStore);
    broadcast({ type: 'repair:deleted', id: req.params.id });
    res.json({ ok: true });
  });

  // Admin Branch Links Management (strictly Admin only)
  app.get('/api/admin/branches', requireAdmin, (_req, res) => {
    res.json({ branches: branchesStore });
  });

  app.post('/api/admin/branches', requireAdmin, (req, res) => {
    const body = req.body as Partial<CreateBranchPayload>;
    const branchName = typeof body.branchName === 'string' ? body.branchName.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';
    const technicianName =
      typeof body.technicianName === 'string' && body.technicianName.trim()
        ? body.technicianName.trim()
        : branchName || 'ช่างสาขา';
    const technicianPhone =
      typeof body.technicianPhone === 'string' && body.technicianPhone.trim()
        ? body.technicianPhone.trim()
        : '080-000-0000';
    const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : '';

    if (!branchName || !username || !password || !expiresAt) {
      res.status(400).json({ error: 'กรุณากรอกชื่อสาขา User รหัสผ่าน และวันหมดอายุให้ครบถ้วน' });
      return;
    }

    const parsedExp = Date.parse(expiresAt);
    if (Number.isNaN(parsedExp)) {
      res.status(400).json({ error: 'รูปแบบวันหมดอายุไม่ถูกต้อง' });
      return;
    }

    const now = new Date().toISOString();
    const code = generateBranchCode(branchesStore);
    const newBranch: BranchLink = {
      id: `br_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code,
      branchName: branchName.slice(0, 80),
      username: username.slice(0, 40),
      password: password.slice(0, 40),
      technicianName: technicianName.slice(0, 60),
      technicianPhone: technicianPhone.slice(0, 30),
      expiresAt: new Date(parsedExp).toISOString(),
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    branchesStore = [newBranch, ...branchesStore];
    writeJsonFile(BRANCHES_FILE, branchesStore);

    settingsStore[code] = {
      branchCode: code,
      technicianName: newBranch.technicianName,
      technicianPhone: newBranch.technicianPhone,
      passcode: newBranch.password,
    };
    writeJsonFile(SETTINGS_FILE, settingsStore);

    broadcast({ type: 'branch:updated', branch: newBranch });
    res.status(201).json({ branch: newBranch });
  });

  app.patch('/api/admin/branches/:id', requireAdmin, (req, res) => {
    const idx = branchesStore.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลสาขานี้' });
      return;
    }
    const current = branchesStore[idx];
    const body = req.body as UpdateBranchPayload;
    const now = new Date().toISOString();

    let nextExpiresAt = current.expiresAt;
    if (typeof body.expiresAt === 'string' && body.expiresAt.trim()) {
      const parsed = Date.parse(body.expiresAt);
      if (Number.isNaN(parsed)) {
        res.status(400).json({ error: 'วันหมดอายุไม่ถูกต้อง' });
        return;
      }
      nextExpiresAt = new Date(parsed).toISOString();
    }

    const updated: BranchLink = {
      ...current,
      branchName:
        typeof body.branchName === 'string' && body.branchName.trim()
          ? body.branchName.trim().slice(0, 80)
          : current.branchName,
      username:
        typeof body.username === 'string' && body.username.trim()
          ? body.username.trim().slice(0, 40)
          : current.username,
      password:
        typeof body.password === 'string' && body.password.trim()
          ? body.password.trim().slice(0, 40)
          : current.password,
      technicianName:
        typeof body.technicianName === 'string' && body.technicianName.trim()
          ? body.technicianName.trim().slice(0, 60)
          : current.technicianName,
      technicianPhone:
        typeof body.technicianPhone === 'string' && body.technicianPhone.trim()
          ? body.technicianPhone.trim().slice(0, 30)
          : current.technicianPhone,
      expiresAt: nextExpiresAt,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : current.isActive,
      updatedAt: now,
    };

    branchesStore[idx] = updated;
    writeJsonFile(BRANCHES_FILE, branchesStore);

    settingsStore[updated.code] = {
      branchCode: updated.code,
      technicianName: updated.technicianName,
      technicianPhone: updated.technicianPhone,
      passcode: updated.password,
    };
    writeJsonFile(SETTINGS_FILE, settingsStore);

    broadcast({ type: 'branch:updated', branch: updated });
    broadcast({
      type: 'shop:updated',
      branchCode: updated.code,
      technicianName: updated.technicianName,
      technicianPhone: updated.technicianPhone,
    });

    res.json({ branch: updated });
  });

  app.delete('/api/admin/branches/:id', requireAdmin, (req, res) => {
    const target = branchesStore.find((b) => b.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'ไม่พบข้อมูลสาขานี้' });
      return;
    }
    branchesStore = branchesStore.filter((b) => b.id !== req.params.id);
    writeJsonFile(BRANCHES_FILE, branchesStore);
    delete settingsStore[target.code];
    writeJsonFile(SETTINGS_FILE, settingsStore);

    broadcast({ type: 'branch:deleted', id: req.params.id });
    res.json({ ok: true });
  });

  // Admin Source Code Export Endpoints (GitHub-ready, excludes node_modules/dist/data/.env)
  const EXCLUDED_DIRS = new Set([
    'node_modules',
    'dist',
    'build',
    'coverage',
    'data',
    '.git',
    '.gmp_cache',
    '.aistudio',
  ]);

  function collectSourceFiles(currentDir = __dirname, relPrefix = ''): Array<{ path: string; size: number }> {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const collected: Array<{ path: string; size: number }> = [];

    for (const entry of entries) {
      if (entry.name === '.DS_Store' || entry.name.endsWith('.log')) continue;
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        const nextPrefix = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        collected.push(...collectSourceFiles(path.join(currentDir, entry.name), nextPrefix));
      } else if (entry.isFile()) {
        if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
        const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        const stat = fs.statSync(path.join(currentDir, entry.name));
        collected.push({ path: relPath, size: stat.size });
      }
    }

    return collected.sort((a, b) => a.path.localeCompare(b.path));
  }

  app.get('/api/admin/source-files', requireAdmin, (_req, res) => {
    const files = collectSourceFiles();
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    let version = '1.3.0';
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as {
        version?: string;
      };
      if (pkg.version) version = pkg.version;
    } catch {
      // ignore
    }
    res.json({
      version,
      totalFiles: files.length,
      totalBytes,
      files,
    });
  });

  app.get('/api/admin/source-zip', requireAdmin, async (_req, res) => {
    try {
      const files = collectSourceFiles();
      const zip = new JSZip();

      for (const file of files) {
        const abs = path.join(__dirname, file.path);
        const buf = fs.readFileSync(abs);
        zip.file(file.path, buf);
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      let version = '1.3.0';
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as {
          version?: string;
        };
        if (pkg.version) version = pkg.version;
      } catch {
        // ignore
      }

      const filename = `ev-care-v${version}-source.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.send(zipBuffer);
    } catch {
      res.status(500).json({ error: 'ไม่สามารถสร้างไฟล์ ZIP ได้' });
    }
  });

  app.get('/api/admin/source-file', requireAdmin, (req, res) => {
    const requested = typeof req.query.path === 'string' ? req.query.path : '';
    const files = collectSourceFiles();
    const match = files.find((f) => f.path === requested);
    if (!match) {
      res.status(404).json({ error: 'ไม่พบไฟล์ที่ต้องการดาวน์โหลด' });
      return;
    }
    const absPath = path.join(__dirname, match.path);
    res.download(absPath, path.basename(match.path));
  });

  // Vite middleware (dev) or static dist serving (prod)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`EV Repair server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
