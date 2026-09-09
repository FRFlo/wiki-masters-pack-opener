import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { getAccount } from "../../services/db";
import { WikiMasters } from "../../services/wiki";
import type { SlashCommand } from "../../types";

export default {
	command: new SlashCommandBuilder()
		.setName("cote")
		.setDescription("Voir la cote d’une carte")
		.addStringOption((o) =>
			o
				.setName("carte")
				.setDescription("ID de la carte")
				.setAutocomplete(true)
				.setRequired(true),
		),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		await i.deferReply();
		const cardId = i.options.getString("carte", true);
		const d: any = await r.api.salesSummary(cardId);
		const summary = d?.summary || d;
		return i.editReply(
			`📈 **Cote ${cardId}**\n` +
				`Ventes : ${summary?.count ?? summary?.sales_count ?? "?"}\n` +
				`Dernier prix : ${summary?.last_price ?? "?"} 💰\n` +
				`Moyenne : ${summary?.average ?? summary?.avg_price ?? "?"} 💰\n` +
				`Min / max : ${summary?.min ?? "?"} / ${summary?.max ?? "?"} 💰`,
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
