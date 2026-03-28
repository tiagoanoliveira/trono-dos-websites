import type { Env } from '../index';
import { generateId } from '../utils/helpers';
import { sendStatusNotificationEmail } from './email';

export async function notifyStatusChange(
  env: Env,
  payload: {
    userId: string;
    email: string;
    kind: 'website' | 'category';
    entityId: string;
    name: string;
    status: 'approved' | 'rejected';
  },
) {
  const title = payload.status === 'approved' ? 'Submissão aprovada' : 'Submissão rejeitada';
  const message =
    payload.status === 'approved'
      ? `${payload.name} foi aprovada.`
      : `${payload.name} foi rejeitada.`;

  await env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, is_read, created_at)
     VALUES (?, ?, 'status_change', ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
  )
    .bind(generateId(), payload.userId, title, message, payload.kind, payload.entityId)
    .run();

  await sendStatusNotificationEmail(env, payload.email, {
    kind: payload.kind,
    name: payload.name,
    status: payload.status,
  });
}
