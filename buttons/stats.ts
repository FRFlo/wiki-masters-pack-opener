import type { ButtonCommand } from "../types";
import { getAccount, stats } from "../services/db";
export default {
	prefix: "wm_stats",
	execute: (i) => {
		const a = getAccount(i.user.id);
		return i.reply({
			content: a
				? stats(a.id)
						.map((x) => `• ${x.type}: ${x.count}`)
						.join("\n") || "Aucun événement."
				: "❌ Connecte ton compte.",
			ephemeral: true,
		});
	},
} as ButtonCommand;
