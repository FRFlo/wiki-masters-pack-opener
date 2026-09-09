import { WikiMasters } from "../services/wiki";
import { getAccount } from "../services/db";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import { setSetting, recordEvent } from "../services/db";

import type { SlashCommand } from "../types";
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
		return i.editReply(
			`${sub === "bonus" ? "🎁 Pack bonus réclamé !" : "📦 Pack ouvert !"}\n${formatData(d)}`,
		);
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

const formatData = (data: unknown) => {
	const value = JSON.stringify(data);
	return value.length > 1800 ? `${value.slice(0, 1800)}…` : value;
};
