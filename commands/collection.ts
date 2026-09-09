import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { getAccount } from "../services/db";
import { WikiMasters } from "../services/wiki";
import type { SlashCommand } from "../types";

const command: SlashCommand = {
	command: new SlashCommandBuilder()
		.setName("collection")
		.setDescription("Collection et étiquetage")
		.addSubcommand((s) =>
			s
				.setName("chercher")
				.setDescription("Chercher des cartes")
				.addStringOption((o) =>
					o.setName("texte").setDescription("Mots-clés séparés par ;").setRequired(true),
				),
		)
		.addSubcommand((s) => s.setName("doublons").setDescription("Lister les doublons"))
		.addSubcommand((s) =>
			s.setName("stats").setDescription("Voir les statistiques de collection"),
		)
		.addSubcommand((s) =>
			s
				.setName("taguer")
				.setDescription("Appliquer un tag")
				.addStringOption((o) =>
					o
						.setName("tag")
						.setDescription("Nom du tag")
						.setAutocomplete(true)
						.setRequired(true),
				)
				.addStringOption((o) =>
					o.setName("ids").setDescription("IDs séparés par ;").setRequired(true),
				),
		),
	execute: async (i) => {
		const r = await requireApi(i);
		if (!r) return;
		await i.deferReply();
		const sub = i.options.getSubcommand();
		if (sub === "stats") {
			const d: any = await r.api.collectionStats();
			const data = d?.stats || d?.data || d;
			return i.editReply(
				`📚 **Collection** : ${data?.total ?? "?"} cartes\n${formatData(data?.rarityCounts || data)}`,
			);
		}
		if (sub === "taguer") {
			const ids = splitTerms(i.options.getString("ids", true));
			const tags: any[] = await r.api.userTags();
			const tag = tags.find((x) => x.name === i.options.getString("tag", true));
			if (!tag) return i.editReply("❌ Tag introuvable.");
			await r.api.tagCards(ids, tag.id);
			return i.editReply(`🏷️ ${ids.length} carte(s) taguée(s).`);
		}
		const d: any = await r.api.collection(0, 50);
		const all: any[] = d?.collection || [];
		if (sub === "chercher") {
			const terms = splitTerms(i.options.getString("texte", true).toLowerCase());
			const hit = all.filter((x) =>
				terms.some((term) =>
					(x.card?.wikipedia_title || x.title || "").toLowerCase().includes(term),
				),
			);
			return i.editReply(
				`🔎 ${hit.length} résultat(s)\n${hit
					.slice(0, 30)
					.map((x) => `• ${x.card?.wikipedia_title || x.title || "?"} — [${x.id}]`)
					.join("\n")}`,
			);
		}
		const counts = new Map<string, number>();
		for (const x of all) {
			const id = x.card_id || x.card?.id;
			counts.set(id, (counts.get(id) || 0) + 1);
		}
		return i.editReply(
			`🃏 Doublons : ${
				[...counts]
					.filter(([, count]) => count > 1)
					.map(([id, count]) => `• [${id}] ×${count}`)
					.join("\n") || "Aucun."
			}`,
		);
	},
};

function splitTerms(value: string) {
	return value
		.split(";")
		.map((term) => term.trim())
		.filter(Boolean);
}
function formatData(data: unknown) {
	const value = JSON.stringify(data);
	return value.length > 1800 ? `${value.slice(0, 1800)}…` : value;
}
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

export default command;
