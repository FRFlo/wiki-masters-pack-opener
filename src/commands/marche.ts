import { WikiMasters } from "../../services/wiki";
import { getAccount } from "../../services/db";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { listKeywords, setKeyword, recordEvent } from "../../services/db";

import type { SlashCommand } from "../../types";
export default {
	command: new SlashCommandBuilder()
		.setName("marche")
		.setDescription("Market Watcher")
		.addSubcommand((s) => s.setName("scan").setDescription("Scanner"))
		.addSubcommand((s) => s.setName("mes-ventes").setDescription("Mes ventes"))
		.addSubcommand((s) =>
			s
				.setName("miser")
				.setDescription("Miser")
				.addStringOption((o) =>
					o
						.setName("enchere")
						.setDescription("ID")
						.setAutocomplete(true)
						.setRequired(true),
				)
				.addIntegerOption((o) =>
					o.setName("montant").setDescription("Montant").setMinValue(1).setRequired(true),
				),
		)
		.addSubcommand((s) =>
			s
				.setName("mot-cle")
				.setDescription("Ajouter")
				.addStringOption((o) => o.setName("type").setDescription("Type").setRequired(true))
				.addStringOption((o) =>
					o
						.setName("texte")
						.setDescription("Texte")
						.setAutocomplete(true)
						.setRequired(true),
				)
				.addIntegerOption((o) => o.setName("plafond").setDescription("Plafond")),
		)
		.addSubcommand((s) => s.setName("mots-cles").setDescription("Lister")),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		const sub = i.options.getSubcommand();
		if (sub === "mot-cle") {
			for (const text of splitTerms(i.options.getString("texte", true)))
				setKeyword(r.account.id, {
					kind: i.options.getString("type", true),
					text,
					cap: i.options.getInteger("plafond"),
				});
			return reply(i, "✅ Mots-clés enregistrés.");
		}
		if (sub === "mots-cles")
			return reply(
				i,
				listKeywords(r.account.id)
					.map((k) => `• **${k.kind}**: ${k.text}${k.cap ? ` ≤ ${k.cap}` : ""}`)
					.join("\n") || "Aucun mot-clé.",
			);
		await i.deferReply();
		if (sub === "miser") {
			const amount = i.options.getInteger("montant", true),
				d = await r.api.bid(i.options.getString("enchere", true), amount);
			recordEvent(r.account.id, "bid", d);
			return i.editReply(`✅ Mise de **${amount}** 💰 placée.\n${formatData(d)}`);
		}
		if (sub === "mes-ventes") {
			const a: any[] = await r.api.myActiveSales();
			return i.editReply(
				`💼 **Mes ventes actives : ${a.length}**\n${a
					.slice(0, 20)
					.map(
						(x) =>
							`• [${x.id}] ${x.snapshot_rarity || "?"} — ${x.current_bid ?? x.base_amount ?? "?"} 💰`,
					)
					.join("\n")}`,
			);
		}
		const d: any = await r.api.market();
		const a = d?.auctions || [];
		return i.editReply({
			embeds: [
				new EmbedBuilder().setTitle(`📡 ${a.length} enchères`).setDescription(
					a
						.slice(0, 15)
						.map(
							(x: any) =>
								`**${x.card?.wikipedia_title || "?"}** — ${x.current_bid ?? x.base_amount ?? "?"} 💰 — ID [${x.id}]`,
						)
						.join("\n") || "Aucune enchère.",
				),
			],
		});
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

const splitTerms = (value: string) =>
	value
		.split(";")
		.map((x) => x.trim())
		.filter(Boolean);

const formatData = (data: unknown) => {
	const value = JSON.stringify(data);
	return value.length > 1800 ? `${value.slice(0, 1800)}…` : value;
};
