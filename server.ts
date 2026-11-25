import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  handleHealth,
  handleMetadata,
  handlePredict,
  handlePredictBatch,
  handleZones,
} from './handlers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'JSON malformado en el cuerpo de la solicitud.' });
      return;
    }
    if (err && typeof err === 'object' && 'status' in err && err.status === 413) {
      res.status(413).json({ error: 'La solicitud supera el tamaño máximo permitido de 1 MB.' });
      return;
    }
    next(err);
  });

  app.all('/api/health', (req, res) => handleHealth(req, res));
  app.all('/api/model/metadata', (req, res) => handleMetadata(req, res));
  app.all('/api/zones', (req, res) => handleZones(req, res));
  app.all('/api/predict', (req, res) => handlePredict(req, res));
  app.all('/api/predict/batch', (req, res) => handlePredictBatch(req, res));
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Ruta de API no encontrada.' }); });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SATED server listening on http://localhost:${PORT}`);
  });
}

createServer();
