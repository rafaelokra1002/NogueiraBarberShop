import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check + version
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/version', async (_req, res) => {
  try {
    const fs = await import('fs');
    const p = path.resolve(process.cwd(), 'public/version.txt');
    if (fs.existsSync(p)) {
      const v = fs.readFileSync(p, 'utf8').trim();
      return res.json({ version: v });
    }
    // Try git
    const { execSync } = await import('child_process');
    try {
      const hash = execSync('git rev-parse --short HEAD').toString().trim();
      return res.json({ version: hash });
    } catch {
      return res.json({ version: 'unknown' });
    }
  } catch (e) {
    return res.json({ version: 'error' });
  }
});

// Services
app.get('/api/services', async (_req, res) => {
  const items = await prisma.service.findMany({ where: { isActive: true }, orderBy: { isPopular: 'desc' } });
  res.json(items);
});

app.post('/api/services', async (req, res) => {
  const s = await prisma.service.create({ data: { ...req.body, isActive: true } });
  res.json(s);
});

app.patch('/api/services/:id', async (req, res) => {
  const s = await prisma.service.update({ where: { id: req.params.id }, data: req.body });
  res.json(s);
});

app.delete('/api/services/:id', async (req, res) => {
  const s = await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json(s);
});

// Clients
app.get('/api/clients', async (_req, res) => {
  const items = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(items);
});

app.post('/api/clients', async (req, res) => {
  const c = await prisma.client.create({ data: req.body });
  res.json(c);
});

// Appointments
app.get('/api/appointments', async (_req, res) => {
  const items = await prisma.appointment.findMany({ include: { client: true, service: true, barber: true }, orderBy: { date: 'asc' } });
  res.json(items);
});

app.post('/api/appointments', async (req, res) => {
  const { clientId, serviceId, serviceIds, time, date, barberId } = req.body;

  try {
    // ✅ FIX: Parse date correctly from YYYY-MM-DD string (local timezone)
    let target: Date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Format: "2025-12-23" - parse as local date
      const [y, m, d] = date.split('-').map(Number);
      target = new Date(y, m - 1, d, 12, 0, 0, 0); // Use noon to avoid DST edge cases
    } else {
      // Fallback: try to parse as Date
      target = new Date(date);
    }
    
    // Validate date
    if (isNaN(target.getTime())) {
      return res.status(400).json({ message: 'Data inválida.' });
    }
    
    if (target.getDay() === 0) {
      return res.status(400).json({ message: 'Não atendemos aos domingos.' });
    }
    const startOfDayLocal = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
    const closed = await (prisma as any).closedDay.findUnique({ where: { date: startOfDayLocal } });
    if (closed) {
      return res.status(400).json({ message: `Não estaremos abertos neste dia${closed.reason ? `: ${closed.reason}` : ''}.` });
    }
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
    if (targetStart.getTime() < todayStart.getTime()) {
      return res.status(400).json({ message: 'Não é possível agendar para uma data anterior a hoje.' });
    }
    if (targetStart.getTime() === todayStart.getTime() && typeof time === 'string') {
      const [hh, mm] = time.split(':').map((n: string) => parseInt(n, 10));
      if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const slotMinutes = hh * 60 + mm;
        if (slotMinutes < nowMinutes) {
          return res.status(400).json({ message: 'Não é possível agendar para um horário que já passou hoje.' });
        }
      }
    }

    // Block lunch interval times (server-side enforcement)
    try {
      const lunchFilePathLocal = path.resolve(process.cwd(), 'data', 'lunch_intervals.json');
      const ensure = () => {
        const dir = path.dirname(lunchFilePathLocal);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(lunchFilePathLocal)) fs.writeFileSync(lunchFilePathLocal, '[]', 'utf8');
      };
      ensure();
      const raw = fs.readFileSync(lunchFilePathLocal, 'utf8');
      const list: Array<{ date: string; start: string; end: string }> = JSON.parse(raw || '[]');
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, '0');
      const dd = String(target.getDate()).padStart(2, '0');
      const isoDay = `${yyyy}-${mm}-${dd}`;
      const found = list.find(i => i.date === isoDay);
      if (found && typeof time === 'string') {
        const [sh, sm] = found.start.split(':').map(Number);
        const [eh, em] = found.end.split(':').map(Number);
        const startM = sh * 60 + sm;
        const endM = eh * 60 + em;
        const [th, tm] = time.split(':').map(Number);
        const tM = th * 60 + tm;
        if (tM >= startM && tM < endM) {
          return res.status(400).json({ message: 'Horário indisponível (intervalo de almoço).' });
        }
      }
    } catch (e) {
      console.warn('[appointments:create] lunch interval check failed:', e);
      // Do not block on read error; continue
    }

    const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
    const existing = await prisma.appointment.findFirst({ where: { time, date: { gte: startOfDay, lte: endOfDay } } });
    if (existing) {
      return res.status(409).json({ message: 'Já existe um agendamento para este horário neste dia.' });
    }

    // Multi-serviço (fallback sem pivot enquanto migration não aplicada no client gerado)
    let selectedIds: string[] = [];
    if (Array.isArray(serviceIds) && serviceIds.length) {
      selectedIds = [...new Set(serviceIds)];
    } else if (serviceId) {
      selectedIds = [serviceId];
    } else {
      return res.status(400).json({ message: 'Informe pelo menos um serviço.' });
    }

    const services = await prisma.service.findMany({ where: { id: { in: selectedIds } } });
    if (services.length !== selectedIds.length) {
      return res.status(400).json({ message: 'Serviço inválido.' });
    }

    const totalDuration = services.reduce((acc, s) => acc + s.duration, 0);
    const totalPrice = services.reduce((acc, s) => acc + s.price, 0);
    const primaryServiceId = selectedIds[0];

    const created = await prisma.appointment.create({
      data: {
        clientId,
        serviceId: primaryServiceId,
        time,
        date: target,
        barberId,
        notes: JSON.stringify({ multi: true, serviceIds: selectedIds, totalDuration, totalPrice })
      },
      include: { client: true, service: true, barber: true }
    });

    return res.json({ ...created, multi: { serviceIds: selectedIds, totalDuration, totalPrice } });
  } catch (e) {
    console.error('[appointments:create] error', e);
    return res.status(500).json({ message: 'Erro ao criar agendamento' });
  }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  const { status } = req.body;
  const updated = await prisma.appointment.update({ where: { id: req.params.id }, data: { status }, include: { client: true, service: true, barber: true } });
  res.json(updated);

  // Auto WhatsApp on confirm (fire-and-forget)
  if (process.env.WHATSAPP_AUTO_ON_CONFIRM === 'true' && status === 'CONFIRMED') {
    try {
      await sendConfirmationWhatsApp(updated);
    } catch (err) {
      console.error('Falha ao enviar WhatsApp automático:', err);
    }
  }

  // Auto create financial transaction when completed
  if (status === 'COMPLETED') {
    try {
      await prisma.transaction.create({
        data: {
          description: `Serviço: ${updated.service.name} - Cliente: ${updated.client.name}`,
          amount: updated.service.price,
          category: 'Serviços',
          date: new Date(updated.date),
          type: 'income'
        }
      });
      console.log(`[financial] Receita adicionada automaticamente: R$ ${updated.service.price}`);
    } catch (err) {
      console.error('[financial] Erro ao criar transação automática:', err);
    }
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  await prisma.appointment.delete({ where: { id: req.params.id } });
  res.json({ id: req.params.id });
});

