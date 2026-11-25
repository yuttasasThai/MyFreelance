// lib/serverApp.ts
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

// src/data/thailandProvinces.ts
var THAILAND_PROVINCES = [
  { name: "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23", lat: 13.7563, lng: 100.5018 },
  { name: "\u0E2A\u0E21\u0E38\u0E17\u0E23\u0E1B\u0E23\u0E32\u0E01\u0E32\u0E23", lat: 13.5991, lng: 100.5998 },
  { name: "\u0E19\u0E19\u0E17\u0E1A\u0E38\u0E23\u0E35", lat: 13.8621, lng: 100.5144 },
  { name: "\u0E1B\u0E17\u0E38\u0E21\u0E18\u0E32\u0E19\u0E35", lat: 14.0208, lng: 100.525 },
  { name: "\u0E1E\u0E23\u0E30\u0E19\u0E04\u0E23\u0E28\u0E23\u0E35\u0E2D\u0E22\u0E38\u0E18\u0E22\u0E32", lat: 14.3532, lng: 100.5689 },
  { name: "\u0E2D\u0E48\u0E32\u0E07\u0E17\u0E2D\u0E07", lat: 14.5896, lng: 100.4551 },
  { name: "\u0E25\u0E1E\u0E1A\u0E38\u0E23\u0E35", lat: 14.7995, lng: 100.6534 },
  { name: "\u0E2A\u0E34\u0E07\u0E2B\u0E4C\u0E1A\u0E38\u0E23\u0E35", lat: 14.8936, lng: 100.3967 },
  { name: "\u0E0A\u0E31\u0E22\u0E19\u0E32\u0E17", lat: 15.1852, lng: 100.1251 },
  { name: "\u0E2A\u0E23\u0E30\u0E1A\u0E38\u0E23\u0E35", lat: 14.5289, lng: 100.9101 },
  { name: "\u0E0A\u0E25\u0E1A\u0E38\u0E23\u0E35", lat: 13.3611, lng: 100.9847 },
  { name: "\u0E23\u0E30\u0E22\u0E2D\u0E07", lat: 12.6814, lng: 101.2816 },
  { name: "\u0E08\u0E31\u0E19\u0E17\u0E1A\u0E38\u0E23\u0E35", lat: 12.6114, lng: 102.1039 },
  { name: "\u0E15\u0E23\u0E32\u0E14", lat: 12.2428, lng: 102.5175 },
  { name: "\u0E09\u0E30\u0E40\u0E0A\u0E34\u0E07\u0E40\u0E17\u0E23\u0E32", lat: 13.6904, lng: 101.0779 },
  { name: "\u0E1B\u0E23\u0E32\u0E08\u0E35\u0E19\u0E1A\u0E38\u0E23\u0E35", lat: 14.0509, lng: 101.3727 },
  { name: "\u0E19\u0E04\u0E23\u0E19\u0E32\u0E22\u0E01", lat: 14.2069, lng: 101.213 },
  { name: "\u0E2A\u0E23\u0E30\u0E41\u0E01\u0E49\u0E27", lat: 13.824, lng: 102.0646 },
  { name: "\u0E19\u0E04\u0E23\u0E23\u0E32\u0E0A\u0E2A\u0E35\u0E21\u0E32", lat: 14.9799, lng: 102.0978 },
  { name: "\u0E1A\u0E38\u0E23\u0E35\u0E23\u0E31\u0E21\u0E22\u0E4C", lat: 14.993, lng: 103.1029 },
  { name: "\u0E2A\u0E38\u0E23\u0E34\u0E19\u0E17\u0E23\u0E4C", lat: 14.8818, lng: 103.4936 },
  { name: "\u0E28\u0E23\u0E35\u0E2A\u0E30\u0E40\u0E01\u0E29", lat: 15.1186, lng: 104.322 },
  { name: "\u0E2D\u0E38\u0E1A\u0E25\u0E23\u0E32\u0E0A\u0E18\u0E32\u0E19\u0E35", lat: 15.2287, lng: 104.8564 },
  { name: "\u0E22\u0E42\u0E2A\u0E18\u0E23", lat: 15.7926, lng: 104.1453 },
  { name: "\u0E0A\u0E31\u0E22\u0E20\u0E39\u0E21\u0E34", lat: 15.8068, lng: 102.0315 },
  { name: "\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E40\u0E08\u0E23\u0E34\u0E0D", lat: 15.8657, lng: 104.6258 },
  { name: "\u0E1A\u0E36\u0E07\u0E01\u0E32\u0E2C", lat: 18.3609, lng: 103.6464 },
  { name: "\u0E2B\u0E19\u0E2D\u0E07\u0E1A\u0E31\u0E27\u0E25\u0E33\u0E20\u0E39", lat: 17.2218, lng: 102.426 },
  { name: "\u0E02\u0E2D\u0E19\u0E41\u0E01\u0E48\u0E19", lat: 16.4322, lng: 102.8236 },
  { name: "\u0E2D\u0E38\u0E14\u0E23\u0E18\u0E32\u0E19\u0E35", lat: 17.4156, lng: 102.7872 },
  { name: "\u0E40\u0E25\u0E22", lat: 17.486, lng: 101.7223 },
  { name: "\u0E2B\u0E19\u0E2D\u0E07\u0E04\u0E32\u0E22", lat: 17.8783, lng: 102.7413 },
  { name: "\u0E21\u0E2B\u0E32\u0E2A\u0E32\u0E23\u0E04\u0E32\u0E21", lat: 16.1851, lng: 103.3026 },
  { name: "\u0E23\u0E49\u0E2D\u0E22\u0E40\u0E2D\u0E47\u0E14", lat: 16.0538, lng: 103.652 },
  { name: "\u0E01\u0E32\u0E2C\u0E2A\u0E34\u0E19\u0E18\u0E38\u0E4C", lat: 16.4314, lng: 103.5059 },
  { name: "\u0E2A\u0E01\u0E25\u0E19\u0E04\u0E23", lat: 17.1546, lng: 104.1348 },
  { name: "\u0E19\u0E04\u0E23\u0E1E\u0E19\u0E21", lat: 17.392, lng: 104.7696 },
  { name: "\u0E21\u0E38\u0E01\u0E14\u0E32\u0E2B\u0E32\u0E23", lat: 16.5453, lng: 104.7235 },
  { name: "\u0E40\u0E0A\u0E35\u0E22\u0E07\u0E43\u0E2B\u0E21\u0E48", lat: 18.7883, lng: 98.9853 },
  { name: "\u0E25\u0E33\u0E1E\u0E39\u0E19", lat: 18.5745, lng: 99.0087 },
  { name: "\u0E25\u0E33\u0E1B\u0E32\u0E07", lat: 18.2888, lng: 99.4908 },
  { name: "\u0E2D\u0E38\u0E15\u0E23\u0E14\u0E34\u0E15\u0E16\u0E4C", lat: 17.6201, lng: 100.0993 },
  { name: "\u0E41\u0E1E\u0E23\u0E48", lat: 18.1446, lng: 100.1403 },
  { name: "\u0E19\u0E48\u0E32\u0E19", lat: 18.7756, lng: 100.773 },
  { name: "\u0E1E\u0E30\u0E40\u0E22\u0E32", lat: 19.1665, lng: 99.9019 },
  { name: "\u0E40\u0E0A\u0E35\u0E22\u0E07\u0E23\u0E32\u0E22", lat: 19.9105, lng: 99.8406 },
  { name: "\u0E41\u0E21\u0E48\u0E2E\u0E48\u0E2D\u0E07\u0E2A\u0E2D\u0E19", lat: 19.302, lng: 97.9654 },
  { name: "\u0E19\u0E04\u0E23\u0E2A\u0E27\u0E23\u0E23\u0E04\u0E4C", lat: 15.7047, lng: 100.1372 },
  { name: "\u0E2D\u0E38\u0E17\u0E31\u0E22\u0E18\u0E32\u0E19\u0E35", lat: 15.3835, lng: 100.0246 },
  { name: "\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23", lat: 16.4828, lng: 99.5227 },
  { name: "\u0E15\u0E32\u0E01", lat: 16.884, lng: 99.1258 },
  { name: "\u0E2A\u0E38\u0E42\u0E02\u0E17\u0E31\u0E22", lat: 17.0056, lng: 99.8264 },
  { name: "\u0E1E\u0E34\u0E29\u0E13\u0E38\u0E42\u0E25\u0E01", lat: 16.8211, lng: 100.2659 },
  { name: "\u0E1E\u0E34\u0E08\u0E34\u0E15\u0E23", lat: 16.4429, lng: 100.3482 },
  { name: "\u0E40\u0E1E\u0E0A\u0E23\u0E1A\u0E39\u0E23\u0E13\u0E4C", lat: 16.419, lng: 101.1592 },
  { name: "\u0E23\u0E32\u0E0A\u0E1A\u0E38\u0E23\u0E35", lat: 13.5283, lng: 99.8134 },
  { name: "\u0E01\u0E32\u0E0D\u0E08\u0E19\u0E1A\u0E38\u0E23\u0E35", lat: 14.0228, lng: 99.5328 },
  { name: "\u0E2A\u0E38\u0E1E\u0E23\u0E23\u0E13\u0E1A\u0E38\u0E23\u0E35", lat: 14.4745, lng: 100.1177 },
  { name: "\u0E19\u0E04\u0E23\u0E1B\u0E10\u0E21", lat: 13.8199, lng: 100.0622 },
  { name: "\u0E2A\u0E21\u0E38\u0E17\u0E23\u0E2A\u0E32\u0E04\u0E23", lat: 13.5475, lng: 100.2744 },
  { name: "\u0E2A\u0E21\u0E38\u0E17\u0E23\u0E2A\u0E07\u0E04\u0E23\u0E32\u0E21", lat: 13.4098, lng: 100.0023 },
  { name: "\u0E40\u0E1E\u0E0A\u0E23\u0E1A\u0E38\u0E23\u0E35", lat: 13.1119, lng: 99.9398 },
  { name: "\u0E1B\u0E23\u0E30\u0E08\u0E27\u0E1A\u0E04\u0E35\u0E23\u0E35\u0E02\u0E31\u0E19\u0E18\u0E4C", lat: 11.8124, lng: 99.7973 },
  { name: "\u0E19\u0E04\u0E23\u0E28\u0E23\u0E35\u0E18\u0E23\u0E23\u0E21\u0E23\u0E32\u0E0A", lat: 8.4304, lng: 99.9631 },
  { name: "\u0E01\u0E23\u0E30\u0E1A\u0E35\u0E48", lat: 8.0863, lng: 98.9063 },
  { name: "\u0E1E\u0E31\u0E07\u0E07\u0E32", lat: 8.4501, lng: 98.5255 },
  { name: "\u0E20\u0E39\u0E40\u0E01\u0E47\u0E15", lat: 7.8804, lng: 98.3923 },
  { name: "\u0E2A\u0E38\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E18\u0E32\u0E19\u0E35", lat: 9.1382, lng: 99.3217 },
  { name: "\u0E23\u0E30\u0E19\u0E2D\u0E07", lat: 9.9529, lng: 98.6085 },
  { name: "\u0E0A\u0E38\u0E21\u0E1E\u0E23", lat: 10.493, lng: 99.1801 },
  { name: "\u0E2A\u0E07\u0E02\u0E25\u0E32", lat: 7.1756, lng: 100.6143 },
  { name: "\u0E2A\u0E15\u0E39\u0E25", lat: 6.6238, lng: 100.0674 },
  { name: "\u0E15\u0E23\u0E31\u0E07", lat: 7.5563, lng: 99.6114 },
  { name: "\u0E1E\u0E31\u0E17\u0E25\u0E38\u0E07", lat: 7.6167, lng: 100.074 },
  { name: "\u0E1B\u0E31\u0E15\u0E15\u0E32\u0E19\u0E35", lat: 6.8695, lng: 101.2505 },
  { name: "\u0E22\u0E30\u0E25\u0E32", lat: 6.5411, lng: 101.2804 },
  { name: "\u0E19\u0E23\u0E32\u0E18\u0E34\u0E27\u0E32\u0E2A", lat: 6.4255, lng: 101.8253 }
];
function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function normalizeProvinceName(raw) {
  const cleaned = raw.trim().replace(/^(จังหวัด|จ\.)\s*/g, "");
  if (cleaned === "\u0E01\u0E17\u0E21" || cleaned === "\u0E01\u0E17\u0E21." || cleaned === "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E" || cleaned === "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E2F") {
    return "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23";
  }
  return cleaned;
}
function resolveThailandCoords(subdistrict, district, province) {
  const normalizedProv = normalizeProvinceName(province);
  const exact = THAILAND_PROVINCES.find((p) => p.name === normalizedProv);
  const partial = exact ?? THAILAND_PROVINCES.find(
    (p) => p.name.includes(normalizedProv) || normalizedProv.includes(p.name)
  );
  const base = partial ?? { lat: 13.7563, lng: 100.5018 };
  const areaKey = `${subdistrict.trim()}|${district.trim()}|${normalizedProv}`;
  if (!subdistrict.trim() && !district.trim()) {
    return { lat: base.lat, lng: base.lng };
  }
  const h1 = hashString(areaKey);
  const h2 = hashString(`${areaKey}:lng`);
  const latOffset = (h1 % 1e3 / 1e3 - 0.5) * 0.14;
  const lngOffset = (h2 % 1e3 / 1e3 - 0.5) * 0.14;
  return {
    lat: Number((base.lat + latOffset).toFixed(6)),
    lng: Number((base.lng + lngOffset).toFixed(6))
  };
}

