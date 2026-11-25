import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { resolveThailandCoords, normalizeProvinceName } from '../src/data/thailandProvinces.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const DATA_DIR = IS_VERCEL
  ? path.join('/tmp', 'my-freelance-data')
  : path.join(ROOT_DIR, 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const ADMIN_CRED_FILE = path.join(DATA_DIR, 'admin.json');
const REVISION_STATE_FILE = path.join(DATA_DIR, 'revision-state.json');
const ROOT_REVISION_FILE = path.join(ROOT_DIR, 'revision.json');

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

export interface ServerTeamRecord {
  id: string;
  workType: 'assembly' | 'sales';
  name: string;
  phone: string;
  subdistrict: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  createdAt: string;
}

interface AdminCredential {
  salt: string;
  hash: string;
}

interface RevisionState {
  sourceRevision: number;
  dataRevision: number;
  lastSourceHash: string;
  updatedAt: string;
}

const INITIAL_SEED_RECORDS: ServerTeamRecord[] = [];

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 15) {
    return false;
  }
  entry.count += 1;
  return true;
}

function readStoredAdminCred(): AdminCredential | null {
  if (!fs.existsSync(ADMIN_CRED_FILE)) return null;
  try {
    const raw = fs.readFileSync(ADMIN_CRED_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AdminCredential>;
    if (typeof parsed.salt === 'string' && typeof parsed.hash === 'string') {
      return { salt: parsed.salt, hash: parsed.hash };
    }
  } catch {
    return null;
  }
  return null;
}

function isAdminConfigured(): boolean {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) return true;
  return readStoredAdminCred() !== null;
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function verifyPasscode(candidate: string): boolean {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) {
    return timingSafeCompareStrings(candidate.trim(), envPass);
  }
  const stored = readStoredAdminCred();
  if (!stored) return false;
  const derived = crypto.scryptSync(candidate.trim(), stored.salt, 64);
  const expected = Buffer.from(stored.hash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function issueAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      exp: Date.now() + TOKEN_TTL_MS,
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  if (!timingSafeCompareStrings(sigB64, expectedSig)) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      role?: string;
      exp?: number;
    };
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && Date.now() < parsed.exp;
  } catch {
    return false;
  }
}

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบ Admin ใหม่' });
    return;
  }
  next();
}

function ensureStorage(): ServerTeamRecord[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(INITIAL_SEED_RECORDS, null, 2), 'utf-8');
    return [...INITIAL_SEED_RECORDS];
  }
  try {
    const raw = fs.readFileSync(RECORDS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fallback if file is corrupted
  }
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(INITIAL_SEED_RECORDS, null, 2), 'utf-8');
  return [...INITIAL_SEED_RECORDS];
}

