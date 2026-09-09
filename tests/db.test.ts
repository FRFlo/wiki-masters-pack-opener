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
	removeKeyword,
	recordEvent,
	setKeyword,
	setSchedule,
	setSetting,
	stats,
	upsertAccount,
} = await import("../src/db");

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
		expect(listAccounts()).toHaveLength(2);
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

	test("deletes an account and cascades its data", () => {
		const account = getAccount("discord-a")!;
		deleteAccount(account.discord_user_id);
		expect(getAccount(account.discord_user_id)).toBeNull();
		expect(getSetting(account.id, "trash", "missing")).toBe("missing");
	});
});

afterAll(() => {
	for (const path of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) {
		try {
			unlinkSync(path);
		} catch {}
	}
});
