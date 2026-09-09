import type { BotEvent } from "../types";
const e: BotEvent<"clientReady"> = {
	name: "clientReady",
	once: true,
	execute: (c) => console.log(`Wiki Masters Discord Bot connecté comme ${c.user?.tag}`),
};
export default e;
