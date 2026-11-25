import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiRequest, ApiResponse } from './handlers.ts';

/** Adaptador HTTP compartido por las funciones de Vercel. */
export function wrapHandler(handler: (req: ApiRequest, res: ApiResponse) => void) {
  return async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const response: ApiResponse = {
      status(code) { res.statusCode = code; return response; },
      setHeader(name, value) { res.setHeader(name, value); },
      json(payload) { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(payload)); },
    };
    try {
      let body = req.body;
      if (body === undefined && !['GET', 'HEAD'].includes(req.method ?? 'GET')) {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buffer.length;
          if (size > 1024 * 1024) {
            response.status(413).json({ error: 'La solicitud supera 1 MB.' });
            return;
          }
          chunks.push(buffer);
        }
        const text = Buffer.concat(chunks).toString('utf8');
        if (text) {
          try { body = JSON.parse(text); }
          catch { response.status(400).json({ error: 'JSON malformado.' }); return; }
        }
      }
      const query = Object.fromEntries(new URL(req.url ?? '/', 'http://localhost').searchParams);
      handler({ method: req.method, query, body }, response);
    } catch (error) {
      console.error('Error en API SATED:', error);
      if (!res.writableEnded) response.status(500).json({ error: 'No se pudo procesar la solicitud.' });
    }
  };
}
