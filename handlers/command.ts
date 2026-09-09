import { readdirSync } from "node:fs";
import { join } from "node:path";
import { REST, Routes } from "discord.js";
import { config } from "../config";
import type { Client } from "discord.js";
import type { SlashCommand } from "../types";
export default async (client: Client) => {
	const all: any[] = [];
	for (const f of readdirSync(join(import.meta.dirname, "../commands")).filter(
		(x) => x.endsWith(".ts") && !x.startsWith("_"),
	)) {
		const c: SlashCommand = (await import(`../commands/${f}`)).default;
		client.commands.set(c.command.name, c);
		all.push(c.command.toJSON());
	}
	await new REST({ version: "10" })
		.setToken(config.token)
		.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: all });
};
