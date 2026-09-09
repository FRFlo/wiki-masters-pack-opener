import type { BotEvent } from "../../types";
import { listAccounts } from "../../services/db";
import { syncCatalog } from "../../services/catalog";
const event: BotEvent<"clientReady"> = {
	name: "clientReady",
	once: true,
	execute: () => {
		const run = () => Promise.all(listAccounts().map((a) => syncCatalog(a))).catch(() => {});
		void run();
		setInterval(() => void run(), Number(process.env.CATALOG_SYNC_INTERVAL_MS || 900000));
	},
};
export default event;
