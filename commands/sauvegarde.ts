import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { exportAccount, getAccount } from "../services/db";
import { WikiMasters } from "../services/wiki";
import type { SlashCommand } from "../types";

export default {
	command: new SlashCommandBuilder()
		.setName("sauvegarde")
		.setDescription("Exporter la configuration SQLite")
		.addSubcommand((s) => s.setName("exporter").setDescription("Exporter tes paramètres")),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		const file = Buffer.from(JSON.stringify(exportAccount(r.account.id), null, 2));
		return i.reply({
			content: "📤 Export de configuration et historique (cookie exclu).",
			files: [new AttachmentBuilder(file, { name: "wiki-masters-backup.json" })],
			ephemeral: true,
		});
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
