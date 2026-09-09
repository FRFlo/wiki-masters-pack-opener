import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { WikiMasters } from "../services/wiki";

const cookiePath = process.env.COOKIE_FILE || "cookie";
const cookie = existsSync(cookiePath) ? readFileSync(cookiePath, "utf8").trim() : "";
const enabled = process.env.RUN_LIVE_TESTS === "1" && cookie.length > 0;
const account = {
	id: 1,
	discord_user_id: "live-test",
	name: "Live test",
	cookie,
	timezone: "Europe/Paris",
	enabled: 1,
};

describe.skipIf(!enabled)("Wiki Masters authenticated API", () => {
	const wiki = new WikiMasters(account);

	test("reads the balance", async () => {
		const result = await wiki.balance();
		expect(result).toBeDefined();
	});

	test("reads marketplace and collection data", async () => {
		const [market, mine, collection] = await Promise.all([
			wiki.market(1, 1),
			wiki.mine(),
			wiki.collection(0, 1),
		]);
		expect(market).toBeDefined();
		expect(mine).toBeDefined();
		expect(collection).toBeDefined();
	});

	test("reads account analytics and personal market data", async () => {
		const [collectionStats, sales, wishes, notifications] = await Promise.all([
			wiki.collectionStats(),
			wiki.myActiveSales(),
			wiki.wishlist(0),
			wiki.notifications(),
		]);
		expect(collectionStats).toBeDefined();
		expect(sales).toBeArray();
		expect(wishes).toBeDefined();
		expect(notifications).toBeDefined();
	});

	test("reads guild and achievement data", async () => {
		const [guild, achievements] = await Promise.all([wiki.guildHome(), wiki.achievements()]);
		expect(guild).toBeDefined();
		expect(achievements).toBeArray();
	});
});
