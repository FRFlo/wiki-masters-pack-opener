import { readdirSync } from "node:fs";
import { join } from "node:path";
import { REST, Routes } from "discord.js";
import { config } from "../../config";
import type { Client } from "discord.js";
import type { SlashCommand } from "../../types";
export default async (client: Client) => {
	const all: any[] = [];
	for (const f of readdirSync(join(import.meta.dirname, "../commands")).filter(
		(x) => x.endsWith(".ts") && !x.startsWith("_"),
	)) {
		const c: SlashCommand = (await import(`../commands/${f}`)).default;
		client.commands.set(c.command.name, c);
		all.push(c.command.toJSON());
	}
	const rest = new REST({ version: "10" }).setToken(config.token);
	try {
		await rest.put(Routes.applicationCommands(config.clientId), { body: all });
		console.log(
			"Commandes slash globales enregistrées (serveurs privés et messages directs). ",
		);
	} catch (error) {
		console.error("Impossible d’enregistrer les commandes slash globales.", error);
	}
	if (config.guildId) {
		try {
			await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
				body: all,
			});
			console.log(`Commandes slash enregistrées dans le serveur ${config.guildId}.`);
		} catch (error) {
			console.error(
				`Impossible d’enregistrer les commandes dans ${config.guildId}. ` +
					"Vérifie que le bot a été ajouté à ce serveur et que DISCORD_GUILD_ID est correct.",
				error,
			);
		}
	}
};
