import type { BotEvent } from "../types";
import { startScheduler } from "../services/scheduler";
const event: BotEvent<"clientReady"> = {
	name: "clientReady",
	once: true,
	execute: () => {
		startScheduler();
	},
};
export default event;
