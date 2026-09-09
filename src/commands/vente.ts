import { WikiMasters } from "../../services/wiki";
import { getAccount } from "../../services/db";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import { getSetting, setSetting, recordEvent } from "../../services/db";

import type { SlashCommand } from "../../types";
export default {
	command: new SlashCommandBuilder()
		.setName("vente")
		.setDescription("Trash Seller HTTP")
		.addSubcommand((s) => s.setName("lancer").setDescription("Vendre"))
		.addSubcommand((s) =>
			s
				.setName("configurer")
				.setDescription("Configurer")
				.addStringOption((o) =>
					o.setName("tag").setDescription("Tag").setAutocomplete(true).setRequired(true),
				)
				.addIntegerOption((o) =>
					o.setName("max").setDescription("Maximum").setRequired(true),
				),
		),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		if (i.options.getSubcommand() === "configurer") {
			setSetting(r.account.id, "sell_tag", i.options.getString("tag", true));
			setSetting(r.account.id, "max_sales", i.options.getInteger("max", true));
			return reply(i, "✅ Configuration Trash Seller enregistrée.");
		}
		await i.deferReply();
		const d: any = await r.api.collection(0, 50, true),
			tag = getSetting(r.account.id, "sell_tag", "Trash"),
			max = getSetting(r.account.id, "max_sales", 5);
		let done = 0;
		for (const x of (d?.collection || [])
			.filter((x: any) => (x.tags || []).some((t: any) => t.name === tag))
			.slice(0, max)) {
			try {
				await r.api.sell(
					x.card_id || x.card?.id,
					getSetting(r.account.id, "sell_price", 10),
					getSetting(r.account.id, "sell_duration", 10),
				);
				done++;
				recordEvent(r.account.id, "sale_created", x);
			} catch {}
		}
		return i.editReply(`🗑️ ${done} mise(s) en vente envoyée(s) via HTTP.`);
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
