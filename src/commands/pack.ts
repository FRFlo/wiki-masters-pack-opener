import { WikiMasters } from "../../services/wiki";
import { getAccount } from "../../services/db";
import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { setSetting, recordEvent } from "../../services/db";

import type { SlashCommand } from "../../types";
export default {
	command: new SlashCommandBuilder()
		.setName("pack")
		.setDescription("Pack Opener")
		.addSubcommand((s) => s.setName("ouvrir").setDescription("Ouvrir un pack"))
		.addSubcommand((s) => s.setName("bonus").setDescription("Pack bonus"))
		.addSubcommand((s) =>
			s
				.setName("auto")
				.setDescription("Automatique")
				.addBooleanOption((o) =>
					o.setName("active").setDescription("Etat").setRequired(true),
				),
		),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		const sub = i.options.getSubcommand();
		if (sub === "auto") {
			setSetting(r.account.id, "pack_enabled", i.options.getBoolean("active", true));
			return reply(i, "✅ Pack Opener mis à jour.");
		}
		await i.deferReply();
		const d = sub === "bonus" ? await r.api.proDailyPack() : await r.api.openPack();
		recordEvent(r.account.id, sub === "bonus" ? "bonus_pack_opened" : "pack_opened", d);
		return i.editReply({ embeds: [packEmbed(d, sub === "bonus")] });
	},
} as SlashCommand;

const accountFor = (i: ChatInputCommandInteraction) => getAccount(i.user.id);
async function reply(i: ChatInputCommandInteraction, content: string, ephemeral = false) {
	return i.replied || i.deferred ? i.editReply(content) : i.reply({ content, ephemeral });
}
async function requireApi(i: ChatInputCommandInteraction) {
	const account = accountFor(i);
	if (!account) {
		await reply(i, "❌ Connecte ton compte avec `/compte connecter`.", true);
		return null;
	}
	return { account, api: new WikiMasters(account) };
}

const packEmbed = (data: any, bonus: boolean) => {
	const cards = data?.cards || data?.opened_cards || (data?.card ? [data.card] : []);
	const embed = new EmbedBuilder()
		.setColor(bonus ? 0xf1c40f : 0x5865f2)
		.setTitle(bonus ? "🎁 Pack bonus réclamé !" : "📦 Pack ouvert !")
		.setDescription(
			cards.length
				? "Voici les cartes obtenues :"
				: "Les cartes ont été ajoutées à ta collection.",
		)
		.addFields(
			...(data?.balance === undefined
				? []
				: [{ name: "Solde", value: `${data.balance} 💰`, inline: true }]),
		)
		.setTimestamp();
	for (const card of cards.slice(0, 25)) {
		embed.addFields({
			name: `${card.wikipedia_title || card.title || card.name || "Carte inconnue"} — ${card.rarity || "?"}`,
			value:
				[
					card.atk === undefined ? null : `⚔️ ATK : ${card.atk}`,
					card.def === undefined ? null : `🛡️ DEF : ${card.def}`,
					card.q_score === undefined ? null : `⭐ Score : ${card.q_score}`,
					card.pageviews === undefined ? null : `👁️ Vues : ${card.pageviews}`,
					card.category ? `🏷️ ${card.category}` : null,
				]
					.filter(Boolean)
					.join(" · ") || "Carte ajoutée à la collection.",
			inline: false,
		});
	}
	if (cards[0]?.image_url) embed.setThumbnail(cards[0].image_url);
	return embed;
};
