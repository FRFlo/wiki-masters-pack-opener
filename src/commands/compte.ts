import { WikiMasters } from "../../services/wiki";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import { deleteAccount, getAccount, listAccountSessions, upsertAccount } from "../../services/db";

import type { SlashCommand } from "../../types";
const command: SlashCommand = {
	command: new SlashCommandBuilder()
		.setName("compte")
		.setDescription("Configurer ton compte Wiki Masters")
		.addSubcommand((s) =>
			s
				.setName("connecter")
				.setDescription("Enregistrer un cookie")
				.addStringOption((o) =>
					o.setName("cookie").setDescription("Cookie HTTP").setRequired(true),
				)
				.addStringOption((o) => o.setName("nom").setDescription("Nom de ce compte")),
		)
		.addSubcommand((s) => s.setName("lister").setDescription("Lister tes comptes"))
		.addSubcommand((s) => s.setName("statut").setDescription("Tester la session"))
		.addSubcommand((s) => s.setName("supprimer").setDescription("Supprimer tes identifiants")),
	execute: async (i) => {
		const sub = i.options.getSubcommand();
		if (sub === "connecter") {
			const name = i.options.getString("nom") || "Mon compte";
			upsertAccount(i.user.id, i.options.getString("cookie", true), name);
			return reply(
				i,
				`✅ Compte **${name}** enregistré et sélectionné. Le cookie reste uniquement dans SQLite.`,
				true,
			);
		}
		if (sub === "lister") {
			const sessions = listAccountSessions(i.user.id);
			return reply(
				i,
				sessions.length
					? sessions.map((s) => `${s.active ? "✅" : "▫️"} **${s.name}**`).join("\n")
					: "Aucun compte configuré.",
				true,
			);
		}
		if (sub === "supprimer") {
			const a = getAccount(i.user.id);
			if (a) deleteAccount(i.user.id);
			return reply(i, a ? "✅ Compte supprimé." : "Aucun compte configuré.", true);
		}
		const r = await requireApi(i);
		if (!r) return;
		const d = await r.api.balance();
		return reply(
			i,
			`✅ Session valide. Solde : **${d?.balance ?? d?.wikibidous ?? "?"}** 💰`,
			true,
		);
	},
};
export default command;

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