// --------------------
// Closed Days (Admin + Client visibility)
// --------------------
app.get('/api/closed-days', async (_req, res) => {
  try {
    const list = await (prisma as any).closedDay.findMany({ orderBy: { date: 'asc' } });
    res.json(list);
  } catch (e) {
    console.error('[closed-days:list] error', e);
    res.status(500).json({ message: 'Erro ao listar dias fechados' });
  }
});

app.post('/api/closed-days', async (req, res) => {
  try {
    const input = req.body?.date;
    const reason = req.body?.reason as string | undefined;
    const d = new Date(input);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const saved = await (prisma as any).closedDay.upsert({
      where: { date: start },
      update: { reason },
      create: { date: start, reason },
    });
    res.json(saved);
  } catch (e) {
    console.error('[closed-days:create] error', e);
    res.status(500).json({ message: 'Erro ao criar/atualizar dia fechado' });
  }
});

app.delete('/api/closed-days/:date', async (req, res) => {
  try {
    const raw = decodeURIComponent(req.params.date);
    const d = new Date(raw);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    await (prisma as any).closedDay.delete({ where: { date: start } });
    res.json({ ok: true });
  } catch (e) {
    console.error('[closed-days:delete] error', e);
    res.status(500).json({ message: 'Erro ao remover dia fechado' });
  }
});

