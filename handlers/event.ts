import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Client } from "discord.js";
import type { BotEvent } from "../types";
export default async (client: Client) => {
	for (const f of readdirSync(join(import.meta.dirname, "../events")).filter((x) =>
		x.endsWith(".ts"),
	)) {
		const e: BotEvent = (await import(`../events/${f}`)).default;
		if (e.once) client.once(e.name, (...a: any[]) => (e.execute as any)(...a));
		else client.on(e.name, (...a: any[]) => (e.execute as any)(...a));
	}
};
