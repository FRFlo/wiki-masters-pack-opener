import { SlashCommandBuilder } from "discord.js";
import { listAccountSessions, selectAccountSession } from "../../services/db";
import type { SlashCommand } from "../../types";

const command: SlashCommand = {
	command: new SlashCommandBuilder()
		.setName("account")
		.setDescription("Gérer tes comptes Wiki Masters")
		.addSubcommand((s) =>
			s
				.setName("select")
				.setDescription("Sélectionner le compte utilisé par les commandes")
				.addStringOption((o) =>
					o.setName("nom").setDescription("Nom du compte").setRequired(true),
				),
		)
		.addSubcommand((s) => s.setName("list").setDescription("Lister tes comptes")),
	execute: async (i) => {
		if (i.options.getSubcommand() === "list") {
			const sessions = listAccountSessions(i.user.id);
			return i.reply({
				content: sessions.length
					? sessions.map((s) => `${s.active ? "✅" : "▫️"} **${s.name}**`).join("\n")
					: "Aucun compte configuré.",
				ephemeral: true,
			});
		}
		const name = i.options.getString("nom", true);
		const selected = selectAccountSession(i.user.id, name);
		return i.reply({
			content: selected
				? `✅ Compte actif : **${name}**.`
				: `❌ Compte introuvable : **${name}**. Utilise "/account list".`,
			ephemeral: true,
		});
	},
};
export default command;
