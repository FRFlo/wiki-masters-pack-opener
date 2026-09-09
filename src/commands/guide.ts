import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types";

const sections = {
	demarrage: {
		title: "🚀 Démarrage",
		description:
			"Connecte un ou plusieurs comptes Wiki Masters. Les cookies restent privés et sont stockés dans SQLite.",
		fields: [
			{ name: "Connecter un compte", value: "`/compte connecter cookie nom`" },
			{ name: "Lister les comptes", value: "`/compte lister`" },
			{ name: "Changer de compte actif", value: "`/compte selectionner nom`" },
			{ name: "Tester la session", value: "`/compte statut`" },
		],
	},
	packs: {
		title: "📦 Packs",
		description: "Ouvre tes packs manuellement ou active l’ouverture automatique.",
		fields: [
			{ name: "Ouvrir un pack", value: "`/pack ouvrir`" },
			{ name: "Réclamer le pack bonus", value: "`/pack bonus`" },
			{ name: "Activer ou désactiver l’automatisation", value: "`/pack auto active:true`" },
		],
	},
	marche: {
		title: "🛒 Marché",
		description: "Surveille les enchères, mise et gère tes mots-clés.",
		fields: [
			{ name: "Scanner le marché", value: "`/marche scan`" },
			{ name: "Miser", value: "`/marche miser enchere:<id> montant:<montant>`" },
			{
				name: "Ajouter un mot-clé",
				value: "`/marche mot-cle type:hunter texte:paris plafond:10`",
			},
			{ name: "Voir tes ventes", value: "`/marche mes-ventes`" },
		],
	},
	collection: {
		title: "📚 Collection",
		description: "Recherche tes cartes, trouve les doublons et applique tes tags.",
		fields: [
			{ name: "Rechercher", value: "`/collection chercher texte:paris`" },
			{ name: "Voir les doublons", value: "`/collection doublons`" },
			{ name: "Statistiques", value: "`/collection stats`" },
			{ name: "Taguer des cartes", value: "`/collection taguer tag:Trash ids:<id1;id2>`" },
		],
	},
	automatisation: {
		title: "⚙️ Automatisation",
		description: "Configure les modules automatiques et leurs horaires.",
		fields: [
			{ name: "Configurer le planning", value: "`/planning configurer`" },
			{ name: "Activer le vendeur Trash", value: "`/vente auto active:true`" },
			{ name: "Voir les statistiques", value: "`/stats`" },
			{ name: "Ouvrir le panneau de contrôle", value: "`/menu`" },
		],
	},
} as const;

const command: SlashCommand = {
	command: new SlashCommandBuilder()
		.setName("guide")
		.setDescription("Afficher le guide du bot")
		.addStringOption((o) =>
			o
				.setName("section")
				.setDescription("Section à afficher")
				.addChoices(
					{ name: "Démarrage", value: "demarrage" },
					{ name: "Packs", value: "packs" },
					{ name: "Marché", value: "marche" },
					{ name: "Collection", value: "collection" },
					{ name: "Automatisation", value: "automatisation" },
				),
		),
	execute: async (i) => {
		const section = i.options.getString("section") as keyof typeof sections | null;
		const selected = section ? sections[section] : null;
		const embed = new EmbedBuilder()
			.setColor(0x5865f2)
			.setTitle(selected?.title || "📖 Guide Wiki Masters")
			.setDescription(
				selected?.description ||
					"Choisis une section avec l’option `section`, ou consulte les commandes principales ci-dessous.",
			)
			.setFooter({ text: "Les commandes sont utilisables en serveur et en message privé." })
			.setTimestamp();
		if (selected) embed.addFields(selected.fields as any);
		else
			embed.addFields(
				...Object.values(sections).map((item) => ({
					name: item.title,
					value: `${item.description}\nUtilise \`/guide section:${Object.entries(sections).find(([, value]) => value === item)?.[0]}\``,
				})),
			);
		return i.reply({ embeds: [embed], ephemeral: true });
	},
};

export default command;
