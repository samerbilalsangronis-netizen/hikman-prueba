import type { VercelRequest, VercelResponse } from '@vercel/node';

// Notificación por correo de la Bitácora de Trading, cuando una cuenta se
// acerca o rompe una regla de consistencia/límite (ver src/lib/tradingRules.ts
// para el cálculo — este endpoint solo envía el correo, no evalúa nada).
// El frontend llama a esto una sola vez por transición de severidad (ver
// deduplicación en TradingJournalContext.tsx) para no saturar el correo en
// cada render.
//
// Usa Resend (resend.com) — plan gratis, sin necesidad de verificar dominio
// propio si se manda desde "onboarding@resend.dev". Requiere en Vercel:
//   RESEND_API_KEY        — API key de resend.com
//   TRADING_ALERT_EMAIL   — a qué correo(s) avisar (uno o varios separados
//                           por coma, ej. "a@x.com, b@y.com")
// Si cualquiera de las dos falta, el endpoint devuelve 200 sin enviar nada
// (no rompe la carga de trades por no tener el correo configurado todavía).

interface AlertPayload {
  accountName: string;
  ruleLabel: string;
  severity: 'warning' | 'breached';
  message: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmails = (process.env.TRADING_ALERT_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  if (!apiKey || toEmails.length === 0) {
    res.status(200).json({ sent: false, reason: 'RESEND_API_KEY o TRADING_ALERT_EMAIL no configurados en Vercel.' });
    return;
  }

  const body = req.body as Partial<AlertPayload>;
  if (!body?.accountName || !body?.ruleLabel || !body?.severity || !body?.message) {
    res.status(400).json({ error: 'Falta accountName, ruleLabel, severity o message.' });
    return;
  }

  const severityLabel = body.severity === 'breached' ? '🔴 REGLA INCUMPLIDA' : '🟠 Cerca del límite';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Bitácora Hikman <onboarding@resend.dev>';

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmails,
        subject: `${severityLabel} — ${body.accountName} (${body.ruleLabel})`,
        html: `<p><strong>${body.accountName}</strong> — ${body.ruleLabel}</p><p>${body.message}</p>`,
      }),
    });
    if (!resendRes.ok) {
      const text = await resendRes.text();
      res.status(200).json({ sent: false, reason: `Resend: HTTP ${resendRes.status} ${text}` });
      return;
    }
    res.status(200).json({ sent: true });
  } catch (err) {
    res.status(200).json({ sent: false, reason: (err as Error).message });
  }
}
