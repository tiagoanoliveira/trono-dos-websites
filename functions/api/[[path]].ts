import app from '@trono/api';
import { handle } from 'hono/cloudflare-pages';

export const onRequest = handle(app);
