import { Database } from "bun:sqlite";

export type Account = {
	id: number;
	discord_user_id: string;
	name: string;
	cookie: string;
	timezone: string;
	enabled: number;
};

const db = new Database(process.env.DATABASE_PATH || "/data/wiki-masters.sqlite", { create: true });
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
db.exec(`
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, discord_user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Mon compte', cookie TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris', enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
  account_id INTEGER NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
  PRIMARY KEY(account_id, key), FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS keywords (
  account_id INTEGER NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL,
  cap INTEGER, mode TEXT, rarity TEXT, enabled INTEGER NOT NULL DEFAULT 1,
  auto_disable INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(account_id, kind, text),
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS schedules (
  account_id INTEGER NOT NULL, module TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
  start_time TEXT NOT NULL DEFAULT '00:00', end_time TEXT NOT NULL DEFAULT '23:59',
  PRIMARY KEY(account_id, module), FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, type TEXT NOT NULL,
  payload TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
`);

export function getAccount(discordUserId: string) {
	return db
		.query("SELECT * FROM accounts WHERE discord_user_id = ?")
		.get(discordUserId) as Account | null;
}
export function listAccounts() {
	return db.query("SELECT * FROM accounts WHERE enabled=1").all() as Account[];
}
export function upsertAccount(discordUserId: string, cookie: string, name = "Mon compte") {
	db.query(`INSERT INTO accounts(discord_user_id,name,cookie) VALUES(?,?,?)
    ON CONFLICT(discord_user_id) DO UPDATE SET cookie=excluded.cookie,name=excluded.name,updated_at=CURRENT_TIMESTAMP`).run(
		discordUserId,
		name,
		cookie,
	);
	return getAccount(discordUserId)!;
}
export function deleteAccount(discordUserId: string) {
	db.query("DELETE FROM accounts WHERE discord_user_id=?").run(discordUserId);
}
export function setSetting(accountId: number, key: string, value: unknown) {
	db.query(
		"INSERT INTO settings(account_id,key,value) VALUES(?,?,?) ON CONFLICT(account_id,key) DO UPDATE SET value=excluded.value",
	).run(accountId, key, JSON.stringify(value));
}
export function getSetting<T>(accountId: number, key: string, fallback: T): T {
	const row = db
		.query("SELECT value FROM settings WHERE account_id=? AND key=?")
		.get(accountId, key) as { value: string } | null;
	if (!row) return fallback;
	try {
		return JSON.parse(row.value) as T;
	} catch {
		return fallback;
	}
}
export function setKeyword(accountId: number, keyword: Omit<KeywordRow, "account_id">) {
	db.query(`INSERT INTO keywords(account_id,kind,text,cap,mode,rarity,enabled,auto_disable) VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(account_id,kind,text) DO UPDATE SET cap=excluded.cap,mode=excluded.mode,rarity=excluded.rarity,enabled=excluded.enabled,auto_disable=excluded.auto_disable`).run(
		accountId,
		keyword.kind,
		keyword.text.toLowerCase(),
		keyword.cap ?? null,
		keyword.mode ?? null,
		keyword.rarity ?? null,
		keyword.enabled ?? 1,
		keyword.auto_disable ?? 0,
	);
}
export type KeywordRow = {
	account_id?: number;
	kind: string;
	text: string;
	cap?: number | null;
	mode?: string | null;
	rarity?: string | null;
	enabled?: number;
	auto_disable?: number;
};
export function listKeywords(accountId: number) {
	return db
		.query("SELECT * FROM keywords WHERE account_id=? ORDER BY kind,text")
		.all(accountId) as KeywordRow[];
}
export function removeKeyword(accountId: number, kind: string, text: string) {
	db.query("DELETE FROM keywords WHERE account_id=? AND kind=? AND text=?").run(
		accountId,
		kind,
		text.toLowerCase(),
	);
}
export function setSchedule(
	accountId: number,
	module: string,
	enabled: boolean,
	start: string,
	end: string,
) {
	db.query(
		`INSERT INTO schedules(account_id,module,enabled,start_time,end_time) VALUES(?,?,?,?,?) ON CONFLICT(account_id,module) DO UPDATE SET enabled=excluded.enabled,start_time=excluded.start_time,end_time=excluded.end_time`,
	).run(accountId, module, enabled ? 1 : 0, start, end);
}
export function listSchedules(accountId: number) {
	return db.query("SELECT * FROM schedules WHERE account_id=?").all(accountId) as Array<{
		module: string;
		enabled: number;
		start_time: string;
		end_time: string;
	}>;
}
export function recordEvent(accountId: number, type: string, payload: unknown) {
	db.query("INSERT INTO events(account_id,type,payload) VALUES(?,?,?)").run(
		accountId,
		type,
		JSON.stringify(payload),
	);
}
export function stats(accountId: number) {
	return db
		.query(
			"SELECT type, COUNT(*) count FROM events WHERE account_id=? GROUP BY type ORDER BY count DESC",
		)
		.all(accountId) as Array<{ type: string; count: number }>;
}
export function exportAccount(accountId: number) {
	return {
		exportedAt: new Date().toISOString(),
		settings: db.query("SELECT key,value FROM settings WHERE account_id=?").all(accountId),
		keywords: db
			.query(
				"SELECT kind,text,cap,mode,rarity,enabled,auto_disable FROM keywords WHERE account_id=?",
			)
			.all(accountId),
		schedules: db
			.query("SELECT module,enabled,start_time,end_time FROM schedules WHERE account_id=?")
			.all(accountId),
		events: db
			.query(
				"SELECT type,payload,created_at FROM events WHERE account_id=? ORDER BY id DESC LIMIT 2000",
			)
			.all(accountId),
	};
}
export { db };
