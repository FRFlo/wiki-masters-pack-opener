import { readdirSync } from "node:fs";
import { join } from "node:path";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "../config";
import type { ButtonCommand, SlashCommand } from "../types";
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection<string, SlashCommand>();
client.buttons = new Collection<string, ButtonCommand>();
for (const f of readdirSync(join(import.meta.dirname, "../handlers")).filter((x) =>
	x.endsWith(".ts"),
))
	void import(`../handlers/${f}`).then((m) => m.default(client));
await client.login(config.token);
