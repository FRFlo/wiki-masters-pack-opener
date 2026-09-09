import type { Interaction } from "discord.js";
import type { BotEvent } from "../types";
const e: BotEvent<"interactionCreate"> = {
	name: "interactionCreate",
	execute: (i: Interaction) => {
		if (i.isButton()) {
			const c = Array.from(i.client.buttons.values()).find((x) =>
				i.customId.startsWith(x.prefix),
			);
			if (c) void c.execute(i);
		} else if (i.isAutocomplete()) {
			const c = i.client.commands.get(i.commandName);
			if (c?.autocomplete) void c.autocomplete(i);
		} else if (i.isChatInputCommand()) {
			const c = i.client.commands.get(i.commandName);
			if (c) void c.execute(i);
		}
	},
};
export default e;
