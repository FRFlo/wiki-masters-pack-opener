import type { ButtonCommand } from "../types";
import { getAccount, recordEvent } from "../services/db";
import { WikiMasters } from "../services/wiki";
export default {
	prefix: "wm_pack_open",
	execute: async (i) => {
		const a = getAccount(i.user.id);
		if (!a) return i.reply({ content: "❌ Connecte ton compte.", ephemeral: true });
		try {
			const d = await new WikiMasters(a).openPack();
			recordEvent(a.id, "pack_opened", d);
			return i.reply({
				content: `📦 Pack ouvert !\n${JSON.stringify(d).slice(0, 1800)}`,
				ephemeral: true,
			});
		} catch (e) {
			return i.reply({ content: `❌ ${(e as Error).message}`, ephemeral: true });
		}
	},
} as ButtonCommand;