function saveRecords(records: ServerTeamRecord[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

const SAFE_ROOT_FILES = [
  'index.html',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vercel.json',
  '.env.example',
  '.gitignore',
  'metadata.json',
  'server.ts',
];

const SAFE_SOURCE_DIRS = ['src', 'api', 'lib'];

function collectSourceFiles(relativeDir: string, acc: string[]): void {
  const fullDir = path.resolve(ROOT_DIR, relativeDir);
  if (!fullDir.startsWith(ROOT_DIR + path.sep) || !fs.existsSync(fullDir)) {
    return;
  }
  const entries = fs.readdirSync(fullDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const relChild = path.posix.join(relativeDir, entry.name);
    const fullChild = path.resolve(ROOT_DIR, relChild);
    if (!fullChild.startsWith(ROOT_DIR + path.sep)) continue;

    if (entry.isDirectory()) {
      collectSourceFiles(relChild, acc);
    } else if (entry.isFile()) {
      acc.push(relChild);
    }
  }
}

function computeSourceFingerprint(): string {
  const hash = crypto.createHash('sha256');
  const fileList: string[] = [];

  for (const relFile of SAFE_ROOT_FILES) {
    const resolved = path.resolve(ROOT_DIR, relFile);
    if (resolved.startsWith(ROOT_DIR + path.sep) && fs.existsSync(resolved)) {
      fileList.push(relFile);
    }
  }
  for (const relDir of SAFE_SOURCE_DIRS) {
    collectSourceFiles(relDir, fileList);
  }

  for (const rel of fileList.sort()) {
    const full = path.resolve(ROOT_DIR, rel);
    if (full.startsWith(ROOT_DIR + path.sep) && fs.existsSync(full)) {
      hash.update(rel);
      hash.update(fs.readFileSync(full));
    }
  }
  return hash.digest('hex');
}

function readRootBaseRevision(): number {
  if (!fs.existsSync(ROOT_REVISION_FILE)) return 1;
  try {
    const raw = fs.readFileSync(ROOT_REVISION_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as { sourceRevision?: unknown };
    if (typeof parsed.sourceRevision === 'number' && parsed.sourceRevision >= 1) {
      return Math.floor(parsed.sourceRevision);
    }
  } catch {
    // Ignore parse error
  }
  return 1;
}

function saveRevisionState(state: RevisionState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(REVISION_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function getOrAdvanceSourceRevision(): RevisionState {
  const currentHash = computeSourceFingerprint();
  const baseRevision = readRootBaseRevision();
  const nowIso = new Date().toISOString();

  let state: RevisionState | null = null;
  if (fs.existsSync(REVISION_STATE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(REVISION_STATE_FILE, 'utf-8')) as Partial<RevisionState>;
      if (
        typeof parsed.sourceRevision === 'number' &&
        typeof parsed.dataRevision === 'number' &&
        typeof parsed.lastSourceHash === 'string'
      ) {
        state = {
          sourceRevision: Math.max(parsed.sourceRevision, baseRevision),
          dataRevision: Math.max(parsed.dataRevision, 1),
          lastSourceHash: parsed.lastSourceHash,
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : nowIso,
        };
      }
    } catch {
      state = null;
    }
  }

  if (!state) {
    state = {
      sourceRevision: baseRevision,
      dataRevision: 1,
      lastSourceHash: currentHash,
      updatedAt: nowIso,
    };
    saveRevisionState(state);
    return state;
  }

  if (state.lastSourceHash !== currentHash) {
    state = {
      ...state,
      sourceRevision: state.sourceRevision + 1,
      lastSourceHash: currentHash,
      updatedAt: nowIso,
    };
    saveRevisionState(state);
  }

  return state;
}

function bumpDataRevision(): RevisionState {
  const current = getOrAdvanceSourceRevision();
  const next: RevisionState = {
    ...current,
    dataRevision: current.dataRevision + 1,
    updatedAt: new Date().toISOString(),
  };
  saveRevisionState(next);
  return next;
}

function normalizeNameForCompare(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizePhoneForCompare(phone: string): string {
  return phone.replace(/[\s\-().+]/g, '').trim();
}

async function geocodeThaiAddress(
  subdistrict: string,
  district: string,
  province: string
): Promise<{ lat: number; lng: number }> {
  const normalizedProvince = normalizeProvinceName(province);
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

  if (apiKey) {
    try {
      const addressParts = [
        subdistrict.trim() ? `ตำบล${subdistrict.trim().replace(/^(ตำบล|ต\.|แขวง)\s*/g, '')}` : '',
        district.trim() ? `อำเภอ${district.trim().replace(/^(อำเภอ|อ\.|เขต)\s*/g, '')}` : '',
        normalizedProvince ? `จังหวัด${normalizedProvince}` : '',
        'ประเทศไทย',
      ]
        .filter(Boolean)
        .join(' ');

      const url = `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(
        addressParts
      )}?regionCode=th&languageCode=th`;

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'results.location,results.formattedAddress',
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{ location?: { latitude?: number; longitude?: number } }>;
        };
        const loc = data.results?.[0]?.location;
        if (typeof loc?.latitude === 'number' && typeof loc?.longitude === 'number') {
          return {
            lat: Number(loc.latitude.toFixed(6)),
            lng: Number(loc.longitude.toFixed(6)),
          };
        }
      }
    } catch {
      // Fall back to deterministic Thailand province/area coordinates
    }
  }

  return resolveThailandCoords(subdistrict, district, normalizedProvince);
}

function addSafeDirectoryToZip(zip: JSZip, relativeDir: string): void {
  const fullDir = path.resolve(ROOT_DIR, relativeDir);
  if (!fullDir.startsWith(ROOT_DIR + path.sep) || !fs.existsSync(fullDir)) {
    return;
  }
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const relChild = path.posix.join(relativeDir, entry.name);
    const fullChild = path.resolve(ROOT_DIR, relChild);
    if (!fullChild.startsWith(ROOT_DIR + path.sep)) continue;

    if (entry.isDirectory()) {
      addSafeDirectoryToZip(zip, relChild);
    } else if (entry.isFile()) {
      zip.file(relChild, fs.readFileSync(fullChild));
    }
  }
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/api/maps-config', requireAdmin, (_req, res) => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({ apiKey });
  });

  app.get('/api/admin/status', (_req, res) => {
    res.json({ configured: isAdminConfigured() });
  });

  app.post('/api/admin/setup', (req, res) => {
    if (isAdminConfigured()) {
      res.status(409).json({ error: 'รหัสผ่าน Admin ถูกตั้งค่าไว้แล้ว' });
      return;
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 4) {
      res.status(400).json({ error: 'กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษร' });
      return;
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(passcode, salt, 64).toString('hex');

    try {
      fs.writeFileSync(
        ADMIN_CRED_FILE,
        JSON.stringify({ salt, hash }, null, 2),
        { encoding: 'utf-8', flag: 'wx' }
      );
    } catch {
      res.status(409).json({ error: 'รหัสผ่าน Admin ถูกตั้งค่าไว้แล้ว' });
      return;
    }

    const token = issueAdminToken();
    res.status(201).json({ token });
  });

  app.post('/api/admin/login', (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: 'ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่' });
      return;
    }

    if (!isAdminConfigured()) {
      res.status(400).json({ error: 'ยังไม่ได้ตั้งค่ารหัสผ่าน Admin' });
      return;
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    if (!passcode || !verifyPasscode(passcode)) {
      res.status(401).json({ error: 'รหัสผ่าน Admin ไม่ถูกต้อง' });
      return;
    }

    const token = issueAdminToken();
    res.json({ token });
  });

  app.get('/api/admin/revision', requireAdmin, (_req, res) => {
    const revState = getOrAdvanceSourceRevision();
    res.json({
      sourceRevision: revState.sourceRevision,
      dataRevision: revState.dataRevision,
      updatedAt: revState.updatedAt,
    });
  });

  app.get('/api/admin/download-source', requireAdmin, async (_req, res) => {
    try {
      const revState = getOrAdvanceSourceRevision();
      const zip = new JSZip();

      for (const relFile of SAFE_ROOT_FILES) {
        const resolved = path.resolve(ROOT_DIR, relFile);
        if (resolved.startsWith(ROOT_DIR + path.sep) && fs.existsSync(resolved)) {
          zip.file(relFile, fs.readFileSync(resolved));
        }
      }

      for (const relDir of SAFE_SOURCE_DIRS) {
        addSafeDirectoryToZip(zip, relDir);
      }

      // Write up-to-date revision.json inside the ZIP package
      zip.file(
        'revision.json',
        JSON.stringify(
          {
            sourceRevision: revState.sourceRevision,
            dataRevision: revState.dataRevision,
            updatedAt: revState.updatedAt,
          },
          null,
          2
        )
      );

      const deployGuide = [
        `Revision: rev${revState.sourceRevision}`,
        '',
        'วิธีอัปโหลดและ Deploy ขึ้น Vercel:',
        '1. แตกไฟล์ ZIP นี้แล้วอัปโหลดขึ้น GitHub หรือใช้ Vercel CLI (npx vercel)',
        '2. Framework Preset: Vite (vercel.json ตั้งค่า buildCommand, outputDirectory และ rewrites ไว้แล้ว)',
        '3. เพิ่ม Environment Variables ใน Vercel Project Settings:',
        '   - VITE_GOOGLE_MAPS_API_KEY = <Google Maps API Key ของคุณ>',
        '   - ADMIN_PASSCODE = <รหัสผ่าน Admin ที่ต้องการ>',
        '4. กด Deploy ได้ทันที',
      ].join('\n');
      zip.file('VERCEL_DEPLOY.txt', deployGuide);

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const filename = `my-freelance-vercel-source-rev${revState.sourceRevision}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Source-Revision', String(revState.sourceRevision));
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Source-Revision');
      res.send(zipBuffer);
    } catch {
      res.status(500).json({ error: 'ไม่สามารถสร้างไฟล์ Source Code ZIP ได้' });
    }
  });

  app.get('/api/records', requireAdmin, (_req, res) => {
    const records = ensureStorage();
    const revState = getOrAdvanceSourceRevision();
    res.json({
      records,
      sourceRevision: revState.sourceRevision,
      dataRevision: revState.dataRevision,
    });
  });

  app.delete('/api/records', requireAdmin, (_req, res) => {
    saveRecords([]);
    const revState = bumpDataRevision();
    res.json({
      success: true,
      records: [],
      dataRevision: revState.dataRevision,
    });
  });

  app.post('/api/records', async (req, res) => {
    const { workType, name, phone, subdistrict, district, province } = req.body ?? {};

    if (
      (workType !== 'assembly' && workType !== 'sales') ||
      typeof name !== 'string' ||
      !name.trim() ||
      typeof phone !== 'string' ||
      !phone.trim() ||
      typeof subdistrict !== 'string' ||
      !subdistrict.trim() ||
      typeof district !== 'string' ||
      !district.trim() ||
      typeof province !== 'string' ||
      !province.trim()
    ) {
      res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
      return;
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanSubdistrict = subdistrict.trim();
    const cleanDistrict = district.trim();
    const cleanProvince = normalizeProvinceName(province);

    const records = ensureStorage();
    const normName = normalizeNameForCompare(cleanName);
    const normPhone = normalizePhoneForCompare(cleanPhone);

    const existing = records.find((r) => {
      const rName = normalizeNameForCompare(r.name);
      const rPhone = normalizePhoneForCompare(r.phone);
      return (normName && rName === normName) || (normPhone && rPhone === normPhone);
    });

    if (existing) {
      const nameMatched = normalizeNameForCompare(existing.name) === normName;
      const phoneMatched = normalizePhoneForCompare(existing.phone) === normPhone;
      const duplicateBy =
        nameMatched && phoneMatched ? 'both' : nameMatched ? 'name' : 'phone';

      res.status(409).json({
        error: 'มีข้อมูลนี้แล้ว',
        code: 'DUPLICATE_RECORD',
        duplicateBy,
      });
      return;
    }

    const coords = await geocodeThaiAddress(cleanSubdistrict, cleanDistrict, cleanProvince);

    const newRecord: ServerTeamRecord = {
      id: `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workType,
      name: cleanName,
      phone: cleanPhone,
      subdistrict: cleanSubdistrict,
      district: cleanDistrict,
      province: cleanProvince,
      lat: coords.lat,
      lng: coords.lng,
      createdAt: new Date().toISOString(),
    };

    records.unshift(newRecord);
    saveRecords(records);
    const revState = bumpDataRevision();

    res.status(201).json({
      record: newRecord,
      dataRevision: revState.dataRevision,
      summary: { id: newRecord.id, name: newRecord.name, workType: newRecord.workType },
    });
  });

  app.patch('/api/records/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const records = ensureStorage();
    const idx = records.findIndex((r) => r.id === id);

    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลรายการนี้' });
      return;
    }

    const current = records[idx];
    const body = req.body ?? {};

    const updatedWorkType =
      body.workType === 'assembly' || body.workType === 'sales' ? body.workType : current.workType;
    const updatedName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : current.name;
    const updatedPhone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : current.phone;
    const updatedSubdistrict =
      typeof body.subdistrict === 'string' && body.subdistrict.trim()
        ? body.subdistrict.trim()
        : current.subdistrict;
    const updatedDistrict =
      typeof body.district === 'string' && body.district.trim() ? body.district.trim() : current.district;
    const updatedProvince =
      typeof body.province === 'string' && body.province.trim()
        ? normalizeProvinceName(body.province)
        : current.province;

    const normName = normalizeNameForCompare(updatedName);
    const normPhone = normalizePhoneForCompare(updatedPhone);
    const duplicateOther = records.find((r) => {
      if (r.id === id) return false;
      return (
        (normName && normalizeNameForCompare(r.name) === normName) ||
        (normPhone && normalizePhoneForCompare(r.phone) === normPhone)
      );
    });
    if (duplicateOther) {
      res.status(409).json({
        error: 'มีข้อมูลนี้แล้ว',
        code: 'DUPLICATE_RECORD',
      });
      return;
    }

    const addressChanged =
      updatedSubdistrict !== current.subdistrict ||
      updatedDistrict !== current.district ||
      updatedProvince !== current.province;

    const coords = addressChanged
      ? await geocodeThaiAddress(updatedSubdistrict, updatedDistrict, updatedProvince)
      : { lat: current.lat, lng: current.lng };

    const updated: ServerTeamRecord = {
      ...current,
      workType: updatedWorkType,
      name: updatedName,
      phone: updatedPhone,
      subdistrict: updatedSubdistrict,
      district: updatedDistrict,
      province: updatedProvince,
      lat: coords.lat,
      lng: coords.lng,
    };

    records[idx] = updated;
    saveRecords(records);
    const revState = bumpDataRevision();

    res.json({ record: updated, dataRevision: revState.dataRevision });
  });

  app.delete('/api/records/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const records = ensureStorage();
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length === records.length) {
      res.status(404).json({ error: 'ไม่พบข้อมูลรายการนี้' });
      return;
    }
    saveRecords(filtered);
    const revState = bumpDataRevision();
    res.json({ success: true, dataRevision: revState.dataRevision });
  });

  return app;
}
