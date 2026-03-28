import type { Env } from '../index';
import { Resend } from 'resend';

type ResendRecipient = string | string[];

async function sendWithResend(env: Env, payload: { to: ResendRecipient; subject: string; html: string }) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM || 'Trono dos Websites <noreply@trono.local>';

  if (!apiKey) {
    if (env.DEBUG_LOGS === 'true') {
      console.log('[email] RESEND_API_KEY missing, skipping email', payload.subject);
    }
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
  } catch (err) {
    console.error('[email] resend send failed', err);
  }
}

function appBaseUrl(env: Env) {
  return env.APP_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:5173';
}

export async function sendRegistrationEmail(env: Env, to: string, name: string) {
  await sendWithResend(env, {
    to,
    subject: 'Bem-vindo ao Trono dos Websites 👑',
    html: `<p>Olá ${name},</p><p>A tua conta foi criada com sucesso no Trono dos Websites.</p><p>Já podes entrar e contribuir para a comunidade.</p>`,
  });
}

export async function sendPasswordResetEmail(env: Env, to: string, token: string) {
  const link = `${appBaseUrl(env)}/esqueci-senha?token=${encodeURIComponent(token)}`;
  await sendWithResend(env, {
    to,
    subject: 'Recuperação de password',
    html: `<p>Recebemos um pedido para alterar a tua password.</p><p><a href="${link}">Clica aqui para continuar</a></p><p>Se não foste tu, ignora este email.</p>`,
  });
}

export async function sendStatusNotificationEmail(
  env: Env,
  to: string,
  payload: { kind: 'website' | 'category'; name: string; status: 'approved' | 'rejected' },
) {
  const statusLabel = payload.status === 'approved' ? 'aprovada' : 'rejeitada';
  const kindLabel = payload.kind === 'website' ? 'submissão de website' : 'sugestão de categoria';
  await sendWithResend(env, {
    to,
    subject: `Atualização da tua ${kindLabel}`,
    html: `<p>A tua ${kindLabel} <strong>${payload.name}</strong> foi <strong>${statusLabel}</strong>.</p>`,
  });
}
