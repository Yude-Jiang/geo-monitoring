import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import type { Observation, PromptStrategy } from "../src/types/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "geo-monitoring.db");

fs.mkdirSync(path.join(DATA_DIR, "screenshots"), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ─────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    target_visibility INTEGER DEFAULT 50,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS strategies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    intent TEXT NOT NULL,
    frequency TEXT NOT NULL,
    platforms TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL,
    platform TEXT NOT NULL,
    intent TEXT,
    intent_id TEXT,
    campaign_id TEXT,
    session_type TEXT DEFAULT 'anonymous',
    prompt_text TEXT NOT NULL,
    mentioned INTEGER DEFAULT 0,
    top_rec INTEGER DEFAULT 0,
    top_3_rec INTEGER DEFAULT 0,
    sentiment INTEGER DEFAULT 5,
    rank_position INTEGER DEFAULT 0,
    proposition_hits TEXT,
    fingerprint_matches TEXT,
    source_urls TEXT,
    competitor_mentions TEXT,
    status TEXT DEFAULT 'success',
    is_mock INTEGER DEFAULT 0,
    screenshot_path TEXT,
    raw_response TEXT
  );

  CREATE TABLE IF NOT EXISTS task_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL,
    platform TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    observation_id TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_obs_user_time ON observations(user_id, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_strat_user ON strategies(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_logs_user_time ON task_logs(user_id, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
`);

// Migrations for existing databases
try { db.exec(`ALTER TABLE strategies ADD COLUMN campaign_id TEXT`); } catch {}
try { db.exec(`ALTER TABLE observations ADD COLUMN campaign_id TEXT`); } catch {}

// Migration: add platforms column to existing strategies table
try {
  db.exec(`ALTER TABLE strategies ADD COLUMN platforms TEXT NOT NULL DEFAULT '[]'`);
} catch {}
try {
  db.exec(`ALTER TABLE strategies ADD COLUMN IF NOT EXISTS platforms TEXT NOT NULL DEFAULT '[]'`);
} catch {}

// Migration: per-strategy evaluation criteria (CSV import: pillar / proposition / anchor)
try { db.exec(`ALTER TABLE strategies ADD COLUMN strategic_pillar TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE strategies ADD COLUMN propositions TEXT NOT NULL DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE strategies ADD COLUMN expected_anchors TEXT NOT NULL DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE strategies ADD COLUMN fingerprints TEXT NOT NULL DEFAULT '[]'`); } catch {}

// Migration: group multiple samples of one run together
try { db.exec(`ALTER TABLE observations ADD COLUMN run_batch_id TEXT DEFAULT ''`); } catch {}

// ─── Prepared statements ────────────────────────────────────────────────────

const stmts = {
  // Users
  createUser: db.prepare(
    "INSERT INTO users (id, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)"
  ),
  getUser: db.prepare("SELECT * FROM users WHERE id = ?"),
  getAllUsers: db.prepare("SELECT id, display_name, created_at FROM users"),

  // Sessions
  createSession: db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ),
  getSession: db.prepare(
    "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ),
  deleteSession: db.prepare("DELETE FROM sessions WHERE token = ?"),

  // Campaigns
  insertCampaign: db.prepare(
    "INSERT INTO campaigns (id, user_id, name, description, target_visibility, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ),
  getCampaigns: db.prepare(
    "SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC"
  ),
  updateCampaign: db.prepare(
    "UPDATE campaigns SET name = ?, description = ?, target_visibility = ? WHERE id = ? AND user_id = ?"
  ),
  deleteCampaign: db.prepare("DELETE FROM campaigns WHERE id = ? AND user_id = ?"),

  // Strategies
  getStrategies: db.prepare(
    "SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at DESC"
  ),
  getStrategiesByCampaign: db.prepare(
    "SELECT * FROM strategies WHERE campaign_id = ? ORDER BY created_at DESC"
  ),
  insertStrategy: db.prepare(
    "INSERT INTO strategies (id, user_id, campaign_id, prompt, intent, frequency, platforms, strategic_pillar, propositions, expected_anchors, fingerprints, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ),
  updateStrategy: db.prepare(
    "UPDATE strategies SET prompt = ?, intent = ?, frequency = ?, platforms = ?, campaign_id = ?, strategic_pillar = ?, propositions = ?, expected_anchors = ?, fingerprints = ? WHERE id = ? AND user_id = ?"
  ),
  deleteStrategy: db.prepare("DELETE FROM strategies WHERE id = ? AND user_id = ?"),
  updateStrategyCampaign: db.prepare(
    "UPDATE strategies SET campaign_id = ? WHERE id = ?"
  ),

  // Observations
  getObservations: db.prepare(
    "SELECT * FROM observations WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50"
  ),
  getObservationsByCampaign: db.prepare(
    "SELECT * FROM observations WHERE campaign_id = ? ORDER BY timestamp DESC LIMIT 50"
  ),
  getObservationsSince: db.prepare(
    "SELECT * FROM observations WHERE user_id = ? AND timestamp > ? ORDER BY timestamp DESC"
  ),
  updateObservationCampaign: db.prepare(
    "UPDATE observations SET campaign_id = ? WHERE id = ?"
  ),
  insertObservation: db.prepare(
    `INSERT INTO observations (
      id, user_id, timestamp, platform, intent, intent_id, campaign_id,
      session_type, prompt_text, mentioned, top_rec, top_3_rec, sentiment,
      rank_position, proposition_hits, fingerprint_matches, source_urls,
      competitor_mentions, status, is_mock, screenshot_path, raw_response, run_batch_id
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )`
  ),
  deleteObservation: db.prepare(
    "DELETE FROM observations WHERE id = ? AND user_id = ?"
  ),

  // Task logs
  insertLog: db.prepare(
    "INSERT INTO task_logs (id, user_id, timestamp, platform, prompt, status, message, observation_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ),
  getLogs: db.prepare(
    "SELECT * FROM task_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100"
  ),

  // Maintenance
  cleanupSessions: db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')"),
  cleanupOldObservations: db.prepare(
    "DELETE FROM observations WHERE timestamp < ?"
  ),
  cleanupOldLogs: db.prepare(
    "DELETE FROM task_logs WHERE timestamp < ?"
  ),
};

// ─── Row → domain object ────────────────────────────────────────────────────

function rowToObservation(row: Record<string, unknown>): Observation {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    timestamp: row.timestamp as string,
    platform: row.platform as string,
    intent: row.intent as string,
    intent_id: row.intent_id as string | undefined,
    campaign_id: row.campaign_id as string | undefined,
    session_type: (row.session_type as "anonymous" | "logged_in") || "anonymous",
    prompt_text: row.prompt_text as string,
    mentioned: Boolean(row.mentioned),
    top_rec: Boolean(row.top_rec),
    top_3_rec: Boolean(row.top_3_rec),
    sentiment: row.sentiment as number,
    rank_position: row.rank_position as number | undefined,
    proposition_hits: row.proposition_hits ? JSON.parse(row.proposition_hits as string) : undefined,
    fingerprint_matches: row.fingerprint_matches ? JSON.parse(row.fingerprint_matches as string) : undefined,
    source_urls: row.source_urls ? JSON.parse(row.source_urls as string) : undefined,
    competitor_mentions: row.competitor_mentions ? JSON.parse(row.competitor_mentions as string) : undefined,
    status: row.status as string,
    is_mock: Boolean(row.is_mock),
    screenshot_url: row.screenshot_path as string | undefined,
    raw_response: row.raw_response as string | undefined,
    run_batch_id: (row.run_batch_id as string) || undefined,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

function asRow(obj: unknown): Record<string, unknown> {
  return obj as Record<string, unknown>;
}

export function getObservations(userId: string): Observation[] {
  return stmts.getObservations.all(userId).map(asRow).map(rowToObservation);
}

export function getObservationsSince(userId: string, since: string): Observation[] {
  return stmts.getObservationsSince.all(userId, since).map(asRow).map(rowToObservation);
}

export function addObservation(data: Record<string, unknown>): string {
  const id = uuid();
  stmts.insertObservation.run(
    id,
    data.userId,
    data.timestamp,
    data.platform,
    data.intent || "产品发现",
    data.intent_id || "",
    data.campaign_id || "",
    data.session_type || "anonymous",
    data.prompt_text,
    data.mentioned ? 1 : 0,
    data.top_rec ? 1 : 0,
    data.top_3_rec ? 1 : 0,
    data.sentiment ?? 5,
    data.rank_position ?? 0,
    JSON.stringify(data.proposition_hits || []),
    JSON.stringify(data.fingerprint_matches || []),
    JSON.stringify(data.source_urls || []),
    JSON.stringify(data.competitor_mentions || []),
    data.status || "success",
    data.is_mock ? 1 : 0,
    data.screenshot_path || "",
    data.raw_response || "",
    data.run_batch_id || ""
  );
  return id;
}

export function getObservationsByCampaign(campaignId: string): Observation[] {
  return stmts.getObservationsByCampaign.all(campaignId).map(asRow).map(rowToObservation);
}

export function deleteObservation(id: string, userId: string): boolean {
  const result = stmts.deleteObservation.run(id, userId);
  return result.changes > 0;
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string;
  target_visibility: number;
  created_at: string;
}

export function getCampaigns(userId: string): Campaign[] {
  return stmts.getCampaigns.all(userId).map(asRow).map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    name: r.name as string,
    description: r.description as string,
    target_visibility: r.target_visibility as number,
    created_at: r.created_at as string,
  }));
}

export function createCampaign(
  userId: string,
  name: string,
  description: string,
  targetVisibility: number
): Campaign {
  const id = uuid();
  const now = new Date().toISOString();
  stmts.insertCampaign.run(id, userId, name, description || "", targetVisibility || 50, now);
  return { id, user_id: userId, name, description: description || "", target_visibility: targetVisibility || 50, created_at: now };
}

export function updateCampaign(id: string, userId: string, name: string, description: string, targetVisibility: number): boolean {
  const result = stmts.updateCampaign.run(name, description || "", targetVisibility || 50, id, userId);
  return result.changes > 0;
}

export function deleteCampaign(id: string, userId: string): boolean {
  const result = stmts.deleteCampaign.run(id, userId);
  return result.changes > 0;
}

// ─── Migration: auto-create campaigns from existing intents ───────────────────

function runMigrations(): void {
  // Migrate: ensure each user has at least one default campaign,
  // and link orphaned strategies/observations to it.
  const orphanUsers = db.prepare(
    `SELECT DISTINCT user_id FROM strategies
     WHERE campaign_id IS NULL OR campaign_id = ''
     UNION
     SELECT DISTINCT user_id FROM observations
     WHERE campaign_id IS NULL OR campaign_id = ''`
  ).all().map(asRow);

  for (const u of orphanUsers) {
    const userId = u.user_id as string;
    // Get or create default campaign for this user
    let campaign = db.prepare(
      "SELECT id FROM campaigns WHERE user_id = ?"
    ).get(userId) as Record<string, unknown> | undefined;

    if (!campaign) {
      const c = createCampaign(userId, "默认监测项目", "自动创建的默认监测项目", 50);
      campaign = { id: c.id };
    }

    // Link orphan strategies
    db.prepare(
      "UPDATE strategies SET campaign_id = ? WHERE user_id = ? AND (campaign_id IS NULL OR campaign_id = '')"
    ).run(campaign.id, userId);

    // Link orphan observations
    db.prepare(
      "UPDATE observations SET campaign_id = ? WHERE user_id = ? AND (campaign_id IS NULL OR campaign_id = '')"
    ).run(campaign.id, userId);
  }
}

export function getStrategies(userId: string): PromptStrategy[] {
  const rows = stmts.getStrategies.all(userId).map(asRow);
  return rows.map(strategyRow);
}

export function getStrategiesByCampaign(campaignId: string): PromptStrategy[] {
  const rows = stmts.getStrategiesByCampaign.all(campaignId).map(asRow);
  return rows.map(strategyRow);
}

function strategyRow(r: Record<string, unknown>): PromptStrategy {
  return {
    id: r.id as string,
    prompt: r.prompt as string,
    intent: r.intent as string,
    frequency: r.frequency as string,
    platforms: r.platforms ? JSON.parse(r.platforms as string) : [],
    campaign_id: (r.campaign_id as string) || undefined,
    strategic_pillar: (r.strategic_pillar as string) || undefined,
    propositions: r.propositions ? JSON.parse(r.propositions as string) : [],
    expected_anchors: r.expected_anchors ? JSON.parse(r.expected_anchors as string) : [],
    fingerprints: r.fingerprints ? JSON.parse(r.fingerprints as string) : [],
    createdAt: r.created_at as string,
  };
}

export function addStrategy(
  userId: string,
  campaignId: string,
  prompt: string,
  intent: string,
  frequency: string,
  platforms: string[],
  strategicPillar = "",
  propositions: string[] = [],
  expectedAnchors: string[] = [],
  fingerprints: string[] = []
): PromptStrategy {
  const id = uuid();
  const createdAt = new Date().toISOString();
  stmts.insertStrategy.run(
    id, userId, campaignId, prompt, intent, frequency, JSON.stringify(platforms),
    strategicPillar, JSON.stringify(propositions), JSON.stringify(expectedAnchors), JSON.stringify(fingerprints),
    createdAt
  );
  return {
    id, campaign_id: campaignId, prompt, intent, frequency, platforms,
    strategic_pillar: strategicPillar, propositions, expected_anchors: expectedAnchors, fingerprints, createdAt,
  };
}

export function updateStrategy(
  id: string,
  userId: string,
  prompt: string,
  intent: string,
  frequency: string,
  platforms: string[],
  campaignId: string,
  strategicPillar = "",
  propositions: string[] = [],
  expectedAnchors: string[] = [],
  fingerprints: string[] = []
): boolean {
  const result = stmts.updateStrategy.run(
    prompt, intent, frequency, JSON.stringify(platforms), campaignId,
    strategicPillar, JSON.stringify(propositions), JSON.stringify(expectedAnchors), JSON.stringify(fingerprints),
    id, userId
  );
  return result.changes > 0;
}

export function deleteStrategy(id: string, userId: string): boolean {
  const result = stmts.deleteStrategy.run(id, userId);
  return result.changes > 0;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export function createUser(
  username: string,
  password: string,
  displayName: string
): { id: string; display_name: string } {
  const hash = bcrypt.hashSync(password, 10);
  stmts.createUser.run(username, hash, displayName, new Date().toISOString());
  return { id: username, display_name: displayName };
}

export function verifyUser(
  username: string,
  password: string
): { id: string; display_name: string } | null {
  const user = stmts.getUser.get(username) as Record<string, unknown> | undefined;
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash as string)) return null;
  return { id: user.id as string, display_name: user.display_name as string };
}

export function getUserDisplayName(username: string): string | null {
  const user = stmts.getUser.get(username) as Record<string, unknown> | undefined;
  return user ? (user.display_name as string) : null;
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export function createSession(userId: string): { token: string; expires_at: string } {
  const token = uuid();
  const created = new Date().toISOString();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  stmts.createSession.run(token, userId, created, expires);
  return { token, expires_at: expires };
}

export function getSession(token: string): { user_id: string } | null {
  const session = stmts.getSession.get(token) as Record<string, unknown> | undefined;
  if (!session) return null;
  return { user_id: session.user_id as string };
}

export function deleteSessionByToken(token: string): void {
  stmts.deleteSession.run(token);
}

// ─── Task Logs ──────────────────────────────────────────────────────────────

export function addTaskLog(
  userId: string,
  platform: string,
  prompt: string,
  status: string,
  message: string,
  observationId?: string
): void {
  stmts.insertLog.run(
    uuid(),
    userId,
    new Date().toISOString(),
    platform,
    prompt,
    status,
    message || "",
    observationId || ""
  );
}

export interface TaskLogEntry {
  id: string;
  user_id: string;
  timestamp: string;
  platform: string;
  prompt: string;
  status: string;
  message: string;
  observation_id: string;
}

export function getTaskLogs(userId: string): TaskLogEntry[] {
  return stmts.getLogs.all(userId).map(asRow).map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    timestamp: r.timestamp as string,
    platform: r.platform as string,
    prompt: r.prompt as string,
    status: r.status as string,
    message: r.message as string,
    observation_id: r.observation_id as string,
  }));
}

// ─── Maintenance ────────────────────────────────────────────────────────────

export function runMaintenance(): void {
  stmts.cleanupSessions.run();
  const sixMonthsAgo = new Date(
    Date.now() - 180 * 24 * 60 * 60 * 1000
  ).toISOString();
  const obsResult = stmts.cleanupOldObservations.run(sixMonthsAgo);
  if (obsResult.changes > 0) {
    console.log(`[DB] Cleaned up ${obsResult.changes} old observations (>6 months)`);
  }
  stmts.cleanupOldLogs.run(sixMonthsAgo);
}

// Seed admin user if configured
const adminUser = process.env.ADMIN_USER;
const adminPass = process.env.ADMIN_PASSWORD;
if (adminUser && adminPass) {
  const existing = stmts.getUser.get(adminUser);
  if (!existing) {
    createUser(adminUser, adminPass, "管理员");
    console.log(`[DB] Seeded admin user: ${adminUser}`);
  }
}

// Run migrations + maintenance at startup
runMigrations();
runMaintenance();
// And every 24 hours
setInterval(runMaintenance, 24 * 60 * 60 * 1000);

console.log(`[DB] SQLite ready: ${DB_PATH}`);
