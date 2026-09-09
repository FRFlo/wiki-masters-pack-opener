import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { getAccount } from "../../services/db";
import { WikiMasters } from "../../services/wiki";
import type { SlashCommand } from "../../types";

export default {
	command: new SlashCommandBuilder()
		.setName("guilde")
		.setDescription("Voir les souhaits et dons de la guilde"),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		await i.deferReply();
		const d: any = await r.api.guildHome();
		const h = d?.guild ? d : d?.data || {};
		const wishes = Array.isArray(h.wishlist) ? h.wishlist : [];
		const serveable = wishes.filter((x: any) => x.can_donate && !x.is_self).length;
		return i.editReply(
			`🏰 **${h.guild?.name || "Guilde"}**\n` +
				`Karma cette semaine : ${h.guild?.karma_this_week ?? "?"}\n` +
				`Dons : ${h.guild?.donations_this_week ?? "?"}\n` +
				`Cartes que tu peux donner : ${serveable}`,
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