// Transactions (Financial)
app.get('/api/transactions', async (_req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (e) {
    console.error('[transactions:list] error', e);
    res.status(500).json({ message: 'Erro ao carregar transações' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { description, amount, category, date, type } = req.body;
    const transaction = await prisma.transaction.create({
      data: {
        description,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        type
      }
    });
    res.json(transaction);
  } catch (e) {
    console.error('[transactions:create] error', e);
    res.status(500).json({ message: 'Erro ao criar transação' });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await prisma.transaction.delete({
      where: { id: req.params.id }
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[transactions:delete] error', e);
    res.status(500).json({ message: 'Erro ao deletar transação' });
  }
});

// --------------------
// Cleanup old appointments (single source of truth)
// --------------------
app.post('/api/appointments/cleanup', async (_req, res) => {
  try {
    const result = await cleanupOldAppointments();
    res.json(result);
  } catch (error) {
    console.error('Erro na limpeza:', error);
    res.status(500).json({ success: false, error: 'Erro ao executar limpeza de agendamentos' });
  }
});

// Delete all appointments before the start of current week (Monday 00:00)
async function cleanupOldAppointments() {
  const now = new Date();
  const currentWeekStart = new Date(now);

  // Get start of current week (Monday)
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
  currentWeekStart.setDate(now.getDate() - daysToSubtract);
  currentWeekStart.setHours(0, 0, 0, 0);

  const deleted = await prisma.appointment.deleteMany({
    where: {
      date: {
        lt: currentWeekStart,
      },
    },
  });

  console.log(`[cleanup] Removidos ${deleted.count} agendamentos antigos (antes de ${currentWeekStart.toISOString()})`);

  return {
    success: true,
    deletedCount: deleted.count,
    cleanupDate: currentWeekStart.toISOString(),
  };
}

// Run cleanup on server start
async function performStartupCleanup() {
  try {
    console.log('[startup] Executando limpeza automática...');
    const result = await cleanupOldAppointments();
    console.log(`[startup] Limpeza concluída: ${result.deletedCount} agendamentos removidos`);
  } catch (error) {
    console.error('[startup] Erro na limpeza automática:', error);
  }
}

// Schedule automatic cleanup every Monday at 00:00
function scheduleWeeklyCleanup() {
  const planNext = () => {
    const now = new Date();
    const nextMonday = new Date(now);

    const daysUntilMonday = (1 + 7 - now.getDay()) % 7; // 0..6
    nextMonday.setDate(now.getDate() + (daysUntilMonday === 0 && now.getHours() >= 0 && now.getMinutes() >= 0 ? 7 : daysUntilMonday));
    nextMonday.setHours(0, 0, 0, 0);

    const delay = nextMonday.getTime() - now.getTime();
    console.log(`[scheduler] Próxima limpeza automática: ${nextMonday.toLocaleString('pt-BR')}`);

    setTimeout(async () => {
      console.log('[scheduler] Executando limpeza semanal automática...');
      try {
        const result = await cleanupOldAppointments();
        console.log(`[scheduler] Limpeza semanal concluída: ${result.deletedCount} agendamentos removidos`);
      } catch (error) {
        console.error('[scheduler] Erro na limpeza semanal:', error);
      }
      planNext();
    }, Math.max(1000, delay));
  };

  planNext();
}

// --------------------
// WhatsApp Integration
// --------------------
app.post('/api/whatsapp/send', async (req, res) => {
  const { to, message } = req.body;

  try {
    // Try WhatsApp Business API (Meta)
    const metaResult = await sendViaMetaAPI(to, message);
    if (metaResult.success) {
      return res.json({ success: true, provider: 'meta', messageId: metaResult.messageId });
    }

    // Fallback to WhatsApp Web
    console.log('Meta API falhou, usando fallback para WhatsApp Web');
    res.json({
      success: false,
      provider: 'fallback',
      message: 'API não configurada, use WhatsApp Web',
      whatsappUrl: `https://wa.me/${to}?text=${encodeURIComponent(message)}`,
    });
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      whatsappUrl: `https://wa.me/${to}?text=${encodeURIComponent(message)}`,
    });
  }
});

app.post('/api/whatsapp/twilio', async (req, res) => {
  const { to, from, body } = req.body || {};
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = from || process.env.TWILIO_FROM_NUMBER; // e.g. 'whatsapp:+14155238886'

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(400).json({ success: false, error: 'Twilio não configurado. Defina TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_FROM_NUMBER.' });
  }
  if (!to || !body) {
    return res.status(400).json({ success: false, error: 'Parâmetros inválidos. Envie { to, body }.' });
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', to.startsWith('whatsapp:') ? to : `whatsapp:${to}`);
    params.append('From', fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`);
    params.append('Body', body);

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Twilio error:', json);
      return res.status(500).json({ success: false, error: json || 'Erro ao enviar via Twilio' });
    }

    return res.json({ success: true, provider: 'twilio', sid: json.sid, to: json.to, status: json.status });
  } catch (err) {
    console.error('Twilio exception:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Send via Meta WhatsApp Business API
async function sendViaMetaAPI(to: string, message: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { success: false as const, error: 'Credenciais WhatsApp não configuradas' };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true as const, messageId: result.messages?.[0]?.id };
    } else {
      const error = await response.text();
      console.error('Erro Meta API:', error);
      return { success: false as const, error };
    }
  } catch (error) {
    console.error('Erro na requisição Meta API:', error);
    return { success: false as const, error: String(error) };
  }
}

// WhatsApp webhook
app.post('/api/whatsapp/webhook', (req, res) => {
  console.log('WhatsApp Webhook:', JSON.stringify(req.body, null, 2));
  res.status(200).send('OK');
});

app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge as string);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Settings
app.get('/api/settings', async (_req, res) => {
  const s = await prisma.businessSettings.findFirst();
  res.json(s);
});

app.post('/api/settings', async (req, res) => {
  const updated = await prisma.businessSettings.upsert({ where: { id: 'default' }, update: req.body, create: { id: 'default', ...req.body } });
  res.json(updated);
});

// Serve frontend build in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

app.use(express.static(distPath));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = Number(process.env.PORT) || 3007;
const host = process.env.HOST || '0.0.0.0';

// Global error handlers to prevent server from crashing
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

app.listen(port, host, () => console.log(`[server] listening on http://${host}:${port}`));

// Perform initial cleanup on startup and schedule weekly cleanup
performStartupCleanup();
scheduleWeeklyCleanup();

async function sendConfirmationWhatsApp(appointment: any) {
  if (!appointment?.client?.phone) return;
  const to = normalizePhone(appointment.client.phone);
  const date = new Date(appointment.date);
  const day = date.toLocaleDateString('pt-BR');
  const time = appointment.time;
  const service = appointment.service?.name || 'seu atendimento';
  const business = (await prisma.businessSettings.findFirst())?.businessName || 'BarberPro';

  const message = `Olá ${appointment.client.name}, sua reserva para ${service} foi CONFIRMADA em ${day} às ${time}.\n\n${business} agradece!`;

  const provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();
  try {
    if (provider === 'twilio') {
      // Send via Twilio endpoint
      await fetch('http://localhost:' + (process.env.PORT || 3007) + '/api/whatsapp/twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, body: message }),
      });
    } else {
      // Default: Meta API
      await sendViaMetaAPI(to, message);
    }
  } catch (e) {
    console.error('Erro ao enviar confirmação WhatsApp:', e);
  }
}

function normalizePhone(phone: string) {
  const digits = String(phone).replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

// Lunch intervals (stored in data/lunch_intervals.json)
const lunchFilePath = path.resolve(process.cwd(), 'data', 'lunch_intervals.json');
function ensureLunchFile() {
  const dir = path.dirname(lunchFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(lunchFilePath)) fs.writeFileSync(lunchFilePath, '[]', 'utf8');
}

app.get('/api/lunch-intervals', async (_req, res) => {
  try {
    ensureLunchFile();
    const raw = fs.readFileSync(lunchFilePath, 'utf8');
    const list = JSON.parse(raw || '[]');
    res.json(list);
  } catch (e) {
    console.error('[lunch:list] error', e);
    res.status(500).json({ message: 'Erro ao listar intervalos de almoço' });
  }
});

app.post('/api/lunch-intervals', async (req, res) => {
  try {
    const { date, start, end } = req.body; // date = ISO date or yyyy-mm-dd
    if (!date || !start || !end) return res.status(400).json({ message: 'Parâmetros inválidos' });
    ensureLunchFile();
    const raw = fs.readFileSync(lunchFilePath, 'utf8');
    const list = JSON.parse(raw || '[]');
    const existingIndex = list.findIndex((i: any) => i.date === date);
    if (existingIndex >= 0) {
      list[existingIndex] = { date, start, end };
    } else {
      list.push({ date, start, end });
    }
    fs.writeFileSync(lunchFilePath, JSON.stringify(list, null, 2), 'utf8');
    res.json({ date, start, end });
  } catch (e) {
    console.error('[lunch:create] error', e);
    res.status(500).json({ message: 'Erro ao salvar intervalo de almoço' });
  }
});

app.delete('/api/lunch-intervals/:date', async (req, res) => {
  try {
    const date = decodeURIComponent(req.params.date);
    ensureLunchFile();
    const raw = fs.readFileSync(lunchFilePath, 'utf8');
    let list = JSON.parse(raw || '[]');
    list = list.filter((i: any) => i.date !== date);
    fs.writeFileSync(lunchFilePath, JSON.stringify(list, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    console.error('[lunch:delete] error', e);
    res.status(500).json({ message: 'Erro ao remover intervalo de almoço' });
  }
});
