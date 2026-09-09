import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { getAccount } from "../services/db";
import { WikiMasters } from "../services/wiki";
import type { SlashCommand } from "../types";

export default {
	command: new SlashCommandBuilder()
		.setName("rarete")
		.setDescription("Vérifier une évolution de rareté")
		.addStringOption((o) =>
			o
				.setName("titre")
				.setDescription("Titre Wikipédia exact")
				.setAutocomplete(true)
				.setRequired(true),
		),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		await i.deferReply();
		const title = i.options.getString("titre", true);
		const d: any = await r.api.monthlyViews(title);
		const views = d?.items?.[0]?.views ?? null;
		const rarity =
			views === null
				? "?"
				: views >= 20000
					? "L"
					: views >= 5000
						? "UR"
						: views >= 1000
							? "SR"
							: views >= 250
								? "R"
								: views >= 50
									? "PC"
									: "C";
		return i.editReply(
			`🔭 **${title}** : ${views ?? "?"} vues le mois dernier → rareté théorique **${rarity}**.`,
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
