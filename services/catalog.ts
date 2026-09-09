import type { Account } from "../services/db";
import { clearCatalog, upsertCatalog } from "../services/db";
import { WikiMasters } from "../services/wiki";

const MAX_COLLECTION_PAGES = 20;
const inFlight = new Set<number>();

function rows(data: any, key: string) {
	return Array.isArray(data?.[key])
		? data[key]
		: Array.isArray(data?.data?.[key])
			? data.data[key]
			: [];
}

export async function syncCatalog(account: Account, api = new WikiMasters(account)) {
	if (inFlight.has(account.id)) return;
	inFlight.add(account.id);
	try {
		const cards: Array<{ id: string; label: string; metadata: unknown }> = [];
		for (let page = 0; page < MAX_COLLECTION_PAGES; page++) {
			const data = await api.collection(page, 50);
			const collection = rows(data, "collection");
			for (const item of collection) {
				const card = item.card || item;
				const id = String(item.card_id || card.id || item.id || "");
				const label = String(card.wikipedia_title || card.title || id);
				if (id) cards.push({ id, label, metadata: { rarity: card.rarity || "?" } });
			}
			if (
				!collection.length ||
				(Number.isFinite(data?.total) && (page + 1) * 50 >= data.total)
			)
				break;
		}
		clearCatalog(account.id, "card");
		for (const card of cards)
			upsertCatalog(account.id, "card", card.id, card.label, card.metadata);

		const auctions: Array<{ id: string; label: string; metadata: unknown }> = [];
		for (const auction of rows(await api.recentMarket(0, 50), "auctions")) {
			const id = String(auction.id || "");
			const label = String(auction.card?.wikipedia_title || auction.card?.title || id);
			if (id) auctions.push({ id, label, metadata: { rarity: auction.card?.rarity || "?" } });
		}
		clearCatalog(account.id, "auction");
		for (const auction of auctions)
			upsertCatalog(account.id, "auction", auction.id, auction.label, auction.metadata);

		for (const tag of await api.userTags()) {
			if (tag?.id && tag?.name)
				upsertCatalog(account.id, "tag", String(tag.id), String(tag.name));
		}
	} finally {
		inFlight.delete(account.id);
	}
}
