import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";

const databasePath = `${process.cwd()}/.tmp-test-${process.pid}.sqlite`;
process.env.DATABASE_PATH = databasePath;

const {
	db,
	deleteAccount,
	exportAccount,
	getAccount,
	getSetting,
	listKeywords,
	listSchedules,
	listAccounts,
	listAccountSessions,
	removeKeyword,
	clearCatalog,
	recordEvent,
	searchCatalog,
	setKeyword,
	setSchedule,
	setSetting,
	selectAccountSession,
	stats,
	upsertCatalog,
	upsertAccount,
} = await import("../services/db");

beforeAll(() => {
	db.exec("DELETE FROM accounts");
});

describe("SQLite persistence", () => {
	test("isolates accounts and updates cookies", () => {
		const first = upsertAccount("discord-a", "cookie-a", "A");
		upsertAccount("discord-b", "cookie-b", "B");
		const updated = upsertAccount("discord-a", "cookie-a2", "A2");

		expect(updated.cookie).toBe("cookie-a2");
		expect(getAccount("discord-a")?.name).toBe("A2");
		expect(listAccounts()).toHaveLength(3);
		expect(first.discord_user_id).toBe("discord-a");
	});

	test("persists settings, keywords, schedules, events, and exports without cookies", () => {
		const account = getAccount("discord-a")!;
		setSetting(account.id, "trash", { tag: "Trash", max: 5 });
		setKeyword(account.id, { kind: "hunter", text: "  Paris ", cap: 12 });
		setSchedule(account.id, "market", true, "08:00", "18:00");
		recordEvent(account.id, "pack_opened", { cards: 3 });

		expect(getSetting(account.id, "trash", null)).toEqual({ tag: "Trash", max: 5 });
		expect(listKeywords(account.id)[0]?.text).toBe("paris");
		expect(listSchedules(account.id)[0]?.enabled).toBe(1);
		expect(stats(account.id)[0]).toMatchObject({ type: "pack_opened", count: 1 });
		expect(exportAccount(account.id).events).toHaveLength(1);

		removeKeyword(account.id, "hunter", " PARIS ");
		expect(listKeywords(account.id)).toHaveLength(0);
	});

	test("supports several cookies and switches the active session", () => {
		upsertAccount("discord-b", "cookie-b-alt", "Secondaire");
		expect(listAccountSessions("discord-b")).toHaveLength(2);
		expect(getAccount("discord-b")?.cookie).toBe("cookie-b-alt");
		expect(selectAccountSession("discord-b", "B")).toBe(true);
		expect(getAccount("discord-b")?.cookie).toBe("cookie-b");
		expect(
			listAccounts().filter((account) => account.discord_user_id === "discord-b"),
		).toHaveLength(2);
	});

	test("deletes an account and cascades its data", () => {
		const account = getAccount("discord-a")!;
		deleteAccount(account.discord_user_id);
		expect(getAccount(account.discord_user_id)).toBeNull();
		expect(getSetting(account.id, "trash", "missing")).toBe("missing");
	});

	test("searches account-scoped autocomplete catalog", () => {
		const account = getAccount("discord-b")!;
		upsertCatalog(account.id, "card", "card-1", "Paris Saint-Germain", { rarity: "UR" });
		upsertCatalog(account.id, "card", "card-2", "Paris FC");
		upsertCatalog(account.id, "tag", "tag-1", "Trash");

		expect(searchCatalog(account.id, "card", "saint")).toHaveLength(1);
		expect(searchCatalog(account.id, "card", "card")).toHaveLength(2);
		expect(searchCatalog(account.id, "tag", "trash")[0]?.value).toBe("tag-1");
		expect(searchCatalog(getAccount("discord-a")?.id || 0, "card", "paris")).toHaveLength(0);
		clearCatalog(account.id, "card");
		expect(searchCatalog(account.id, "card", "paris")).toHaveLength(0);
	});
});

afterAll(() => {
	for (const path of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) {
		try {
			unlinkSync(path);
		} catch {}
	}
});
