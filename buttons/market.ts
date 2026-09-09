import type { ButtonCommand } from "../types";
import { getAccount } from "../services/db";
import { WikiMasters } from "../services/wiki";
export default {
	prefix: "wm_market_scan",
	execute: async (i) => {
		const a = getAccount(i.user.id);
		if (!a) return i.reply({ content: "❌ Connecte ton compte.", ephemeral: true });
		const d: any = await new WikiMasters(a).market();
		return i.reply({
			content: `📡 ${d?.auctions?.length || 0} enchères trouvées.`,
			ephemeral: true,
		});
	},
} as ButtonCommand;
