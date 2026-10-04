import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Notificación por correo de la Bitácora de Trading (acción por defecto,
// sin ?action=) + Agente IA del Informe Diario de Mentoría (?action=
// mentor-analyze / mentor-synthesize, agregado 2-oct-2026). Viven en el
// mismo archivo porque Vercel Hobby tiene un tope de 12 Serverless
// Functions por deployment y ya estábamos en el límite exacto (ver
// headlines-sync.ts para el mismo patrón) — no están relacionados entre sí
// más que por compartir ese límite.
//
// --- Alerta de trading (sin cambios) ---------------------------------------
// Usa Resend (resend.com) — plan gratis, sin necesidad de verificar dominio
// propio si se manda desde "onboarding@resend.dev". Requiere en Vercel:
//   RESEND_API_KEY        — API key de resend.com
//   TRADING_ALERT_EMAIL   — a qué correo(s) avisar (uno o varios separados
//                           por coma, ej. "a@x.com, b@y.com")
// Si cualquiera de las dos falta, el endpoint devuelve 200 sin enviar nada
// (no rompe la carga de trades por no tener el correo configurado todavía).
//
// --- Agente IA de mentoría ---------------------------------------------
// Usa la API de Anthropic (console.anthropic.com). Requiere en Vercel:
//   ANTHROPIC_API_KEY     — API key de Anthropic
//   ANTHROPIC_MODEL       — opcional, default 'claude-sonnet-5'
// mentor-analyze es sin estado (recibe texto, devuelve el análisis — lo
// persiste el cliente via JournalContext.setAiAnalysis). mentor-synthesize
// SÍ persiste directo en Supabase (mentor_weekly_syntheses) porque también
// lo dispara un cron de GitHub Actions los viernes sin navegador de por
// medio (ver .github/workflows/sync-mentor-weekly.yml).
//
// --- Agenda Semanal: recordatorio por correo (4-oct-2026) -----------------
// Dispara un cron de GitHub Actions cada 15 min (ver
// .github/workflows/sync-calendar-reminders.yml), sin navegador de por
// medio. Reusa Resend (RESEND_API_KEY, igual que la alerta de trading) y
// Supabase (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY, igual que
// mentor-synthesize). Requiere además:
//   CALENDAR_REMINDER_EMAIL — a qué correo(s) avisar (uno o varios
//                             separados por coma)
// Si falta cualquiera de las tres, devuelve 200 sin hacer nada (mismo
// criterio no-bloqueante que el resto de este archivo).

interface AlertPayload {
  accountName: string;
  ruleLabel: string;
  severity: 'warning' | 'breached';
  message: string;
}

async function handleAlert(req: VercelRequest, res: VercelResponse) {
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

// --- Helpers de IA / fecha (copia autocontenida, ver lib/journalWeek.ts) ---

async function callClaude(apiKey: string, model: string, prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic: HTTP ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('Anthropic: respuesta sin texto');
  return text;
}

// La API a veces envuelve el JSON en ```json ... ``` pese a pedir "solo
// JSON" — se extrae el primer bloque {...} en vez de confiar en que
// response.trim() ya sea JSON puro.
function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No se encontró JSON en la respuesta de la IA.');
  return JSON.parse(match[0]);
}

function mondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function weekStartOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - mondayFirstIndex(date.getDay()));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function datesOfWeek(weekStart: string): string[] {
  const [y, m, d] = weekStart.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
}

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function handleMentorAnalyze(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Falta la variable de entorno ANTHROPIC_API_KEY en Vercel.' });
    return;
  }
  const { text } = (req.body ?? {}) as { text?: string };
  if (!text?.trim()) {
    res.status(400).json({ error: 'Falta "text" (la nota del día a analizar).' });
    return;
  }

  const prompt = `Sos un analista de mercados financieros. Te paso la nota diaria de un mentor de trading (Nufal Bakali). Extraé, en base ÚNICAMENTE a lo que dice la nota (no inventes datos que no estén):
1. "catalysts": lista de los puntos/catalizadores clave que menciona (array de strings cortos).
2. "keyLevels": lista de zonas o niveles de precio clave que menciona, si los hay (array de strings; array vacío si no menciona ninguno).
3. "scenario": un párrafo corto (2-4 oraciones) resumiendo el escenario que el mentor está esperando.

Nota del mentor:
"""
${text}
"""

Respondé ÚNICAMENTE con un objeto JSON válido con esas 3 claves (catalysts, keyLevels, scenario), sin texto antes ni después.`;

  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
    const raw = await callClaude(apiKey, model, prompt, 1024);
    const parsed = extractJson(raw) as { catalysts?: unknown; keyLevels?: unknown; scenario?: unknown };
    const catalysts = Array.isArray(parsed.catalysts) ? parsed.catalysts.map(String) : [];
    const keyLevels = Array.isArray(parsed.keyLevels) ? parsed.keyLevels.map(String) : [];
    const scenario = typeof parsed.scenario === 'string' ? parsed.scenario : '';
    res.status(200).json({ catalysts, keyLevels, scenario, analyzedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

async function handleMentorSynthesize(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Falta la variable de entorno ANTHROPIC_API_KEY en Vercel.' });
    return;
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Falta configurar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en Vercel.' });
    return;
  }

  const body = (req.body ?? {}) as { weekStart?: string };
  const weekStart = body.weekStart || weekStartOf(todayLocalDate());
  const dates = datesOfWeek(weekStart);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date, text')
    .eq('kind', 'mentoria')
    .in('entry_date', dates)
    .order('entry_date', { ascending: true });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const daily = (data ?? []).filter((d) => (d.text ?? '').trim().length > 0);
  if (daily.length === 0) {
    res.status(200).json({ generated: false, reason: 'No hay informes diarios de mentoría cargados esta semana.' });
    return;
  }

  const notesBlock = daily.map((d) => `${d.entry_date}:\n${d.text}`).join('\n\n');
  const prompt = `Sos un analista de mercados financieros. Te paso los informes diarios de un mentor de trading (Nufal Bakali) de una semana completa. Compilá un Informe Ejecutivo Semanal en español, en prosa (no JSON), que repase:
- Los catalizadores/eventos más relevantes de la semana.
- Cómo evolucionó la narrativa día a día.
- El escenario que el mentor espera de cara a la semana siguiente.

Informes diarios (fecha: contenido):
"""
${notesBlock}
"""

Respondé solo con el informe en texto plano (podés usar saltos de línea y viñetas con "-"), sin JSON ni encabezados tipo "Informe Ejecutivo Semanal:".`;

  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
    const content = await callClaude(apiKey, model, prompt, 2048);
    const id = crypto.randomUUID();
    const { error: upsertError } = await supabase.from('mentor_weekly_syntheses').upsert({ id, week_start: weekStart, content: content.trim() }, { onConflict: 'week_start' });
    if (upsertError) throw new Error(upsertError.message);
    res.status(200).json({ generated: true, weekStart, content: content.trim() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

interface CalendarEventRow {
  id: string;
  title: string;
  currency: string | null;
  event_at: string;
  impact: 'alto' | 'medio' | 'bajo';
  remind_minutes_before: number;
}

function formatRemindLabel(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440} día${minutes === 1440 ? '' : 's'}`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} hora${minutes === 60 ? '' : 's'}`;
  return `${minutes} min`;
}

async function handleCalendarReminder(req: VercelRequest, res: VercelResponse) {
  const resendKey = process.env.RESEND_API_KEY;
  const toEmails = (process.env.CALENDAR_REMINDER_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!resendKey || toEmails.length === 0 || !supabaseUrl || !supabaseAnonKey) {
    res.status(200).json({ sent: 0, reason: 'RESEND_API_KEY, CALENDAR_REMINDER_EMAIL o las variables de Supabase no están configuradas en Vercel.' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const now = new Date();
  // Ventana de búsqueda: desde 2h atrás (margen por si el cron se atrasó o
  // estuvo caído) hasta 25h adelante (el remindMinutesBefore más largo que
  // ofrece la UI es 1 día = 1440 min). El filtro exacto por evento (que
  // depende de SU remind_minutes_before, no de un valor fijo) se hace en JS
  // después de traer la ventana.
  const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, currency, event_at, impact, remind_minutes_before')
    .eq('alarm_enabled', true)
    .is('notified_at', null)
    .gte('event_at', windowStart)
    .lte('event_at', windowEnd);
  if (error) {
    res.status(200).json({ sent: 0, reason: `Supabase: ${error.message}` });
    return;
  }

  const due = ((data ?? []) as CalendarEventRow[]).filter((e) => new Date(e.event_at).getTime() - e.remind_minutes_before * 60_000 <= now.getTime());

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Hikman Capital <onboarding@resend.dev>';
  let sent = 0;
  const failures: string[] = [];
  for (const event of due) {
    const eventDate = new Date(event.event_at);
    const dateLabel = eventDate.toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const titleWithCurrency = event.currency ? `${event.title} (${event.currency})` : event.title;
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmails,
          subject: `🔔 En ${formatRemindLabel(event.remind_minutes_before)}: ${titleWithCurrency}`,
          html: `<p>El evento <strong>${event.title}</strong>${event.currency ? ` (${event.currency})` : ''} está programado para el <strong>${dateLabel}</strong>.</p><p>Impacto: <strong>${event.impact}</strong>.</p>`,
        }),
      });
      if (!resendRes.ok) {
        failures.push(`${event.id}: Resend HTTP ${resendRes.status}`);
        continue;
      }
      await supabase.from('calendar_events').update({ notified_at: new Date().toISOString() }).eq('id', event.id);
      sent += 1;
    } catch (err) {
      failures.push(`${event.id}: ${(err as Error).message}`);
    }
  }

  res.status(200).json({ sent, checked: due.length, failures });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const action = req.query.action;
  if (action === 'mentor-analyze') return handleMentorAnalyze(req, res);
  if (action === 'mentor-synthesize') return handleMentorSynthesize(req, res);
  if (action === 'calendar-reminder') return handleCalendarReminder(req, res);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  return handleAlert(req, res);
}
