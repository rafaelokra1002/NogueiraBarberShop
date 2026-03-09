// IMPORTANT: This module exports browser-safe implementations when running in the
// browser, and uses Node-only code (Prisma, bcrypt) only on the server side via
// dynamic imports. This prevents Vite from bundling Node modules for the client.

import { formatDateForAPI } from '../lib/dateUtils';

const isBrowser = typeof window !== 'undefined';

// Shared types (avoid importing @prisma/client types on the client)
export type Service = {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  isPopular?: boolean;
  isActive?: boolean;
};

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt?: Date | string;
};

type Appointment = {
  id: string;
  clientId: string;
  serviceId: string;
  barberId?: string | null;
  date: Date | string;
  time: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
};

export type ClosedDay = {
  id: string;
  date: string | Date;
  reason?: string | null;
};

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date | string;
  type: 'income' | 'expense';
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

// (removed) LocalStorage helpers and local genId - now handled in db.ts

// Declare implementation placeholders and export after assignment
type AuthUser = { id: string; email: string; name: string; role: string };
type AuthService = { login(email: string, password: string): Promise<AuthUser> };
type ClientService = {
  create(data: { name: string; phone: string; email?: string }): Promise<Client>;
  findByPhone(phone: string): Promise<Client | null>;
  getAll(): Promise<Client[]>;
};
type ServiceService = {
  getAll(): Promise<Service[]>;
  create(data: { name: string; description?: string; duration: number; price: number; isPopular?: boolean }): Promise<Service>;
  update(id: string, data: Partial<Service>): Promise<Service>;
  delete(id: string): Promise<Service | null>;
};
type AppointmentWithRelations = Appointment & { client: Client; service: Service; barber: any };
type AppointmentService = {
  create(data: { clientId: string; serviceId?: string; serviceIds?: string[]; date: Date; time: string; barberId?: string }): Promise<AppointmentWithRelations | any>;
  getAll(): Promise<AppointmentWithRelations[]>;
  getByDateRange(startDate: Date, endDate: Date): Promise<AppointmentWithRelations[]>;
  updateStatus(id: string, status: Appointment['status']): Promise<AppointmentWithRelations>;
  delete(id: string): Promise<{ id: string } | any>;
};

let authServiceImpl: AuthService;
let clientServiceImpl: ClientService;
let serviceServiceImpl: ServiceService;
let appointmentServiceImpl: AppointmentService;
let businessServiceImpl: {
  getSettings(): Promise<any>;
  updateSettings(data: { businessName?: string; businessAddress?: string; businessPhone?: string; businessEmail?: string; openingHours?: string; workingDays?: string; }): Promise<any>;
};
let closedDaysServiceImpl: {
  list(): Promise<ClosedDay[]>;
  create(data: { date: Date; reason?: string }): Promise<ClosedDay>;
  remove(date: Date): Promise<{ ok: true }>;
};
let transactionServiceImpl: {
  getAll(): Promise<Transaction[]>;
  create(data: { description: string; amount: number; category: string; date: Date; type: 'income' | 'expense' }): Promise<Transaction>;
  delete(id: string): Promise<{ ok: true }>;
};

