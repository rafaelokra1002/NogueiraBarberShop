import Dexie, { Table } from 'dexie';

export interface DBService {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  isPopular?: boolean;
  isActive?: boolean;
}

export interface DBClient {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt?: string;
}

export interface DBAppointment {
  id: string;
  clientId: string;
  serviceId: string;
  barberId?: string | null;
  date: string; // ISO
  time: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

export interface DBSettings {
  id: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  openingHours?: string;
  workingDays?: string;
  appointmentSlots?: string;
  maxAdvanceDays?: number;
}

class BarberDB extends Dexie {
  services!: Table<DBService, string>;
  clients!: Table<DBClient, string>;
  appointments!: Table<DBAppointment, string>;
  settings!: Table<DBSettings, string>;

  constructor() {
    super('BarberProDB');
    this.version(1).stores({
      services: 'id,name,isActive,isPopular',
      clients: 'id,phone,name',
      appointments: 'id,date,clientId,serviceId,status',
      settings: 'id'
    });
  }
}

export const db = new BarberDB();

// Helper: import existing LocalStorage data into IndexedDB on first run
export async function importFromLocalStorageIfEmpty() {
  const servicesCount = await db.services.count();
  const clientsCount = await db.clients.count();
  const apptsCount = await db.appointments.count();

  if (servicesCount + clientsCount + apptsCount > 0) return; // already has data

  try {
    const ls = (key: string) => {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    };
    const services = ls('bp_services') || [];
    const clients = ls('bp_clients') || [];
    const appointments = ls('bp_appointments') || [];
    const settings = ls('bp_settings');

    await db.transaction('rw', db.services, db.clients, db.appointments, db.settings, async () => {
      if (services.length) await db.services.bulkAdd(services);
      if (clients.length) await db.clients.bulkAdd(clients);
      if (appointments.length) await db.appointments.bulkAdd(appointments);
      if (settings) await db.settings.put({ id: 'default', ...settings });
    });
  } catch (e) {
    // no-op
  }
}

export const genId = () => Math.random().toString(36).slice(2, 10);
