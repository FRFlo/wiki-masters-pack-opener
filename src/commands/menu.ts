import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types";

export default {
	command: new SlashCommandBuilder()
		.setName("menu")
		.setDescription("Afficher le panneau de contrôle"),
	execute: async (i) =>
		i.reply({
			content: "🎛️ **Wiki Masters Bot**",
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("wm_pack_open")
						.setLabel("Ouvrir un pack")
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId("wm_market_scan")
						.setLabel("Scanner le marché")
						.setStyle(ButtonStyle.Secondary),
					new ButtonBuilder()
						.setCustomId("wm_stats")
						.setLabel("Statistiques")
						.setStyle(ButtonStyle.Success),
				),
			],
		}),
} as SlashCommand;
