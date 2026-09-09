import { Database } from "bun:sqlite";

export type Account = {
	id: number;
	discord_user_id: string;
	name: string;
	cookie: string;
	timezone: string;
	enabled: number;
	session_id?: number;
	session_name?: string;
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
CREATE TABLE IF NOT EXISTS account_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL,
  name TEXT NOT NULL, cookie TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, name), FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
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
CREATE TABLE IF NOT EXISTS catalog (
  account_id INTEGER NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL,
  label TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(account_id, kind, value),
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
`);
try {
	db.exec("ALTER TABLE accounts ADD COLUMN active_session_id INTEGER");
} catch {}
for (const account of db.query("SELECT id,name,cookie FROM accounts").all() as Account[]) {
	const session = db
		.query("SELECT id FROM account_sessions WHERE account_id=? ORDER BY id LIMIT 1")
		.get(account.id) as { id: number } | null;
	if (!session)
		db.query("INSERT INTO account_sessions(account_id,name,cookie) VALUES(?,?,?)").run(
			account.id,
			account.name,
			account.cookie,
		);
	const active = db
		.query("SELECT id FROM account_sessions WHERE account_id=? ORDER BY id LIMIT 1")
		.get(account.id) as { id: number };
	db.query("UPDATE accounts SET active_session_id=COALESCE(active_session_id,?) WHERE id=?").run(
		active.id,
		account.id,
	);
}

export function getAccount(discordUserId: string) {
	const account = db
		.query(
			`SELECT a.*, s.id session_id, s.name session_name, s.cookie session_cookie
			 FROM accounts a LEFT JOIN account_sessions s ON s.id=COALESCE(a.active_session_id,
			 (SELECT id FROM account_sessions WHERE account_id=a.id ORDER BY id LIMIT 1))
			 WHERE a.discord_user_id = ?`,
		)
		.get(discordUserId) as
		| (Account & { session_cookie?: string; session_name?: string })
		| null;
	if (!account) return null;
	return {
		...account,
		name: account.session_name || account.name,
		cookie: account.session_cookie || account.cookie,
	} as Account;
}
export function listAccounts() {
	return db
		.query(
			`SELECT a.*, s.id session_id, s.name session_name, s.cookie session_cookie
			 FROM accounts a JOIN account_sessions s ON s.account_id=a.id WHERE a.enabled=1`,
		)
		.all()
		.map((account: any) => ({ ...account, cookie: account.session_cookie })) as Account[];
}
export function upsertAccount(discordUserId: string, cookie: string, name = "Mon compte") {
	db.query(`INSERT INTO accounts(discord_user_id,name,cookie) VALUES(?,?,?)
    ON CONFLICT(discord_user_id) DO UPDATE SET updated_at=CURRENT_TIMESTAMP`).run(
		discordUserId,
		name,
		cookie,
	);
	const account = db
		.query("SELECT id FROM accounts WHERE discord_user_id=?")
		.get(discordUserId) as { id: number };
	db.query(`INSERT INTO account_sessions(account_id,name,cookie) VALUES(?,?,?)
    ON CONFLICT(account_id,name) DO UPDATE SET cookie=excluded.cookie,updated_at=CURRENT_TIMESTAMP`).run(
		account.id,
		name,
		cookie,
	);
	const session = db
		.query("SELECT id FROM account_sessions WHERE account_id=? AND name=?")
		.get(account.id, name) as { id: number };
	db.query("UPDATE accounts SET active_session_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(
		session.id,
		account.id,
	);
	return getAccount(discordUserId)!;
}
export function listAccountSessions(discordUserId: string) {
	return db
		.query(
			`SELECT s.id,s.name,s.created_at,s.updated_at,s.id=(a.active_session_id) active
			 FROM account_sessions s JOIN accounts a ON a.id=s.account_id
			 WHERE a.discord_user_id=? ORDER BY s.id`,
		)
		.all(discordUserId) as Array<{ id: number; name: string; active: number }>;
}
export function selectAccountSession(discordUserId: string, name: string) {
	return (
		db
			.query(
				`UPDATE accounts SET active_session_id=(SELECT s.id FROM account_sessions s
			 WHERE s.account_id=accounts.id AND lower(s.name)=lower(?)),updated_at=CURRENT_TIMESTAMP
			 WHERE discord_user_id=? AND EXISTS (SELECT 1 FROM account_sessions s JOIN accounts a2 ON a2.id=s.account_id
			 WHERE a2.discord_user_id=accounts.discord_user_id AND lower(s.name)=lower(?))`,
			)
			.run(name, discordUserId, name).changes > 0
	);
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
		keyword.text.trim().toLowerCase(),
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
		text.trim().toLowerCase(),
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
export function upsertCatalog(
	accountId: number,
	kind: string,
	value: string,
	label: string,
	metadata: unknown = {},
) {
	db.query(
		`INSERT INTO catalog(account_id,kind,value,label,metadata) VALUES(?,?,?,?,?)
    ON CONFLICT(account_id,kind,value) DO UPDATE SET label=excluded.label,metadata=excluded.metadata,updated_at=CURRENT_TIMESTAMP`,
	).run(accountId, kind, value, label, JSON.stringify(metadata));
}
export function searchCatalog(accountId: number, kind: string, query: string, limit = 25) {
	const pattern = `%${query.trim().toLowerCase()}%`;
	return db
		.query(
			"SELECT value,label,metadata FROM catalog WHERE account_id=? AND kind=? AND (lower(value) LIKE ? OR lower(label) LIKE ?) ORDER BY label,value LIMIT ?",
		)
		.all(accountId, kind, pattern, pattern, limit) as Array<{
		value: string;
		label: string;
		metadata: string;
	}>;
}
export function clearCatalog(accountId: number, kind: string) {
	db.query("DELETE FROM catalog WHERE account_id=? AND kind=?").run(accountId, kind);
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
