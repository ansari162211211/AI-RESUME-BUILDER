import express from 'express';
import { geminiRouter } from '../../server/geminiRouter.ts';

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/api/gemini', geminiRouter);
app.use('/', geminiRouter);

export default app;
