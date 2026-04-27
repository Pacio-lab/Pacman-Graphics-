/**

- Pacman Graphics — Meshy API Proxy (Cloudflare Worker)
- 
- Nasconde la API key di Meshy lato server e gestisce CORS.
- 
- SETUP:
- 1. Vai su dash.cloudflare.com → Workers & Pages → Create → Hello World
- 1. Sostituisci tutto il codice con questo file
- 1. Vai in Settings → Variables → Add → “Secret”
- - Nome: MESHY_API_KEY
- - Valore: la tua chiave Meshy (msy_…)
- 1. (Opzionale) In Settings → Variables aggiungi anche:
- - Nome: ALLOWED_ORIGIN
- - Valore: https://tuousername.github.io
- Lascia vuoto o “*” per permettere tutti gli origini in fase di test.
- 1. Deploy. Copia l’URL del worker (es. https://pacman-meshy.tuonome.workers.dev)
- e mettilo nella costante MESHY_PROXY_URL dell’HTML.
  */

export default {
async fetch(request, env) {
const allowedOrigin = env.ALLOWED_ORIGIN || ‘*’;
const corsHeaders = {
‘Access-Control-Allow-Origin’: allowedOrigin,
‘Access-Control-Allow-Methods’: ‘GET, POST, OPTIONS’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Access-Control-Max-Age’: ‘86400’,
};

```
// Preflight CORS
if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: corsHeaders });
}

if (!env.MESHY_API_KEY) {
  return json({ error: 'Server: MESHY_API_KEY non configurata' }, 500, corsHeaders);
}

const url = new URL(request.url);
const path = url.pathname;

try {
  // POST /create — crea task text-to-3d
  if (request.method === 'POST' && path === '/create') {
    const body = await request.json();
    if (!body.prompt) return json({ error: 'prompt mancante' }, 400, corsHeaders);

    const r = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.MESHY_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'preview',
        prompt: body.prompt,
        art_style: body.art_style || 'realistic',
        should_remesh: true,
      }),
    });
    const data = await r.json();
    return json(data, r.status, corsHeaders);
  }

  // GET /status/<taskId>
  if (request.method === 'GET' && path.startsWith('/status/')) {
    const taskId = path.replace('/status/', '');
    if (!taskId) return json({ error: 'taskId mancante' }, 400, corsHeaders);

    const r = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d/' + taskId, {
      headers: { 'Authorization': 'Bearer ' + env.MESHY_API_KEY },
    });
    const data = await r.json();
    return json(data, r.status, corsHeaders);
  }

  // Healthcheck
  if (request.method === 'GET' && (path === '/' || path === '/health')) {
    return json({ ok: true, service: 'pacman-meshy-proxy' }, 200, corsHeaders);
  }

  return json({ error: 'Endpoint non trovato' }, 404, corsHeaders);
} catch (err) {
  return json({ error: err.message || 'Errore proxy' }, 500, corsHeaders);
}
```

},
};

function json(obj, status, headers) {
return new Response(JSON.stringify(obj), {
status,
headers: { ‘Content-Type’: ‘application/json’, …headers },
});
}