// lib/serverApp.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var ROOT_DIR = path.resolve(__dirname, "..");
var IS_VERCEL = process.env.VERCEL === "1" || process.env.VERCEL === "true";
var DATA_DIR = IS_VERCEL ? path.join("/tmp", "my-freelance-data") : path.join(ROOT_DIR, "data");
var RECORDS_FILE = path.join(DATA_DIR, "records.json");
var ADMIN_CRED_FILE = path.join(DATA_DIR, "admin.json");
var REVISION_STATE_FILE = path.join(DATA_DIR, "revision-state.json");
var ROOT_REVISION_FILE = path.join(ROOT_DIR, "revision.json");
var SESSION_SECRET = process.env.SESSION_SECRET || (process.env.ADMIN_PASSCODE ? crypto.createHmac("sha256", process.env.ADMIN_PASSCODE).update("my-freelance-session-v1").digest("hex") : crypto.randomBytes(32).toString("hex"));
var TOKEN_TTL_MS = 12 * 60 * 60 * 1e3;
var INITIAL_SEED_RECORDS = [];
var loginAttempts = /* @__PURE__ */ new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1e3 });
    return true;
  }
  if (entry.count >= 15) {
    return false;
  }
  entry.count += 1;
  return true;
}
function readStoredAdminCred() {
  if (!fs.existsSync(ADMIN_CRED_FILE)) return null;
  try {
    const raw = fs.readFileSync(ADMIN_CRED_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.salt === "string" && typeof parsed.hash === "string") {
      return { salt: parsed.salt, hash: parsed.hash };
    }
  } catch {
    return null;
  }
  return null;
}
function isAdminConfigured() {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) return true;
  return readStoredAdminCred() !== null;
}
function timingSafeCompareStrings(a, b) {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}
function normalizePasscodeSeparators(value) {
  return value.replace(/[\s-]+/g, "").trim();
}
function verifyPasscode(candidate) {
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
  const expected = Buffer.from(stored.hash, "hex");
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
function issueAdminToken() {
  const payload = Buffer.from(
    JSON.stringify({
      role: "admin",
      exp: Date.now() + TOKEN_TTL_MS,
      nonce: crypto.randomBytes(8).toString("hex")
    })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifyAdminToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
  if (!timingSafeCompareStrings(sigB64, expectedSig)) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    return parsed.role === "admin" && typeof parsed.exp === "number" && Date.now() < parsed.exp;
  } catch {
    return false;
  }
}
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A (Admin) \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19" });
    return;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: "\u0E40\u0E0B\u0E2A\u0E0A\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A Admin \u0E43\u0E2B\u0E21\u0E48" });
    return;
  }
  next();
}
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(INITIAL_SEED_RECORDS, null, 2), "utf-8");
    return [...INITIAL_SEED_RECORDS];
  }
  try {
    const raw = fs.readFileSync(RECORDS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
  }
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(INITIAL_SEED_RECORDS, null, 2), "utf-8");
  return [...INITIAL_SEED_RECORDS];
}
function saveRecords(records) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), "utf-8");
}
var SAFE_ROOT_FILES = [
  "index.html",
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "vercel.json",
  ".env.example",
  ".gitignore",
  "metadata.json",
  "server.ts"
];
var SAFE_SOURCE_DIRS = ["src", "api", "lib", "public"];
function collectSourceFiles(relativeDir, acc) {
  const fullDir = path.resolve(ROOT_DIR, relativeDir);
  if (!fullDir.startsWith(ROOT_DIR + path.sep) || !fs.existsSync(fullDir)) {
    return;
  }
  const entries = fs.readdirSync(fullDir, { withFileTypes: true }).sort(
    (a, b) => a.name.localeCompare(b.name)
  );
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const relChild = path.posix.join(relativeDir, entry.name);
    if (relChild === "api/index.mjs") continue;
    const fullChild = path.resolve(ROOT_DIR, relChild);
    if (!fullChild.startsWith(ROOT_DIR + path.sep)) continue;
    if (entry.isDirectory()) {
      collectSourceFiles(relChild, acc);
    } else if (entry.isFile()) {
      acc.push(relChild);
    }
  }
}
function computeSourceFingerprint() {
  const hash = crypto.createHash("sha256");
  const fileList = [];
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
  return hash.digest("hex");
}
function readRootBaseRevision() {
  if (!fs.existsSync(ROOT_REVISION_FILE)) return 1;
  try {
    const raw = fs.readFileSync(ROOT_REVISION_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.sourceRevision === "number" && parsed.sourceRevision >= 1) {
      return Math.floor(parsed.sourceRevision);
    }
  } catch {
  }
  return 1;
}
function saveRevisionState(state) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(REVISION_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}
function getOrAdvanceSourceRevision() {
  const currentHash = computeSourceFingerprint();
  const baseRevision = readRootBaseRevision();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let state = null;
  if (fs.existsSync(REVISION_STATE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(REVISION_STATE_FILE, "utf-8"));
      if (typeof parsed.sourceRevision === "number" && typeof parsed.dataRevision === "number" && typeof parsed.lastSourceHash === "string") {
        state = {
          sourceRevision: Math.max(parsed.sourceRevision, baseRevision),
          dataRevision: Math.max(parsed.dataRevision, 1),
          lastSourceHash: parsed.lastSourceHash,
          updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso
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
      updatedAt: nowIso
    };
    saveRevisionState(state);
    return state;
  }
  if (state.lastSourceHash !== currentHash) {
    state = {
      ...state,
      sourceRevision: state.sourceRevision + 1,
      lastSourceHash: currentHash,
      updatedAt: nowIso
    };
    saveRevisionState(state);
  }
  return state;
}
function bumpDataRevision() {
  const current = getOrAdvanceSourceRevision();
  const next = {
    ...current,
    dataRevision: current.dataRevision + 1,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveRevisionState(next);
  return next;
}
function normalizeNameForCompare(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
function normalizePhoneForCompare(phone) {
  return phone.replace(/[\s\-().+]/g, "").trim();
}
async function geocodeThaiAddress(subdistrict, district, province) {
  const normalizedProvince = normalizeProvinceName(province);
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
  if (apiKey) {
    try {
      const addressParts = [
        subdistrict.trim() ? `\u0E15\u0E33\u0E1A\u0E25${subdistrict.trim().replace(/^(ตำบล|ต\.|แขวง)\s*/g, "")}` : "",
        district.trim() ? `\u0E2D\u0E33\u0E40\u0E20\u0E2D${district.trim().replace(/^(อำเภอ|อ\.|เขต)\s*/g, "")}` : "",
        normalizedProvince ? `\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14${normalizedProvince}` : "",
        "\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22"
      ].filter(Boolean).join(" ");
      const url = `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(
        addressParts
      )}?regionCode=th&languageCode=th`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "results.location,results.formattedAddress",
          "X-Goog-Maps-Solution-ID": "gmp_mcp_codeassist_v1_aistudio"
        },
        signal: AbortSignal.timeout(4e3)
      });
      if (res.ok) {
        const data = await res.json();
        const loc = data.results?.[0]?.location;
        if (typeof loc?.latitude === "number" && typeof loc?.longitude === "number") {
          return {
            lat: Number(loc.latitude.toFixed(6)),
            lng: Number(loc.longitude.toFixed(6))
          };
        }
      }
    } catch {
    }
  }
  return resolveThailandCoords(subdistrict, district, normalizedProvince);
}
function addSafeDirectoryToZip(zip, relativeDir) {
  const fullDir = path.resolve(ROOT_DIR, relativeDir);
  if (!fullDir.startsWith(ROOT_DIR + path.sep) || !fs.existsSync(fullDir)) {
    return;
  }
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
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
function createApiApp() {
  const app2 = express();
  app2.use(express.json());
  app2.get("/api/maps-config", requireAdmin, (_req, res) => {
    const apiKey = (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || "").trim();
    res.json({ apiKey });
  });
  app2.get("/api/revision", (_req, res) => {
    const revState = getOrAdvanceSourceRevision();
    res.json({ sourceRevision: revState.sourceRevision });
  });
  app2.get("/api/admin/status", (_req, res) => {
    const revState = getOrAdvanceSourceRevision();
    res.json({
      configured: isAdminConfigured(),
      sourceRevision: revState.sourceRevision
    });
  });
  app2.post("/api/admin/setup", (req, res) => {
    if (isAdminConfigured()) {
      res.status(409).json({ error: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 Admin \u0E16\u0E39\u0E01\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27" });
      return;
    }
    const rawPasscode = typeof req.body?.passcode === "string" ? req.body.passcode.trim() : "";
    const compactPasscode = normalizePasscodeSeparators(rawPasscode);
    const passcodeToStore = compactPasscode.length >= 6 ? compactPasscode : rawPasscode;
    if (passcodeToStore.length < 4) {
      res.status(400).json({ error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 4 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23" });
      return;
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(passcodeToStore, salt, 64).toString("hex");
    try {
      fs.writeFileSync(
        ADMIN_CRED_FILE,
        JSON.stringify({ salt, hash }, null, 2),
        { encoding: "utf-8", flag: "wx" }
      );
    } catch {
      res.status(409).json({ error: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 Admin \u0E16\u0E39\u0E01\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27" });
      return;
    }
    const token = issueAdminToken();
    res.status(201).json({ token });
  });
  app2.post("/api/admin/login", (req, res) => {
    const clientIp = req.ip || "unknown";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: "\u0E25\u0E2D\u0E07\u0E1C\u0E34\u0E14\u0E2B\u0E25\u0E32\u0E22\u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48" });
      return;
    }
    if (!isAdminConfigured()) {
      res.status(400).json({ error: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 Admin" });
      return;
    }
    const passcode = typeof req.body?.passcode === "string" ? req.body.passcode : "";
    if (!passcode || !verifyPasscode(passcode)) {
      res.status(401).json({ error: "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 Admin \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" });
      return;
    }
    const token = issueAdminToken();
    res.json({ token });
  });
  app2.get("/api/admin/revision", requireAdmin, (_req, res) => {
    const revState = getOrAdvanceSourceRevision();
    res.json({
      sourceRevision: revState.sourceRevision,
      dataRevision: revState.dataRevision,
      updatedAt: revState.updatedAt
    });
  });
  app2.get("/api/admin/download-source", requireAdmin, async (_req, res) => {
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
      zip.file(
        "revision.json",
        JSON.stringify(
          {
            sourceRevision: revState.sourceRevision,
            dataRevision: revState.dataRevision,
            updatedAt: revState.updatedAt
          },
          null,
          2
        )
      );
      const deployGuide = [
        `Revision: rev${revState.sourceRevision}`,
        "",
        "\u0E27\u0E34\u0E18\u0E35\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E41\u0E25\u0E30 Deploy \u0E02\u0E36\u0E49\u0E19 Vercel:",
        "1. \u0E41\u0E15\u0E01\u0E44\u0E1F\u0E25\u0E4C ZIP \u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E36\u0E49\u0E19 GitHub \u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E0A\u0E49 Vercel CLI (npx vercel)",
        "2. Framework Preset: Vite (vercel.json \u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 buildCommand, outputDirectory \u0E41\u0E25\u0E30 rewrites \u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27)",
        "3. \u0E40\u0E1E\u0E34\u0E48\u0E21 Environment Variables \u0E43\u0E19 Vercel Project Settings:",
        "   - VITE_GOOGLE_MAPS_API_KEY = <Google Maps API Key \u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13>",
        "   - ADMIN_PASSCODE = <\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19 Admin \u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23>",
        "4. \u0E01\u0E14 Deploy \u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35"
      ].join("\n");
      zip.file("VERCEL_DEPLOY.txt", deployGuide);
      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
      const filename = `my-freelance-vercel-source-rev${revState.sourceRevision}.zip`;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("X-Source-Revision", String(revState.sourceRevision));
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Source-Revision");
      res.send(zipBuffer);
    } catch {
      res.status(500).json({ error: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E44\u0E1F\u0E25\u0E4C Source Code ZIP \u0E44\u0E14\u0E49" });
    }
  });
  app2.get("/api/records", requireAdmin, (_req, res) => {
    const records = ensureStorage();
    const revState = getOrAdvanceSourceRevision();
    res.json({
      records,
      sourceRevision: revState.sourceRevision,
      dataRevision: revState.dataRevision
    });
  });
  app2.delete("/api/records", requireAdmin, (_req, res) => {
    saveRecords([]);
    const revState = bumpDataRevision();
    res.json({
      success: true,
      records: [],
      dataRevision: revState.dataRevision
    });
  });
  app2.post("/api/records", async (req, res) => {
    const { workType, name, phone, subdistrict, district, province } = req.body ?? {};
    if (workType !== "assembly" && workType !== "sales" || typeof name !== "string" || !name.trim() || typeof phone !== "string" || !phone.trim() || typeof subdistrict !== "string" || !subdistrict.trim() || typeof district !== "string" || !district.trim() || typeof province !== "string" || !province.trim()) {
      res.status(400).json({ error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E17\u0E38\u0E01\u0E0A\u0E48\u0E2D\u0E07" });
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
      return normName && rName === normName || normPhone && rPhone === normPhone;
    });
    if (existing) {
      const nameMatched = normalizeNameForCompare(existing.name) === normName;
      const phoneMatched = normalizePhoneForCompare(existing.phone) === normPhone;
      const duplicateBy = nameMatched && phoneMatched ? "both" : nameMatched ? "name" : "phone";
      res.status(409).json({
        error: "\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27",
        code: "DUPLICATE_RECORD",
        duplicateBy
      });
      return;
    }
    const coords = await geocodeThaiAddress(cleanSubdistrict, cleanDistrict, cleanProvince);
    const newRecord = {
      id: `rec-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      workType,
      name: cleanName,
      phone: cleanPhone,
      subdistrict: cleanSubdistrict,
      district: cleanDistrict,
      province: cleanProvince,
      lat: coords.lat,
      lng: coords.lng,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    records.unshift(newRecord);
    saveRecords(records);
    const revState = bumpDataRevision();
    res.status(201).json({
      record: newRecord,
      dataRevision: revState.dataRevision,
      summary: { id: newRecord.id, name: newRecord.name, workType: newRecord.workType }
    });
  });
  app2.patch("/api/records/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const records = ensureStorage();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49" });
      return;
    }
    const current = records[idx];
    const body = req.body ?? {};
    const updatedWorkType = body.workType === "assembly" || body.workType === "sales" ? body.workType : current.workType;
    const updatedName = typeof body.name === "string" && body.name.trim() ? body.name.trim() : current.name;
    const updatedPhone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : current.phone;
    const updatedSubdistrict = typeof body.subdistrict === "string" && body.subdistrict.trim() ? body.subdistrict.trim() : current.subdistrict;
    const updatedDistrict = typeof body.district === "string" && body.district.trim() ? body.district.trim() : current.district;
    const updatedProvince = typeof body.province === "string" && body.province.trim() ? normalizeProvinceName(body.province) : current.province;
    const normName = normalizeNameForCompare(updatedName);
    const normPhone = normalizePhoneForCompare(updatedPhone);
    const duplicateOther = records.find((r) => {
      if (r.id === id) return false;
      return normName && normalizeNameForCompare(r.name) === normName || normPhone && normalizePhoneForCompare(r.phone) === normPhone;
    });
    if (duplicateOther) {
      res.status(409).json({
        error: "\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27",
        code: "DUPLICATE_RECORD"
      });
      return;
    }
    const addressChanged = updatedSubdistrict !== current.subdistrict || updatedDistrict !== current.district || updatedProvince !== current.province;
    const coords = addressChanged ? await geocodeThaiAddress(updatedSubdistrict, updatedDistrict, updatedProvince) : { lat: current.lat, lng: current.lng };
    const updated = {
      ...current,
      workType: updatedWorkType,
      name: updatedName,
      phone: updatedPhone,
      subdistrict: updatedSubdistrict,
      district: updatedDistrict,
      province: updatedProvince,
      lat: coords.lat,
      lng: coords.lng
    };
    records[idx] = updated;
    saveRecords(records);
    const revState = bumpDataRevision();
    res.json({ record: updated, dataRevision: revState.dataRevision });
  });
  app2.delete("/api/records/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const records = ensureStorage();
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length === records.length) {
      res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49" });
      return;
    }
    saveRecords(filtered);
    const revState = bumpDataRevision();
    res.json({ success: true, dataRevision: revState.dataRevision });
  });
  return app2;
}

// api/_app.ts
var app = createApiApp();
var app_default = app;
export {
  app_default as default
};