if (isBrowser) {
  // ========================= BROWSER (HTTP API) =========================
  const base = '/api';

  authServiceImpl = {
    async login(email: string, password: string) {
      // Demo-only: validar credenciais estáticas no client
      if (email === 'admin@barberpro.com' && password === 'admin123') {
        return { id: 'admin-1', email, name: 'Admin', role: 'ADMIN' };
      }
      throw new Error('Credenciais inválidas');
    },
  };

  clientServiceImpl = {
    async create(data: { name: string; phone: string; email?: string }) {
      const res = await fetch(`${base}/clients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Erro ao criar cliente');
      return res.json();
    },

    async findByPhone(phone: string) {
      const res = await fetch(`${base}/clients`);
      const list: Client[] = await res.json();
      return list.find(c => c.phone === phone) ?? null;
    },

    async getAll() {
      const res = await fetch(`${base}/clients`);
      return res.json();
    },
  };

  serviceServiceImpl = {
    async getAll() {
      const res = await fetch(`${base}/services`);
      return res.json();
    },

    async create(data: { name: string; description?: string; duration: number; price: number; isPopular?: boolean }) {
      const res = await fetch(`${base}/services`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Erro ao criar serviço');
      return res.json();
    },

    async update(id: string, data: Partial<Service>) {
      const res = await fetch(`${base}/services/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Erro ao atualizar serviço');
      return res.json();
    },

    async delete(id: string) {
      const res = await fetch(`${base}/services/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao desativar serviço');
      return res.json();
    },
  };

  appointmentServiceImpl = {
    async create(data: { clientId: string; serviceId?: string; serviceIds?: string[]; date: Date; time: string; barberId?: string }) {
      // ✅ FIX: Send date as YYYY-MM-DD string to avoid UTC conversion issues
      const dateString = formatDateForAPI(data.date);
      
      const body: any = { ...data, date: dateString };
      if (data.serviceIds && data.serviceIds.length) {
        body.serviceIds = data.serviceIds;
        body.serviceId = data.serviceIds[0];
      }
      const res = await fetch(`${base}/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        if (res.status === 409) {
          const j = await res.json().catch(() => ({ message: 'Horário já ocupado neste dia.' }));
          throw new Error(j?.message || 'Horário já ocupado neste dia.');
        }
        const errTxt = await res.text().catch(() => 'Erro ao criar agendamento');
        throw new Error(errTxt);
      }
      return res.json();
    },

    async getAll() {
      const res = await fetch(`${base}/appointments`);
      return res.json();
    },

    async getByDateRange(startDate: Date, endDate: Date) {
      const res = await fetch(`${base}/appointments`);
      const list = await res.json();
      return list.filter((a: any) => {
        const t = new Date(a.date).getTime();
        return t >= startDate.getTime() && t <= endDate.getTime();
      });
    },

    async updateStatus(id: string, status: Appointment['status']) {
      const res = await fetch(`${base}/appointments/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error('Erro ao atualizar agendamento');
      return res.json();
    },

    async delete(id: string) {
      const res = await fetch(`${base}/appointments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover agendamento');
      return res.json();
    },
  };

  businessServiceImpl = {
    async getSettings() {
      const res = await fetch(`${base}/settings`);
      return res.json();
    },

    async updateSettings(data: { businessName?: string; businessAddress?: string; businessPhone?: string; businessEmail?: string; openingHours?: string; workingDays?: string; }) {
      const res = await fetch(`${base}/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Erro ao atualizar configurações');
      return res.json();
    },
  };

  closedDaysServiceImpl = {
    async list() {
      const res = await fetch(`${base}/closed-days`);
      if (!res.ok) {
        console.error('[closed-days] list failed', res.status);
        return [];
      }
      return res.json();
    },
    async create(data: { date: Date; reason?: string }) {
      const d = new Date(data.date);
      const localNoon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).toISOString();
      const res = await fetch(`${base}/closed-days`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, date: localNoon }) });
      if (!res.ok) throw new Error('Erro ao criar dia fechado');
      return res.json();
    },
    async remove(date: Date) {
      const d = new Date(date);
      const iso = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).toISOString();
      const res = await fetch(`${base}/closed-days/${encodeURIComponent(iso)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover dia fechado');
      return res.json();
    },
  };

  transactionServiceImpl = {
    async getAll() {
      const res = await fetch(`${base}/transactions`);
      if (!res.ok) throw new Error('Erro ao carregar transações');
      return res.json();
    },
    async create(data: { description: string; amount: number; category: string; date: Date; type: 'income' | 'expense' }) {
      const res = await fetch(`${base}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erro ao criar transação');
      return res.json();
    },
    async delete(id: string) {
      const res = await fetch(`${base}/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao deletar transação');
      return { ok: true as const };
    },
  };
} else {
  // ========================= SERVER (Node) =========================
  // Use dynamic imports inside functions to avoid bundling in the browser.

  authServiceImpl = {
    async login(email: string, password: string) {
      const { prisma } = await import('../lib/prisma');
      const { comparePassword } = await import('../lib/auth');
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await comparePassword(password, user.password))) {
        throw new Error('Credenciais inválidas');
      }
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
  };

  clientServiceImpl = {
    async create(data: { name: string; phone: string; email?: string }) {
      const { prisma } = await import('../lib/prisma');
      return prisma.client.create({ data });
    },

    async findByPhone(phone: string) {
      const { prisma } = await import('../lib/prisma');
      return prisma.client.findFirst({ where: { phone } });
    },

    async getAll() {
      const { prisma } = await import('../lib/prisma');
      return prisma.client.findMany({
        include: {
          appointments: {
            include: { service: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  };

  serviceServiceImpl = {
    async getAll() {
      const { prisma } = await import('../lib/prisma');
      return prisma.service.findMany({ where: { isActive: true }, orderBy: { isPopular: 'desc' } });
    },

    async create(data: { name: string; description?: string; duration: number; price: number; isPopular?: boolean }) {
      const { prisma } = await import('../lib/prisma');
      return prisma.service.create({ data });
    },

    async update(id: string, data: Partial<Service>) {
      const { prisma } = await import('../lib/prisma');
      return prisma.service.update({ where: { id }, data });
    },

    async delete(id: string) {
      const { prisma } = await import('../lib/prisma');
      return prisma.service.update({ where: { id }, data: { isActive: false } });
    },
  };

  appointmentServiceImpl = {
    async create(data: { clientId: string; serviceId?: string; serviceIds?: string[]; date: Date; time: string; barberId?: string }) {
      const { prisma } = await import('../lib/prisma');
      const target = new Date(data.date);
      const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
      const exists = await prisma.appointment.findFirst({ where: { time: data.time, date: { gte: startOfDay, lte: endOfDay } } });
      if (exists) throw new Error('Já existe um agendamento para este horário neste dia.');
      const selectedIds = data.serviceIds && data.serviceIds.length ? data.serviceIds : (data.serviceId ? [data.serviceId] : []);
      if (!selectedIds.length) throw new Error('Informe pelo menos um serviço.');
      const created = await prisma.appointment.create({
        data: { clientId: data.clientId, serviceId: selectedIds[0], time: data.time, date: target, barberId: data.barberId, notes: JSON.stringify({ multi: selectedIds.length > 1, serviceIds: selectedIds }) },
        include: { client: true, service: true, barber: true }
      });
      return created as any;
    },

    async getAll() {
      const { prisma } = await import('../lib/prisma');
      const list = await prisma.appointment.findMany({
        include: { client: true, service: true, barber: true },
        orderBy: { date: 'asc' },
      });
      return list as unknown as AppointmentWithRelations[];
    },

    async getByDateRange(startDate: Date, endDate: Date) {
      const { prisma } = await import('../lib/prisma');
      const list = await prisma.appointment.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { client: true, service: true, barber: true },
        orderBy: { date: 'asc' },
      });
      return list as unknown as AppointmentWithRelations[];
    },

    async updateStatus(id: string, status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW') {
      const { prisma } = await import('../lib/prisma');
      const updated = await prisma.appointment.update({
        where: { id },
        data: { status },
        include: { client: true, service: true, barber: true },
      });
      return updated as unknown as AppointmentWithRelations;
    },

    async delete(id: string) {
      const { prisma } = await import('../lib/prisma');
      return prisma.appointment.delete({ where: { id } });
    },
  };

  businessServiceImpl = {
    async getSettings() {
      const { prisma } = await import('../lib/prisma');
      return prisma.businessSettings.findFirst();
    },

    async updateSettings(data: { businessName?: string; businessAddress?: string; businessPhone?: string; businessEmail?: string; openingHours?: string; workingDays?: string; }) {
      const { prisma } = await import('../lib/prisma');
      return prisma.businessSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
    },
  };

  closedDaysServiceImpl = {
    async list() {
      const { prisma } = await import('../lib/prisma');
      return (prisma as any).closedDay.findMany({ orderBy: { date: 'asc' } }) as any;
    },
    async create(data: { date: Date; reason?: string }) {
      const { prisma } = await import('../lib/prisma');
      const d = new Date(data.date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      return (prisma as any).closedDay.upsert({ where: { date: start }, update: { reason: data.reason }, create: { date: start, reason: data.reason } }) as any;
    },
    async remove(date: Date) {
      const { prisma } = await import('../lib/prisma');
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      await (prisma as any).closedDay.delete({ where: { date: start } });
      return { ok: true } as const;
    }
  };

  transactionServiceImpl = {
    async getAll() {
      const { prisma } = await import('../lib/prisma');
      return (prisma as any).transaction.findMany({ orderBy: { date: 'desc' } }) as any;
    },
    async create(data: { description: string; amount: number; category: string; date: Date; type: 'income' | 'expense' }) {
      const { prisma } = await import('../lib/prisma');
      return (prisma as any).transaction.create({ data }) as any;
    },
    async delete(id: string) {
      const { prisma } = await import('../lib/prisma');
      await (prisma as any).transaction.delete({ where: { id } });
      return { ok: true } as const;
    }
  };
}

// Top-level exports
export const authService = authServiceImpl;
export const clientService = clientServiceImpl;
export const serviceService = serviceServiceImpl;
export const appointmentService = appointmentServiceImpl;
export const businessService = businessServiceImpl;
export const closedDaysService = closedDaysServiceImpl;
export const transactionService = transactionServiceImpl;