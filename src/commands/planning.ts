import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { getAccount, setSchedule } from "../../services/db";
import { WikiMasters } from "../../services/wiki";
import type { SlashCommand } from "../../types";

export default {
	command: new SlashCommandBuilder()
		.setName("planning")
		.setDescription("Planifier un module")
		.addStringOption((o) =>
			o.setName("module").setDescription("pack, market ou trash").setRequired(true),
		)
		.addStringOption((o) => o.setName("debut").setDescription("HH:MM").setRequired(true))
		.addStringOption((o) => o.setName("fin").setDescription("HH:MM").setRequired(true))
		.addBooleanOption((o) => o.setName("active").setDescription("Actif").setRequired(true)),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		setSchedule(
			r.account.id,
			i.options.getString("module", true),
			i.options.getBoolean("active", true),
			i.options.getString("debut", true),
			i.options.getString("fin", true),
		);
		return reply(i, "✅ Planning enregistré.", true);
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
