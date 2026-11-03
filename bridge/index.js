/**
 * HALOFLUX Bridge — Host half: a loopback event relay.
 *
 * The Web client half (`client.js`) runs inside the Harness GUI page, where the
 * live session services are. It POSTs compact session snapshots to this Host
 * server every ~220ms; the server broadcasts them to SSE subscribers — the
 * desktop wallpaper page opened in Lively (WebView2) listens on `/stream`.
 *
 * Listens on 127.0.0.1 only. Everything is wrapped so a port clash or any
 * failure is silent: the bridge must never affect Harness itself. When no
 * Harness is running the wallpaper simply falls back to its pure-animation mode.
 */
import http from 'node:http';

export const HALOFLUX_BRIDGE_PORT = 52771;

let server = null;
const clients = new Set();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

export function apply() {
  if (server) return;
  try {
    server = http.createServer((req, res) => {
      const url = String(req.url || '');
      if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

      if (req.method === 'GET' && url.startsWith('/stream')) {
        cors(res);
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        res.write('retry: 2000\n\n');
        clients.add(res);
        const beat = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* gone */ } }, 15000);
        req.on('close', () => { clearInterval(beat); clients.delete(res); });
        return;
      }

      if (req.method === 'POST' && url.startsWith('/push')) {
        let body = '';
        let size = 0;
        req.on('data', (c) => {
          size += c.length;
          if (size > 2000000) { try { req.destroy(); } catch { /* gone */ } return; }
          body += c;
        });
        req.on('end', () => {
          try { JSON.parse(body); } catch {
            cors(res); res.writeHead(400); res.end('bad json'); return;
          }
          const frame = `data: ${body.replace(/[\r\n]+/g, ' ')}\n\n`;
          for (const c of clients) { try { c.write(frame); } catch { clients.delete(c); } }
          cors(res);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        });
        return;
      }

      if (req.method === 'GET' && url.startsWith('/ping')) {
        cors(res);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, clients: clients.size }));
        return;
      }

      cors(res);
      res.writeHead(404);
      res.end();
    });
    server.on('error', () => { server = null; /* port busy: stay silent */ });
    server.listen(HALOFLUX_BRIDGE_PORT, '127.0.0.1');
  } catch {
    server = null;
  }
}
