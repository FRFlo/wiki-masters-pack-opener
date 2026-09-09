import type { Account } from './db';

const BASE = 'https://www.wiki-masters.com/api';
const SUPABASE_REF = 'cyrxjeppjqsxxjayfrur';
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co/rest/v1`;
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5cnhqZXBwanFzeHhqYXlmcnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODAzMzksImV4cCI6MjA4OTQ1NjMzOX0.BZluyXygNxuQGDPxFX1zG5i-cqp10CVK-8GGtuak4Rg';

export class WikiMasters {
  constructor(private account: Account) {}
  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${BASE}${path}`, { ...init, headers: { Accept: 'application/json', Cookie: this.account.cookie, ...(init.headers || {}) }, signal: AbortSignal.timeout(30_000) });
    const text = await response.text(); let data: any = text;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) throw new Error(`Wiki Masters HTTP ${response.status}: ${data?.error || text || response.statusText}`);
    return data;
  }
  openPack() { return this.request('/packs/open', { method: 'POST' }); }
  balance() { return this.request('/wikibidous'); }
  market(page = 1, limit = 50) { return this.request(`/marketplace?page=${page}&limit=${limit}&sort=ending_soon`); }
  auction(id: string) { return this.request(`/marketplace/${encodeURIComponent(id)}`); }
  bid(id: string, amount: number) { return this.request(`/marketplace/${encodeURIComponent(id)}/bid`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ amount }) }); }
  mine() { return this.request('/marketplace/mine'); }
  collection(page = 0, limit = 50, pending = false) { return this.request(`/my-collection?page=${page}&limit=${limit}&sort=rarity${pending ? '&pending=1' : ''}`); }
  sales(cardId: string) { return this.request(`/marketplace/cards/${encodeURIComponent(cardId)}/sales`); }
  sell(cardId: string, price: number, duration: number) { return this.request('/marketplace', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({card_id:cardId,base_amount:price,duration_minutes:duration}) }); }
  cancelAuction(id: string) { return this.request(`/marketplace/${encodeURIComponent(id)}`, { method:'DELETE' }); }
  trade(id: string) { return this.request(`/trades/${encodeURIComponent(id)}`); }
  acceptTrade(id: string) { return this.request(`/trades/${encodeURIComponent(id)}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'accept'}) }); }
  activeAuctions(userId: string) { return this.supabase(`auctions?seller_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=*&order=end_at.asc`); }
  wonAuctions(userId: string) { return this.supabase(`auctions?winner_id=eq.${encodeURIComponent(userId)}&select=*&order=settled_at.desc&limit=200`); }
  card(cardId: string) { return this.supabase(`cards?id=eq.${encodeURIComponent(cardId)}&select=*&limit=1`); }
  async monthlyViews(title: string) {
    const now = new Date(); const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-1, 1)); const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const enc = encodeURIComponent(title.replaceAll(' ', '_'));
    const r = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/${enc}/monthly/${start.toISOString().slice(0,10).replaceAll('-','')}/${end.toISOString().slice(0,10).replaceAll('-','')}`, { headers:{Accept:'application/json'}, signal:AbortSignal.timeout(30_000) });
    if (!r.ok) throw new Error(`Wikimedia HTTP ${r.status}`); return r.json();
  }
  async supabase(path: string, init: RequestInit = {}) {
    const response = await fetch(`${SUPABASE_URL}/${path}`, { ...init, headers:{apikey:SUPABASE_KEY, Authorization:`Bearer ${this.supabaseToken() || SUPABASE_KEY}`, Accept:'application/json', ...(init.headers || {})}, signal:AbortSignal.timeout(30_000) });
    const text = await response.text(); let data:any=text; try { data=text?JSON.parse(text):null; } catch {}
    if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${data?.message || text}`); return data;
  }
  private supabaseToken() {
    const key = `sb-${SUPABASE_REF}-auth-token`;
    const parts = Object.fromEntries(this.account.cookie.split(';').map(x=>x.trim().split('=' ,2)).filter(x=>x.length===2));
    let raw = parts[key];
    if (!raw) raw = Object.keys(parts).filter(k=>k.startsWith(`${key}.`)).sort().map(k=>parts[k]).join('');
    if (!raw) return '';
    try { raw=decodeURIComponent(raw); if(raw.startsWith('base64-')) raw=Buffer.from(raw.slice(7),'base64').toString(); const parsed=JSON.parse(raw); return parsed?.access_token || (Array.isArray(parsed)?parsed[0]:''); } catch { return raw.startsWith('eyJ') ? raw : ''; }
  }
  private userId() { const token=this.supabaseToken(); try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub || ''; } catch { return ''; } }
  userTags(userId = this.userId()) { return this.supabase(`tags?user_id=eq.${encodeURIComponent(userId)}&select=id,name&order=name.asc`); }
  createTag(userId: string, name: string) { return this.supabase('tags', {method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({user_id:userId,name})}); }
  tagCards(userCardIds: string[], tagId: string) { return this.supabase('user_card_tags?on_conflict=user_card_id%2Ctag_id&columns=%22user_card_id%22,%22tag_id%22', {method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify(userCardIds.map(user_card_id=>({user_card_id,tag_id:tagId}))) }); }
}
