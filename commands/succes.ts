import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { getAccount } from "../services/db";
import { WikiMasters } from "../services/wiki";
import type { SlashCommand } from "../types";

export default {
	command: new SlashCommandBuilder()
		.setName("succes")
		.setDescription("Voir les succès et récompenses"),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		await i.deferReply();
		const rows: any[] = await r.api.achievements();
		const unlocked = rows.filter((x) => x.progress?.unlocked_at).length;
		const claimable = rows.filter(
			(x) => x.progress?.unlocked_at && !x.progress?.claimed_at,
		).length;
		return i.editReply(
			`🏆 **Succès : ${unlocked}/${rows.length} débloqués** — ${claimable} récompense(s) à réclamer\n` +
				(rows
					.filter((x) => x.progress?.unlocked_at && !x.progress?.claimed_at)
					.slice(0, 15)
					.map((x) => `• ${x.title} — ${x.wikibidous_reward ?? "?"} 💰`)
					.join("\n") || "Aucune récompense en attente."),
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
