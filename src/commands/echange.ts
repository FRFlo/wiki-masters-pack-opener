import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { getAccount, recordEvent } from "../../services/db";
import { WikiMasters } from "../../services/wiki";
import type { SlashCommand } from "../../types";

export default {
	command: new SlashCommandBuilder()
		.setName("echange")
		.setDescription("Gérer un échange")
		.addSubcommand((s) =>
			s
				.setName("accepter")
				.setDescription("Accepter un échange")
				.addStringOption((o) =>
					o.setName("id").setDescription("ID de l’échange").setRequired(true),
				),
		),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		const id = i.options.getString("id", true);
		await r.api.acceptTrade(id);
		recordEvent(r.account.id, "trade_accepted", { id });
		return reply(i, "✅ Échange accepté.", true);
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
