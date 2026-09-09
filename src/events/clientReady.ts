import { OAuth2Scopes, PermissionsBitField } from "discord.js";
import type { BotEvent } from "../../types";
const e: BotEvent<"clientReady"> = {
	name: "clientReady",
	once: true,
	execute: (c) => {
		const invite = c.generateInvite({
			scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
			permissions: [
				PermissionsBitField.Flags.SendMessages,
				PermissionsBitField.Flags.EmbedLinks,
			],
		});
		console.log(`Wiki Masters Discord Bot connecté comme ${c.user?.tag}`);
		console.log(`Lien d'installation du bot : ${invite}`);
	},
};
export default e;
