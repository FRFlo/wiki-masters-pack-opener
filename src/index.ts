import {
	Client,
	GatewayIntentBits,
	REST,
	Routes,
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";
import { AttachmentBuilder } from "discord.js";
import {
	deleteAccount,
	exportAccount,
	getAccount,
	listAccounts,
	listKeywords,
	listSchedules,
	recordEvent,
	setKeyword,
	setSchedule,
	setSetting,
	stats,
	upsertAccount,
	getSetting,
} from "./db";
import { WikiMasters } from "./wiki";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
if (!token || !clientId || !guildId)
	throw new Error("DISCORD_TOKEN, DISCORD_CLIENT_ID et DISCORD_GUILD_ID sont obligatoires.");

const commands = [
	new SlashCommandBuilder()
		.setName("compte")
		.setDescription("Configurer ton compte Wiki Masters")
		.addSubcommand((s) =>
			s
				.setName("connecter")
				.setDescription("Enregistrer un cookie de session")
				.addStringOption((o) =>
					o.setName("cookie").setDescription("Cookie HTTP de session").setRequired(true),
				),
		)
		.addSubcommand((s) =>
			s.setName("statut").setDescription("Tester la session et afficher le compte"),
		)
		.addSubcommand((s) => s.setName("supprimer").setDescription("Supprimer tes identifiants")),
	new SlashCommandBuilder()
		.setName("pack")
		.setDescription("Pack Opener")
		.addSubcommand((s) => s.setName("ouvrir").setDescription("Ouvrir un pack maintenant"))
		.addSubcommand((s) =>
			s
				.setName("auto")
				.setDescription("Activer ou désactiver l’ouverture automatique")
				.addBooleanOption((o) =>
					o.setName("active").setDescription("État").setRequired(true),
				),
		),
	new SlashCommandBuilder()
		.setName("marche")
		.setDescription("Market Watcher")
		.addSubcommand((s) => s.setName("scan").setDescription("Scanner les enchères"))
		.addSubcommand((s) =>
			s
				.setName("miser")
				.setDescription("Placer une mise")
				.addStringOption((o) =>
					o.setName("enchere").setDescription("ID de l’enchère").setRequired(true),
				)
				.addIntegerOption((o) =>
					o.setName("montant").setDescription("Montant").setMinValue(1).setRequired(true),
				),
		)
		.addSubcommand((s) =>
			s
				.setName("mot-cle")
				.setDescription("Ajouter un mot-clé")
				.addStringOption((o) =>
					o
						.setName("type")
						.setDescription("Catégorie")
						.setRequired(true)
						.addChoices(
							{ name: "standard", value: "alert" },
							{ name: "prioritaire", value: "priority" },
							{ name: "fourbe", value: "fourbe" },
							{ name: "exclus", value: "exclude" },
							{ name: "chasseur", value: "hunter" },
						),
				)
				.addStringOption((o) =>
					o.setName("texte").setDescription("Texte, séparé par ;").setRequired(true),
				)
				.addIntegerOption((o) =>
					o.setName("plafond").setDescription("Plafond du chasseur"),
				),
		)
		.addSubcommand((s) => s.setName("mots-cles").setDescription("Lister les mots-clés")),
	new SlashCommandBuilder()
		.setName("vente")
		.setDescription("Trash Seller HTTP")
		.addSubcommand((s) => s.setName("lancer").setDescription("Vendre les cartes taguées Trash"))
		.addSubcommand((s) =>
			s
				.setName("configurer")
				.setDescription("Configurer le tag et le plafond")
				.addStringOption((o) =>
					o.setName("tag").setDescription("Nom du tag").setRequired(true),
				)
				.addIntegerOption((o) =>
					o
						.setName("max")
						.setDescription("Ventes simultanées")
						.setMinValue(1)
						.setMaxValue(50)
						.setRequired(true),
				),
		),
	new SlashCommandBuilder()
		.setName("collection")
		.setDescription("Collection et étiquetage")
		.addSubcommand((s) =>
			s
				.setName("chercher")
				.setDescription("Chercher des cartes")
				.addStringOption((o) =>
					o.setName("texte").setDescription("Mots-clés séparés par ;").setRequired(true),
				),
		)
		.addSubcommand((s) => s.setName("doublons").setDescription("Lister les doublons"))
		.addSubcommand((s) =>
			s
				.setName("taguer")
				.setDescription("Appliquer un tag aux cartes trouvées")
				.addStringOption((o) =>
					o.setName("tag").setDescription("Nom du tag").setRequired(true),
				)
				.addStringOption((o) =>
					o
						.setName("ids")
						.setDescription("IDs user_card séparés par ;")
						.setRequired(true),
				),
		),
	new SlashCommandBuilder().setName("stats").setDescription("Statistiques et santé du bot"),
	new SlashCommandBuilder()
		.setName("echange")
		.setDescription("Gérer un échange")
		.addSubcommand((s) =>
			s
				.setName("accepter")
				.setDescription("Accepter un échange")
				.addStringOption((o) =>
					o.setName("id").setDescription("ID de l’échange").setRequired(true),
				),
		),
	new SlashCommandBuilder()
		.setName("rarete")
		.setDescription("Vérifier une évolution de rareté")
		.addStringOption((o) =>
			o.setName("titre").setDescription("Titre Wikipédia exact").setRequired(true),
		),
	new SlashCommandBuilder()
		.setName("sauvegarde")
		.setDescription("Exporter la configuration SQLite")
		.addSubcommand((s) => s.setName("exporter").setDescription("Exporter tes paramètres")),
	new SlashCommandBuilder().setName("menu").setDescription("Afficher le panneau de contrôle"),
	new SlashCommandBuilder()
		.setName("planning")
		.setDescription("Planifier un module")
		.addStringOption((o) =>
			o.setName("module").setDescription("pack, market ou trash").setRequired(true),
		)
		.addStringOption((o) => o.setName("debut").setDescription("HH:MM").setRequired(true))
		.addStringOption((o) => o.setName("fin").setDescription("HH:MM").setRequired(true))
		.addBooleanOption((o) => o.setName("active").setDescription("Actif").setRequired(true)),
].map((c) =>
	c
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
		.toJSON(),
);

const rest = new REST({ version: "10" }).setToken(token);
await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function accountFor(i: ChatInputCommandInteraction) {
	return getAccount(i.user.id);
}
function api(i: ChatInputCommandInteraction) {
	const a = accountFor(i);
	return a ? new WikiMasters(a) : null;
}
function splitTerms(s: string) {
	return s
		.split(";")
		.map((x) => x.trim())
		.filter(Boolean);
}
async function reply(i: ChatInputCommandInteraction, content: string, ephemeral = false) {
	if (i.replied || i.deferred) return i.editReply(content);
	return i.reply({ content, ephemeral });
}
async function requireApi(i: ChatInputCommandInteraction) {
	const a = accountFor(i);
	if (!a) {
		await reply(i, "❌ Connecte ton compte avec `/compte connecter`.", true);
		return null;
	}
	return { api: new WikiMasters(a), account: a };
}

client.on("interactionCreate", async (i) => {
	if (i.isButton()) {
		const r = await requireApi(i as any);
		if (!r) return;
		if (i.customId === "wm_pack_open") {
			try {
				const d = await r.api.openPack();
				recordEvent(r.account.id, "pack_opened", d);
				return i.reply({ content: `📦 Pack ouvert !\n${formatData(d)}`, ephemeral: true });
			} catch (e: any) {
				return i.reply({ content: `❌ ${e.message}`, ephemeral: true });
			}
		}
		if (i.customId === "wm_market_scan") {
			try {
				const d = await r.api.market();
				return i.reply({
					content: `📡 ${d?.auctions?.length || 0} enchères trouvées.`,
					ephemeral: true,
				});
			} catch (e: any) {
				return i.reply({ content: `❌ ${e.message}`, ephemeral: true });
			}
		}
		if (i.customId === "wm_stats") {
			return i.reply({
				content:
					stats(r.account.id)
						.map((x) => `• ${x.type}: ${x.count}`)
						.join("\n") || "Aucun événement.",
				ephemeral: true,
			});
		}
		return;
	}
	if (!i.isChatInputCommand()) return;
	try {
		if (i.commandName === "compte") {
			const sub = i.options.getSubcommand();
			if (sub === "connecter") {
				const cookie = i.options.getString("cookie", true);
				upsertAccount(i.user.id, cookie);
				return reply(
					i,
					"✅ Session enregistrée. Le cookie est conservé uniquement dans la base SQLite.",
					true,
				);
			}
			if (sub === "supprimer") {
				const a = accountFor(i);
				if (a) deleteAccount(i.user.id);
				return reply(i, a ? "✅ Compte supprimé." : "Aucun compte configuré.", true);
			}
			const r = await requireApi(i);
			if (!r) return;
			const data = await r.api.balance();
			return reply(
				i,
				`✅ Session valide. Solde : **${data?.balance ?? data?.wikibidous ?? "?"}** 💰`,
				true,
			);
		}
		if (i.commandName === "planning") {
			const r = await requireApi(i);
			if (!r) return;
			setSchedule(
				r.account.id,
				i.options.getString("module", true),
				i.options.getBoolean("active", true),
				i.options.getString("debut", true),
				i.options.getString("fin", true),
			);
			return reply(i, "✅ Planning enregistré.", true);
		}
		if (i.commandName === "stats") {
			const r = await requireApi(i);
			if (!r) return;
			const rows = stats(r.account.id);
			return reply(
				i,
				`📊 **Statistiques**\n${rows.map((x) => `• ${x.type}: ${x.count}`).join("\n") || "Aucun événement."}`,
			);
		}
		if (i.commandName === "menu") {
			return i.reply({
				content: "🎛️ **Wiki Masters Bot**",
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId("wm_pack_open")
							.setLabel("Ouvrir un pack")
							.setStyle(ButtonStyle.Primary),
						new ButtonBuilder()
							.setCustomId("wm_market_scan")
							.setLabel("Scanner le marché")
							.setStyle(ButtonStyle.Secondary),
						new ButtonBuilder()
							.setCustomId("wm_stats")
							.setLabel("Statistiques")
							.setStyle(ButtonStyle.Success),
					),
				],
			});
		}
		if (i.commandName === "echange") {
			const r = await requireApi(i);
			if (!r) return;
			const id = i.options.getString("id", true);
			await r.api.acceptTrade(id);
			recordEvent(r.account.id, "trade_accepted", { id });
			return reply(i, "✅ Échange accepté.", true);
		}
		if (i.commandName === "rarete") {
			const r = await requireApi(i);
			if (!r) return;
			await i.deferReply();
			const title = i.options.getString("titre", true);
			const d: any = await r.api.monthlyViews(title);
			const views = d?.items?.[0]?.views ?? null;
			const rarity =
				views === null
					? "?"
					: views >= 20000
						? "L"
						: views >= 5000
							? "UR"
							: views >= 1000
								? "SR"
								: views >= 250
									? "R"
									: views >= 50
										? "PC"
										: "C";
			return i.editReply(
				`🔭 **${title}** : ${views ?? "?"} vues le mois dernier → rareté théorique **${rarity}**.`,
			);
		}
		if (i.commandName === "sauvegarde") {
			const r = await requireApi(i);
			if (!r) return;
			const file = Buffer.from(JSON.stringify(exportAccount(r.account.id), null, 2));
			return i.reply({
				content: "📤 Export de configuration et historique (cookie exclu).",
				files: [new AttachmentBuilder(file, { name: "wiki-masters-backup.json" })],
				ephemeral: true,
			});
		}
		const r = await requireApi(i);
		if (!r) return;
		const { api, account } = r;
		if (i.commandName === "pack") {
			const sub = i.options.getSubcommand();
			if (sub === "auto") {
				setSetting(account.id, "pack_enabled", i.options.getBoolean("active", true));
				return reply(i, "✅ Pack Opener mis à jour.");
			}
			await i.deferReply();
			const data = await api.openPack();
			recordEvent(account.id, "pack_opened", data);
			return i.editReply(`📦 Pack ouvert !\n${formatData(data)}`);
		}
		if (i.commandName === "marche") {
			const sub = i.options.getSubcommand();
			if (sub === "miser") {
				const id = i.options.getString("enchere", true),
					amount = i.options.getInteger("montant", true);
				await i.deferReply();
				const d = await api.bid(id, amount);
				recordEvent(account.id, "bid", d);
				return i.editReply(`✅ Mise de **${amount}** 💰 placée.\n${formatData(d)}`);
			}
			if (sub === "mot-cle") {
				const type = i.options.getString("type", true);
				for (const text of splitTerms(i.options.getString("texte", true)))
					setKeyword(account.id, {
						kind: type,
						text,
						cap: i.options.getInteger("plafond"),
					});
				return reply(i, "✅ Mots-clés enregistrés.");
			}
			if (sub === "mots-cles") {
				return reply(
					i,
					listKeywords(account.id)
						.map((k) => `• **${k.kind}**: ${k.text}${k.cap ? ` ≤ ${k.cap}` : ""}`)
						.join("\n") || "Aucun mot-clé.",
				);
			}
			await i.deferReply();
			const d = await api.market();
			const auctions = d?.auctions || [];
			return i.editReply({
				embeds: [
					new EmbedBuilder().setTitle(`📡 ${auctions.length} enchères`).setDescription(
						auctions
							.slice(0, 15)
							.map(
								(a: any) =>
									`**${a.card?.wikipedia_title || "?"}** — ${a.current_bid ?? a.base_amount ?? "?"} 💰 — ID [${a.id}]`,
							)
							.join("\n") || "Aucune enchère.",
					),
				],
			});
		}
		if (i.commandName === "vente") {
			const sub = i.options.getSubcommand();
			if (sub === "configurer") {
				setSetting(account.id, "sell_tag", i.options.getString("tag", true));
				setSetting(account.id, "max_sales", i.options.getInteger("max", true));
				return reply(i, "✅ Configuration Trash Seller enregistrée.");
			}
			await i.deferReply();
			const d = await api.collection(0, 50, true);
			const items = (d?.collection || []).filter((x: any) =>
				(x.tags || []).some(
					(t: any) => t.name === getSetting(account.id, "sell_tag", "Trash"),
				),
			);
			let done = 0;
			for (const x of items.slice(0, getSetting(account.id, "max_sales", 5))) {
				try {
					await api.sell(
						x.card_id || x.card?.id,
						getSetting(account.id, "sell_price", 10),
						getSetting(account.id, "sell_duration", 10),
					);
					done++;
					recordEvent(account.id, "sale_created", x);
				} catch {}
			}
			return i.editReply(`🗑️ ${done} mise(s) en vente envoyée(s) via HTTP.`);
		}
		if (i.commandName === "collection") {
			const sub = i.options.getSubcommand();
			await i.deferReply();
			const d = await api.collection(0, 50);
			const all = d?.collection || [];
			if (sub === "chercher") {
				const terms = splitTerms(i.options.getString("texte", true).toLowerCase());
				const hit = all.filter((x: any) =>
					terms.some((t) =>
						(x.card?.wikipedia_title || x.title || "").toLowerCase().includes(t),
					),
				);
				return i.editReply(
					`🔎 ${hit.length} résultat(s)\n${hit
						.slice(0, 30)
						.map(
							(x: any) =>
								`• ${x.card?.wikipedia_title || x.title || "?"} — [${x.id}]`,
						)
						.join("\n")}`,
				);
			}
			if (sub === "doublons") {
				const counts = new Map<string, number>();
				for (const x of all)
					counts.set(
						x.card_id || x.card?.id,
						(counts.get(x.card_id || x.card?.id) || 0) + 1,
					);
				return i.editReply(
					`🃏 Doublons : ${
						[...counts]
							.filter(([, n]) => n > 1)
							.map(([id, n]) => `• [${id}] ×${n}`)
							.join("\n") || "Aucun."
					}`,
				);
			}
			const ids = i.options.getString("ids", true).split(";").filter(Boolean);
			const tags = await api.userTags();
			const tag = tags?.find((x: any) => x.name === i.options.getString("tag", true));
			if (!tag) return i.editReply("❌ Tag introuvable.");
			await api.tagCards(ids, tag.id);
			return i.editReply(`🏷️ ${ids.length} carte(s) taguée(s).`);
		}
	} catch (e: any) {
		await reply(i, `❌ ${e.message || "Erreur inconnue"}`, true);
	}
});

