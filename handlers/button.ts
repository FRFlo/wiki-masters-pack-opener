import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Client } from "discord.js";
import type { ButtonCommand } from "../types";
export default async (client: Client) => {
	for (const f of readdirSync(join(import.meta.dirname, "../buttons")).filter((x) =>
		x.endsWith(".ts"),
	)) {
		const b: ButtonCommand = (await import(`../buttons/${f}`)).default;
		client.buttons.set(b.prefix, b);
	}
};
