import express, { type Request, type Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { geminiRouter } from './server/geminiRouter.ts';

dotenv.config({ quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// AI Studio / Cloud Run listens on PORT (defaults to 3000)
const portArgIndex = process.argv.indexOf('--port');
const port =
  portArgIndex !== -1 && process.argv[portArgIndex + 1]
    ? parseInt(process.argv[portArgIndex + 1], 10)
    : Number(process.env.PORT) || 3000;

// Increase JSON body limit to support base64-encoded PDF uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Mount all Gemini AI endpoints (shared with Vercel serverless handler in api/gemini/[action].ts)
app.use('/api/gemini', geminiRouter);

const httpServer = http.createServer(app);

/* ========================================================================== */
/* VITE MIDDLEWARE & STATIC ASSET SERVING                                      */
/* ========================================================================== */
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

httpServer.on('error', (err) => {
  console.error('Server error:', err);
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
