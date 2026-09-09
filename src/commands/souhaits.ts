import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { getAccount } from "../../services/db";
import { WikiMasters } from "../../services/wiki";
import type { SlashCommand } from "../../types";

export default {
	command: new SlashCommandBuilder()
		.setName("souhaits")
		.setDescription("Voir ma liste de souhaits"),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		await i.deferReply();
		const d: any = await r.api.wishlist(0);
		const cards = d?.cards || d?.data?.cards || [];
		return i.editReply(
			`⭐ **Ma liste de souhaits** (${d?.total ?? cards.length})\n` +
				(cards
					.slice(0, 30)
					.map(
						(x: any) =>
							`• ${x.wikipedia_title || x.title || x.id} — ${x.rarity || "?"}`,
					)
					.join("\n") || "Aucun souhait."),
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
