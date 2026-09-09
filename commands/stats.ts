import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { getAccount, stats as getStats } from "../services/db";
import { WikiMasters } from "../services/wiki";
import type { SlashCommand } from "../types";

export default {
	command: new SlashCommandBuilder()
		.setName("stats")
		.setDescription("Statistiques et santé du bot"),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		const rows = getStats(r.account.id);
		return reply(
			i,
			`📊 **Statistiques**\n${rows.map((x) => `• ${x.type}: ${x.count}`).join("\n") || "Aucun événement."}`,
		);
	},
} as SlashCommand;

async function reply(i: ChatInputCommandInteraction, content: string, ephemeral = false) {
	return i.replied || i.deferred ? i.editReply(content) : i.reply({ content, ephemeral });
}
async function requireApi(i: ChatInputCommandInteraction) {
	const account = getAccount(i.user.id);
	if (!account) {
		await reply(i, "❌ Connecte ton compte avec `/compte connecter`.", true);
		return null;
	}
	return { account, api: new WikiMasters(account) };
}
