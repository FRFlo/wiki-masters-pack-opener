const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
if (!token || !clientId) throw new Error("DISCORD_TOKEN et DISCORD_CLIENT_ID sont obligatoires.");
export const config = { token, clientId, guildId };
