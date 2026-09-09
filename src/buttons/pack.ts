import { EmbedBuilder } from "discord.js";
import type { ButtonCommand } from "../../types";
import { getAccount, recordEvent } from "../../services/db";
import { WikiMasters } from "../../services/wiki";
export default {
	prefix: "wm_pack_open",
	execute: async (i) => {
		const a = getAccount(i.user.id);
		if (!a) return i.reply({ content: "❌ Connecte ton compte.", ephemeral: true });
		try {
			const d = await new WikiMasters(a).openPack();
			recordEvent(a.id, "pack_opened", d);
			return i.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(0x5865f2)
						.setTitle("📦 Pack ouvert !")
						.setDescription(formatPackCards(d))
						.setTimestamp(),
				],
				ephemeral: true,
			});
		} catch (e) {
			return i.reply({ content: `❌ ${(e as Error).message}`, ephemeral: true });
		}
	},
} as ButtonCommand;

const formatPackCards = (data: any) => {
	const cards = data?.cards || data?.opened_cards || (data?.card ? [data.card] : []);
	return (
		cards
			.slice(0, 25)
			.map(
				(card: any) =>
					`**${card.wikipedia_title || card.title || card.name || "Carte inconnue"}** — ${card.rarity || "?"}` +
					(card.atk === undefined ? "" : ` · ⚔️ ${card.atk}`) +
					(card.def === undefined ? "" : ` · 🛡️ ${card.def}`) +
					(card.q_score === undefined ? "" : ` · ⭐ ${card.q_score}`),
			)
			.join("\n") || "Les cartes ont été ajoutées à ta collection."
	);
};