async function scheduler() {
	for (const account of listAccounts()) {
		const api = new WikiMasters(account);
		const now = new Date();
		const schedules = new Map(listSchedules(account.id).map((s) => [s.module, s]));
		const active = (module: string) => {
			const s = schedules.get(module);
			if (!s || !s.enabled) return true;
			const current = now.getHours() * 60 + now.getMinutes();
			const [sh, sm] = s.start_time.split(":").map(Number);
			const [eh, em] = s.end_time.split(":").map(Number);
			const start = sh * 60 + sm,
				end = eh * 60 + em;
			return start <= end
				? current >= start && current <= end
				: current >= start || current <= end;
		};
		if (getSetting(account.id, "pack_enabled", false) && active("pack")) {
			const last = getSetting(account.id, "last_pack_at", 0);
			const cooldown = getSetting(account.id, "pack_cooldown_ms", 180_000);
			if (Date.now() - last >= cooldown)
				try {
					const d = await api.openPack();
					setSetting(account.id, "last_pack_at", Date.now());
					recordEvent(account.id, "pack_opened", d);
				} catch {}
		}
		if (active("market") && getSetting(account.id, "market_enabled", false)) {
			try {
				const d = await api.market();
				for (const a of d?.auctions || []) {
					const text = (a.card?.wikipedia_title || "").toLowerCase();
					const kw = listKeywords(account.id).find(
						(k) =>
							k.enabled !== 0 &&
							["alert", "priority", "fourbe", "hunter"].includes(k.kind) &&
							text.includes(k.text),
					);
					if (!kw || kw.kind === "alert") continue;
					const price = a.current_bid ?? a.base_amount ?? 0;
					if (kw.cap && price > kw.cap) continue;
					if (kw.kind === "priority" || kw.kind === "hunter")
						try {
							await api.bid(a.id, Math.max(price + 1, a.min_next_bid || price + 1));
							recordEvent(account.id, "bid_auto", {
								auction: a.id,
								amount: price + 1,
							});
						} catch {}
				}
			} catch {}
		}
		// Le POST de vente reste volontairement HTTP-only : l’API peut le refuser, l’erreur est ignorée et réessayée au prochain cycle.
		if (active("trash") && getSetting(account.id, "trash_enabled", false)) {
			try {
				const d = await api.collection(0, 50, true);
				const tag = getSetting(account.id, "sell_tag", "Trash");
				const max = getSetting(account.id, "max_sales", 5);
				for (const x of (d?.collection || [])
					.filter((v: any) => (v.tags || []).some((t: any) => t.name === tag))
					.slice(0, max))
					try {
						await api.sell(
							x.card_id || x.card?.id,
							getSetting(account.id, "sell_price", 10),
							getSetting(account.id, "sell_duration", 10),
						);
						recordEvent(account.id, "sale_created", x);
					} catch {}
			} catch {}
		}
	}
}
setInterval(scheduler, Number(process.env.SCHEDULER_INTERVAL_MS || 180_000));
client.once("ready", () =>
	console.log(`Wiki Masters Discord Bot connecté comme ${client.user?.tag}`),
);
await client.login(token);
function formatData(data: any) {
	const s = JSON.stringify(data);
	return s.length > 1800 ? s.slice(0, 1800) + "…" : s;
}
