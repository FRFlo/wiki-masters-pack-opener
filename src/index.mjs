const endpoint = process.env.API_URL || 'https://www.wiki-masters.com/api/packs/open';
const intervalMs = parseDuration(process.env.INTERVAL || '1m');
const cookie = process.env.COOKIE;

if (!cookie) {
  console.error('COOKIE est obligatoire (cookie de session wiki-masters.com).');
  process.exit(1);
}

const abortAfterMs = parseDuration(process.env.REQUEST_TIMEOUT || '30s');

function parseDuration(value) {
  const match = /^([1-9]\d*)(ms|s|m|h|d)?$/i.exec(String(value).trim());
  if (!match) throw new Error(`Durée invalide: ${value}`);
  const amount = Number(match[1]);
  const multipliers = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (multipliers[(match[2] || 'ms').toLowerCase()] || 1);
}

async function openPack() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), abortAfterMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Length': '0',
        Accept: '*/*',
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0'
      },
      signal: controller.signal
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    console.log(JSON.stringify({ at: new Date().toISOString(), status: response.status, data }));
  } catch (error) {
    console.error(JSON.stringify({ at: new Date().toISOString(), error: error.name === 'AbortError' ? 'timeout' : error.message }));
  } finally {
    clearTimeout(timeout);
  }
}

console.log(`Pack opener démarré: intervalle ${intervalMs} ms`);
await openPack();
setInterval(openPack, intervalMs);
