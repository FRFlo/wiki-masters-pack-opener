const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
if (!token || !clientId || !guildId)
	throw new Error("DISCORD_TOKEN, DISCORD_CLIENT_ID et DISCORD_GUILD_ID sont obligatoires.");
export const config = { token, clientId, guildId };
