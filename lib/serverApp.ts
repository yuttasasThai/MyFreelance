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

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.ADMIN_PASSCODE
    ? crypto.createHmac('sha256', process.env.ADMIN_PASSCODE).update('my-freelance-session-v1').digest('hex')
    : crypto.randomBytes(32).toString('hex'));
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

function normalizePasscodeSeparators(value: string): string {
  return value.replace(/[\s-]+/g, '').trim();
}

function verifyPasscode(candidate: string): boolean {
  const trimmedCandidate = candidate.trim();
  const compactCandidate = normalizePasscodeSeparators(trimmedCandidate);
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) {
    if (timingSafeCompareStrings(trimmedCandidate, envPass)) {
      return true;
    }
    const compactEnv = normalizePasscodeSeparators(envPass);
    if (compactEnv.length >= 6 && timingSafeCompareStrings(compactCandidate, compactEnv)) {
      return true;
    }
    return false;
  }
  const stored = readStoredAdminCred();
  if (!stored) return false;
  const expected = Buffer.from(stored.hash, 'hex');
  const derivedExact = crypto.scryptSync(trimmedCandidate, stored.salt, 64);
  if (derivedExact.length === expected.length && crypto.timingSafeEqual(derivedExact, expected)) {
    return true;
  }
  if (compactCandidate && compactCandidate !== trimmedCandidate && compactCandidate.length >= 6) {
    const derivedCompact = crypto.scryptSync(compactCandidate, stored.salt, 64);
    if (derivedCompact.length === expected.length && crypto.timingSafeEqual(derivedCompact, expected)) {
      return true;
    }
  }
  return false;
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

export type StorageMode = 'redis-cloud' | 'local-disk' | 'vercel-tmp';

const REDIS_URL = (
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  ''
).trim();
const REDIS_TOKEN = (
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  ''
).trim();
const HAS_REDIS_CLOUD = Boolean(REDIS_URL && REDIS_TOKEN);

const REDIS_RECORDS_KEY = 'my-freelance:records:v1';
const REDIS_REVISION_KEY = 'my-freelance:revision-state:v1';

export function getStorageMode(): StorageMode {
  if (HAS_REDIS_CLOUD) return 'redis-cloud';
  return IS_VERCEL ? 'vercel-tmp' : 'local-disk';
}

async function redisCommand<T = unknown>(args: string[]): Promise<T | null> {
  if (!HAS_REDIS_CLOUD) return null;
  const endpoint = REDIS_URL.replace(/\/+$/, '');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`Redis REST error: ${res.status}`);
  }
  const data = (await res.json()) as { result?: T; error?: string };
  if (data.error) {
    throw new Error(data.error);
  }
  return data.result ?? null;
}

async function redisGetJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await redisCommand<string | null>(['GET', key]);
    if (typeof raw !== 'string' || !raw.trim()) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function redisSetJson(key: string, value: unknown): Promise<void> {
  await redisCommand(['SET', key, JSON.stringify(value)]);
}

function readLocalRecordsSafe(): ServerTeamRecord[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(INITIAL_SEED_RECORDS, null, 2), 'utf-8');
    return [...INITIAL_SEED_RECORDS];
  }
  const raw = fs.readFileSync(RECORDS_FILE, 'utf-8');
  if (!raw.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as ServerTeamRecord[];
    }
  } catch {
    // Preserve corrupt file backup instead of wiping existing user data
    const backupFile = path.join(DATA_DIR, `records.backup-${Date.now()}.json`);
    try {
      fs.copyFileSync(RECORDS_FILE, backupFile);
    } catch {
      // Ignore backup copy failure
    }
    throw new Error('ไม่สามารถอ่านไฟล์ฐานข้อมูลได้ (สำรองไฟล์เดิมไว้แล้ว)');
  }
  return [];
}

async function loadRecords(): Promise<ServerTeamRecord[]> {
  if (HAS_REDIS_CLOUD) {
    const remote = await redisGetJson<ServerTeamRecord[]>(REDIS_RECORDS_KEY);
    if (Array.isArray(remote)) {
      return remote;
    }
    // Bootstrap Redis from local records if available without wiping
    const localSeed = fs.existsSync(RECORDS_FILE) ? readLocalRecordsSafe() : [...INITIAL_SEED_RECORDS];
    await redisSetJson(REDIS_RECORDS_KEY, localSeed);
    return localSeed;
  }
  return readLocalRecordsSafe();
}

