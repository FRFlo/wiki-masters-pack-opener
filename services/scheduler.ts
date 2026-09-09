import {
	getSetting,
	listAccounts,
	listKeywords,
	listSchedules,
	recordEvent,
	setSetting,
} from "./db";
import { WikiMasters } from "./wiki";

function scheduleActive(accountId: number, module: string, now: Date) {
	// Schedules are optional; enabled schedules constrain the module's window.
	const schedule = listSchedules(accountId).find((item) => item.module === module);
	if (!schedule || !schedule.enabled) return true;
	const current = now.getHours() * 60 + now.getMinutes();
	const [startHour, startMinute] = schedule.start_time.split(":").map(Number);
	const [endHour, endMinute] = schedule.end_time.split(":").map(Number);
	const start = startHour * 60 + startMinute;
	const end = endHour * 60 + endMinute;
	return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

export async function runScheduler() {
	for (const account of listAccounts()) {
		const api = new WikiMasters(account);
		const now = new Date();
		if (
			getSetting(account.id, "pack_enabled", false) &&
			scheduleActive(account.id, "pack", now)
		) {
			const last = getSetting(account.id, "last_pack_at", 0);
			if (Date.now() - last >= getSetting(account.id, "pack_cooldown_ms", 180000)) {
				try {
					const data = await api.openPack();
					setSetting(account.id, "last_pack_at", Date.now());
					recordEvent(account.id, "pack_opened", data);
				} catch {}
			}
		}
		if (
			getSetting(account.id, "market_enabled", false) &&
			scheduleActive(account.id, "market", now)
		) {
			try {
				const data: any = await api.market();
				for (const auction of data?.auctions || []) {
					const title = String(auction.card?.wikipedia_title || "").toLowerCase();
					const keyword = listKeywords(account.id).find(
						(k) =>
							k.enabled !== 0 &&
							["priority", "hunter"].includes(k.kind) &&
							title.includes(k.text),
					);
					const price = auction.current_bid ?? auction.base_amount ?? 0;
					if (!keyword || (keyword.cap && price > keyword.cap)) continue;
					try {
						const amount = Math.max(price + 1, auction.min_next_bid || price + 1);
						await api.bid(auction.id, amount);
						recordEvent(account.id, "bid_auto", { auction: auction.id, amount });
					} catch {}
				}
			} catch {}
		}
		if (
			getSetting(account.id, "trash_enabled", false) &&
			scheduleActive(account.id, "trash", now)
		) {
			try {
				const data: any = await api.collection(0, 50, true);
				const tag = getSetting(account.id, "sell_tag", "Trash");
				const max = getSetting(account.id, "max_sales", 5);
				for (const card of (data?.collection || [])
					.filter((item: any) =>
						(item.tags || []).some((itemTag: any) => itemTag.name === tag),
					)
					.slice(0, max)) {
					try {
						await api.sell(
							card.card_id || card.card?.id,
							getSetting(account.id, "sell_price", 10),
							getSetting(account.id, "sell_duration", 10),
						);
						recordEvent(account.id, "sale_created", card);
					} catch {}
				}
			} catch {}
		}
	}
}

export function startScheduler(interval = Number(process.env.SCHEDULER_INTERVAL_MS || 180000)) {
	const timer = setInterval(() => void runScheduler(), interval);
	return () => clearInterval(timer);
}
