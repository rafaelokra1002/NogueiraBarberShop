import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/lib/prisma';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

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
  const { clientId, serviceId, time, date, barberId } = req.body;

  // Prevent duplicate bookings on the same day and time
  try {
    const target = new Date(date);
    const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);

    const existing = await prisma.appointment.findFirst({
      where: {
        time,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (existing) {
      return res.status(409).json({ message: 'Já existe um agendamento para este horário neste dia.' });
    }

    const created = await prisma.appointment.create({ data: { clientId, serviceId, time, date: new Date(date), barberId }, include: { client: true, service: true, barber: true } });
    return res.json(created);
  } catch (e) {
    console.error('[appointments:create] error', e);
    return res.status(500).json({ message: 'Erro ao criar agendamento' });
  }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  const { status } = req.body;
  const updated = await prisma.appointment.update({ where: { id: req.params.id }, data: { status }, include: { client: true, service: true, barber: true } });
  res.json(updated);
});

app.delete('/api/appointments/:id', async (req, res) => {
  await prisma.appointment.delete({ where: { id: req.params.id } });
  res.json({ id: req.params.id });
});

// Cleanup old appointments endpoint
app.post('/api/appointments/cleanup', async (req, res) => {
  try {
    const result = await cleanupOldAppointments();
    res.json({ 
      success: true, 
      deletedCount: result.count,
      message: `${result.count} agendamentos antigos removidos`
    });
  } catch (error) {
    console.error('Erro na limpeza de agendamentos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao executar limpeza de agendamentos' 
    });
  }
});

// Auto cleanup function
async function cleanupOldAppointments() {
  const now = new Date();
  const currentWeekStart = new Date(now);
  
  // Get start of current week (Monday)
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
  currentWeekStart.setDate(now.getDate() - daysToSubtract);
  currentWeekStart.setHours(0, 0, 0, 0);

  // Remove agendamentos anteriores ao início desta semana
  const result = await prisma.appointment.deleteMany({
    where: {
      date: {
        lt: currentWeekStart
      }
    }
  });

  console.log(`[Cleanup] Removidos ${result.count} agendamentos antigos (antes de ${currentWeekStart.toISOString()})`);
  return result;
}

// Schedule automatic cleanup every Monday at 00:00
function scheduleWeeklyCleanup() {
  const scheduleCleanup = () => {
    const now = new Date();
    const nextMonday = new Date(now);
    
    // Calculate next Monday
    const daysUntilMonday = (1 + 7 - now.getDay()) % 7;
    if (daysUntilMonday === 0 && now.getHours() === 0 && now.getMinutes() < 5) {
      // It's Monday morning, schedule for next Monday
      nextMonday.setDate(now.getDate() + 7);
    } else {
      nextMonday.setDate(now.getDate() + daysUntilMonday);
    }
    
    nextMonday.setHours(0, 0, 0, 0);
    
    const timeUntilMonday = nextMonday.getTime() - now.getTime();
    
    console.log(`[Scheduler] Próxima limpeza automática agendada para: ${nextMonday.toLocaleString('pt-BR')}`);
    
    setTimeout(async () => {
      console.log('[Scheduler] Executando limpeza semanal automática...');
      try {
        const result = await cleanupOldAppointments();
        console.log(`[Scheduler] Limpeza semanal concluída: ${result.count} agendamentos removidos`);
      } catch (error) {
        console.error('[Scheduler] Erro na limpeza semanal:', error);
      }
      
      // Schedule next cleanup
      scheduleCleanup();
    }, timeUntilMonday);
  };

  scheduleCleanup();
}

// Startup cleanup function
async function performStartupCleanup() {
  try {
    console.log('[Startup] Executando limpeza automática de agendamentos antigos...');
    const result = await cleanupOldAppointments();
    console.log(`[Startup] Limpeza concluída: ${result.count} agendamentos removidos`);
  } catch (error) {
    console.error('[Startup] Erro na limpeza automática:', error);
  }
}

// WhatsApp Integration
app.post('/api/whatsapp/send', async (req, res) => {
  const { to, message } = req.body;
  
  try {
    // Para uma implementação real, você precisaria configurar:
    // - WhatsApp Business API (Meta)
    // - Twilio WhatsApp API
    // - Outras APIs de terceiros
    
    console.log('WhatsApp enviado para:', to);
    console.log('Mensagem:', message);
    
    // Simulação de sucesso
    res.json({ 
      success: true, 
      provider: 'simulation', 
      message: 'Mensagem simulada enviada com sucesso',
      to,
      messageId: `sim_${Date.now()}`
    });
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao enviar mensagem WhatsApp' 
    });
  }
});

// Settings
app.get('/api/settings', async (_req, res) => {
  try {
    const s = await prisma.businessSettings.findFirst();
    res.json(s);
  } catch (error) {
    res.json(null);
  }
});

app.post('/api/settings', async (req, res) => {
  const updated = await prisma.businessSettings.upsert({ 
    where: { id: 'default' }, 
    update: req.body, 
    create: { id: 'default', ...req.body } 
  });
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

app.listen(port, host, () => {
  console.log(`[server] listening on http://${host}:${port}`);
  
  // Execute startup cleanup
  performStartupCleanup();
  
  // Schedule weekly cleanup
  scheduleWeeklyCleanup();
});