async function saveRecords(records: ServerTeamRecord[]): Promise<void> {
  if (HAS_REDIS_CLOUD) {
    await redisSetJson(REDIS_RECORDS_KEY, records);
    return;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${RECORDS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(records, null, 2), 'utf-8');
  fs.renameSync(tmpFile, RECORDS_FILE);
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

const SAFE_SOURCE_DIRS = ['src', 'api', 'lib', 'public'];

function isExcludedZipAsset(relPath: string): boolean {
  if (relPath === 'api/index.mjs') return true;
  if (relPath.startsWith('public/assets/aistudio/Screenshot_')) return true;
  return false;
}

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
    if (isExcludedZipAsset(relChild)) continue;
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

async function saveRevisionState(state: RevisionState): Promise<void> {
  if (HAS_REDIS_CLOUD) {
    try {
      await redisSetJson(REDIS_REVISION_KEY, state);
      return;
    } catch {
      // Fallback to local write below
    }
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(REVISION_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function getOrAdvanceSourceRevision(): Promise<RevisionState> {
  const currentHash = computeSourceFingerprint();
  const baseRevision = readRootBaseRevision();
  const nowIso = new Date().toISOString();

  let state: RevisionState | null = null;
  if (HAS_REDIS_CLOUD) {
    const remoteState = await redisGetJson<Partial<RevisionState>>(REDIS_REVISION_KEY);
    if (
      remoteState &&
      typeof remoteState.sourceRevision === 'number' &&
      typeof remoteState.dataRevision === 'number' &&
      typeof remoteState.lastSourceHash === 'string'
    ) {
      state = {
        sourceRevision: Math.max(remoteState.sourceRevision, baseRevision),
        dataRevision: Math.max(remoteState.dataRevision, 1),
        lastSourceHash: remoteState.lastSourceHash,
        updatedAt: typeof remoteState.updatedAt === 'string' ? remoteState.updatedAt : nowIso,
      };
    }
  }

  if (!state && fs.existsSync(REVISION_STATE_FILE)) {
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
    await saveRevisionState(state);
    return state;
  }

  if (state.lastSourceHash !== currentHash) {
    state = {
      ...state,
      sourceRevision: state.sourceRevision + 1,
      lastSourceHash: currentHash,
      updatedAt: nowIso,
    };
    await saveRevisionState(state);
  }

  return state;
}

async function bumpDataRevision(): Promise<RevisionState> {
  const current = await getOrAdvanceSourceRevision();
  const next: RevisionState = {
    ...current,
    dataRevision: current.dataRevision + 1,
    updatedAt: new Date().toISOString(),
  };
  await saveRevisionState(next);
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
    if (isExcludedZipAsset(relChild)) continue;
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
    const apiKey = (
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.MAPS_API_KEY ||
      ''
    ).trim();
    res.json({ apiKey });
  });

  app.get('/api/revision', async (_req, res) => {
    const revState = await getOrAdvanceSourceRevision();
    res.json({ sourceRevision: revState.sourceRevision });
  });

  app.get('/api/admin/status', async (_req, res) => {
    const revState = await getOrAdvanceSourceRevision();
    res.json({
      configured: isAdminConfigured(),
      sourceRevision: revState.sourceRevision,
      storageMode: getStorageMode(),
    });
  });

  app.post('/api/admin/setup', (req, res) => {
    if (isAdminConfigured()) {
      res.status(409).json({ error: 'รหัสผ่าน Admin ถูกตั้งค่าไว้แล้ว' });
      return;
    }

    const rawPasscode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    const compactPasscode = normalizePasscodeSeparators(rawPasscode);
    const passcodeToStore = compactPasscode.length >= 6 ? compactPasscode : rawPasscode;
    if (passcodeToStore.length < 4) {
      res.status(400).json({ error: 'กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษร' });
      return;
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(passcodeToStore, salt, 64).toString('hex');

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

  app.get('/api/admin/revision', requireAdmin, async (_req, res) => {
    const revState = await getOrAdvanceSourceRevision();
    res.json({
      sourceRevision: revState.sourceRevision,
      dataRevision: revState.dataRevision,
      updatedAt: revState.updatedAt,
      storageMode: getStorageMode(),
    });
  });

  app.get('/api/admin/download-source', requireAdmin, async (_req, res) => {
    try {
      const revState = await getOrAdvanceSourceRevision();
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
        '   - ADMIN_PASSCODE = <รหัสผ่าน Admin ที่ต้องการ>',
        '   - (แนะนำ) เชื่อมต่อ Vercel Storage -> Upstash Redis (ฟรี) เพื่อให้ข้อมูล Admin ไม่หายเมื่อรีสตาร์ท',
        '   - (ไม่บังคับ) VITE_GOOGLE_MAPS_API_KEY = <Google Maps API Key> (ถ้าไม่ใส่ ระบบจะแสดงแผนที่ 2D ประเทศไทยให้อัตโนมัติ)',
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

  app.get('/api/records', requireAdmin, async (_req, res) => {
    try {
      const records = await loadRecords();
      const revState = await getOrAdvanceSourceRevision();
      res.json({
        records,
        sourceRevision: revState.sourceRevision,
        dataRevision: revState.dataRevision,
        storageMode: getStorageMode(),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'ไม่สามารถโหลดฐานข้อมูลได้',
      });
    }
  });

  app.delete('/api/records', requireAdmin, async (_req, res) => {
    await saveRecords([]);
    const revState = await bumpDataRevision();
    res.json({
      success: true,
      records: [],
      dataRevision: revState.dataRevision,
    });
  });

  app.post('/api/records/import', requireAdmin, async (req, res) => {
    const incoming = Array.isArray(req.body?.records) ? req.body.records : null;
    if (!incoming) {
      res.status(400).json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง (ต้องเป็นรายการ records)' });
      return;
    }

    const existingRecords = await loadRecords();
    const seenNames = new Set(existingRecords.map((r) => normalizeNameForCompare(r.name)));
    const seenPhones = new Set(existingRecords.map((r) => normalizePhoneForCompare(r.phone)));

    let addedCount = 0;
    let skippedCount = 0;
    const toAppend: ServerTeamRecord[] = [];

    for (const rawItem of incoming) {
      if (!rawItem || typeof rawItem !== 'object') {
        skippedCount += 1;
        continue;
      }
      const item = rawItem as Partial<ServerTeamRecord>;
      const workType = item.workType === 'sales' ? 'sales' : item.workType === 'assembly' ? 'assembly' : null;
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const phone = typeof item.phone === 'string' ? item.phone.trim() : '';
      const subdistrict = typeof item.subdistrict === 'string' ? item.subdistrict.trim() : '';
      const district = typeof item.district === 'string' ? item.district.trim() : '';
      const province = typeof item.province === 'string' ? normalizeProvinceName(item.province) : '';

      if (!workType || !name || !phone || !subdistrict || !district || !province) {
        skippedCount += 1;
        continue;
      }

      const normName = normalizeNameForCompare(name);
      const normPhone = normalizePhoneForCompare(phone);
      if ((normName && seenNames.has(normName)) || (normPhone && seenPhones.has(normPhone))) {
        skippedCount += 1;
        continue;
      }

      const hasCoords =
        typeof item.lat === 'number' &&
        Number.isFinite(item.lat) &&
        typeof item.lng === 'number' &&
        Number.isFinite(item.lng);
      const coords = hasCoords
        ? { lat: item.lat!, lng: item.lng! }
        : resolveThailandCoords(subdistrict, district, province);

      if (normName) seenNames.add(normName);
      if (normPhone) seenPhones.add(normPhone);

      toAppend.push({
        id:
          typeof item.id === 'string' && item.id.trim()
            ? item.id.trim()
            : `rec-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        workType,
        name,
        phone,
        subdistrict,
        district,
        province,
        lat: coords.lat,
        lng: coords.lng,
        createdAt:
          typeof item.createdAt === 'string' && item.createdAt.trim()
            ? item.createdAt.trim()
            : new Date().toISOString(),
      });
      addedCount += 1;
    }

    const merged = [...toAppend, ...existingRecords];
    await saveRecords(merged);
    const revState = addedCount > 0 ? await bumpDataRevision() : await getOrAdvanceSourceRevision();

    res.json({
      records: merged,
      addedCount,
      skippedCount,
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

    const records = await loadRecords();
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
    await saveRecords(records);
    const revState = await bumpDataRevision();

    res.status(201).json({
      record: newRecord,
      dataRevision: revState.dataRevision,
      summary: { id: newRecord.id, name: newRecord.name, workType: newRecord.workType },
    });
  });

  app.patch('/api/records/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const records = await loadRecords();
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
    await saveRecords(records);
    const revState = await bumpDataRevision();

    res.json({ record: updated, dataRevision: revState.dataRevision });
  });

  app.delete('/api/records/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const records = await loadRecords();
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length === records.length) {
      res.status(404).json({ error: 'ไม่พบข้อมูลรายการนี้' });
      return;
    }
    await saveRecords(filtered);
    const revState = await bumpDataRevision();
    res.json({ success: true, dataRevision: revState.dataRevision });
  });

  return app;
}
