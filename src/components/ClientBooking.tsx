import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Scissors, CheckCircle, Star, MapPin } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { serviceService, clientService, appointmentService, barberService } from '../services/api';
import type { Service, Barber } from '../services/api';
import toast from 'react-hot-toast';
import { closedDaysService } from '../services/api';
import { parseLocalDate, parseFormDate } from '../lib/dateUtils';

// Using Service type from API to match runtime shape

// ✅ HORÁRIO ESTENDIDO: Todos os dias até 20:00 (último horário disponível)
// Segunda a Sábado: 08:00 - 20:00 | Domingo: Fechado
const weeklySchedule: Record<number, { open: number; close: number }> = {
  1: { open: 8 * 60, close: 20 * 60 }, // Monday (Segunda) 08:00-20:00
  2: { open: 8 * 60, close: 20 * 60 }, // Tuesday (Terça) 08:00-20:00
  3: { open: 8 * 60, close: 20 * 60 }, // Wednesday (Quarta) 08:00-20:00
  4: { open: 8 * 60, close: 20 * 60 }, // Thursday (Quinta) 08:00-20:00
  5: { open: 8 * 60, close: 20 * 60 }, // Friday (Sexta) 08:00-20:00
  6: { open: 8 * 60, close: 20 * 60 }, // Saturday (Sábado) 08:00-20:00
};

// Removido bloqueio de almoço
// const lunchBlocked = new Set(['12:00','12:30','13:00','13:30']);

function pad(n: number) { return n.toString().padStart(2,'0'); }
function minutesToHHMM(m: number) { return `${pad(Math.floor(m/60))}:${pad(m%60)}`; }

function buildSlotsForDay(day: Date, lunchIntervals: { date: string; start: string; end: string }[]) {
  const dow = day.getDay();
  if (dow === 0 || !weeklySchedule[dow]) return [] as string[]; // Domingo fechado
  const { open, close } = weeklySchedule[dow];
  const slot = 30; // minutos
  // ✅ FIX: close já é o horário final (19:30 = 1170 minutos), não precisa subtrair
  const slots: string[] = [];
  for (let m = open; m <= close; m += slot) {
    const label = minutesToHHMM(m);
    slots.push(label);
  }
  // Filter by lunch interval for this specific date
  const iso = format(day, 'yyyy-MM-dd');
  const li = lunchIntervals.find(x => x.date === iso);
  if (li) {
    const [sh, sm] = li.start.split(':').map(Number);
    const [eh, em] = li.end.split(':').map(Number);
    const startM = sh*60 + sm;
    const endM = eh*60 + em;
    return slots.filter(s => {
      const [hh, mm] = s.split(':').map(Number);
      const m = hh*60 + mm;
      return !(m >= startM && m < endM);
    });
  }
  // DEBUG LOG
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[SLOTS] 🕐', {
      date: day.toDateString(), 
      dow, 
      open: `${Math.floor(open/60)}:${String(open%60).padStart(2,'0')}`, 
      close: `${Math.floor(close/60)}:${String(close%60).padStart(2,'0')}`,
      totalSlots: slots.length,
      first: slots[0],
      last: slots[slots.length - 1],
      allSlots: slots
    });
  }
  return slots;
}

export default function ClientBooking() {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [formData, setFormData] = useState(() => {
    const savedName = localStorage.getItem('clientName') || '';
    const savedPhone = localStorage.getItem('clientPhone') || '';
    return {
      clientName: savedName,
      clientPhone: savedPhone,
      barberId: '',
      serviceId: '',
      serviceIds: [] as string[],
      date: '',
      time: ''
    };
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [closedDays, setClosedDays] = useState<{ date: string | Date; reason?: string | null }[]>([]);
  const [lunchIntervals, setLunchIntervals] = useState<{ date: string; start: string; end: string }[]>([]);

  useEffect(() => {
    loadServices();
    loadBarbers();
    loadAppointments();
    loadClosedDays();
    loadLunchIntervals();
  }, []);

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const loadServices = async () => {
    try {
      const data = await serviceService.getAll();
      setServices(data);
    } catch (error) {
      toast.error('Erro ao carregar serviços');
    }
  };

  const loadBarbers = async () => {
    try {
      const data = await barberService.getAll();
      setBarbers(data);
    } catch (error) {
      // silencioso
    }
  };

  const loadAppointments = async () => {
    try {
      const data = await appointmentService.getAll();
      setAppointments(data);
    } catch (error) {
      // Silencioso no cliente
    }
  };

  const loadClosedDays = async () => {
    try {
      const list = await closedDaysService.list();
      setClosedDays(list);
    } catch (e) {
      // silencioso
    }
  };

  const loadLunchIntervals = async () => {
    try {
      const res = await fetch('/api/lunch-intervals');
      if (!res.ok) return setLunchIntervals([]);
      const list = await res.json();
      setLunchIntervals(list);
    } catch (e) {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Bloquear datas no passado por segurança
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [y, m, d] = formData.date.split('-').map(Number);
      const selectedDay = new Date(y, (m || 1) - 1, d || 1);
      selectedDay.setHours(0, 0, 0, 0);
      if (selectedDay.getTime() < today.getTime()) {
        toast.error('Não é possível agendar para uma data anterior a hoje.');
        setIsLoading(false);
        return;
      }

      // Find or create client
      let client = await clientService.findByPhone(formData.clientPhone);
      
      if (!client) {
        client = await clientService.create({
          name: formData.clientName,
          phone: formData.clientPhone,
        });
      }

      // Create appointment - build local date from yyyy-MM-dd to avoid UTC shift
      const localDate = new Date(y, (m || 1) - 1, d || 1);
      await appointmentService.create({
        clientId: client.id,
        serviceId: formData.serviceId,
        serviceIds: formData.serviceIds,
        date: localDate,
        time: formData.time,
        barberId: formData.barberId || undefined,
      });

      // Salvar nome e telefone para próximos agendamentos
      localStorage.setItem('clientName', formData.clientName);
      localStorage.setItem('clientPhone', formData.clientPhone);

      setFormData({
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        barberId: '',
        serviceId: '',
        serviceIds: [],
        date: '',
        time: ''
      });
      setShowSuccess(true);
      setCurrentStep(1);
      setTimeout(() => setShowSuccess(false), 4000);
      toast.success('Agendamento realizado com sucesso!');
      // Atualiza agendamentos para refletir ocupação
      loadAppointments();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Erro ao realizar agendamento';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isClosedDay = (day: Date) => {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
    return closedDays.some(cd => new Date(cd.date).setHours(0,0,0,0) === start);
  };

  const getNextWeekDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startWeek = startOfWeek(today, { weekStartsOn: 1 });
    // Segunda a sábado da semana atual, apenas HOJE em diante (sem dias passados) e sem domingo
    return Array.from({ length: 7 }, (_, i) => addDays(startWeek, i))
      .filter(d => d.getDay() !== 0)
      .filter(d => {
        const dd = new Date(d);
        dd.setHours(0, 0, 0, 0);
        return dd.getTime() >= today.getTime();
      });
  };

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2: return !!formData.clientName && !!formData.clientPhone;
      case 3: return !!formData.barberId;
      case 4: return formData.serviceIds.length > 0; // precisa de pelo menos um
      case 5: return !!formData.date;
      default: return true;
    }
  };

  const selectedService = services.find(s => s.id === formData.serviceId);
  const selectedServices = services.filter(s => formData.serviceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((a, s) => a + s.duration, 0);
  const totalPrice = selectedServices.reduce((a, s) => a + s.price, 0);

  // Horários já ocupados no dia selecionado (filtrado por barbeiro)
  const reservedTimes = React.useMemo(() => {
    if (!formData.date) return [] as string[];
    const [y, m, d] = formData.date.split('-').map(Number);
    const sel = new Date(y, (m || 1) - 1, d || 1);
    return appointments
      .filter(a => {
        // ✅ FIX: Parse appointment date correctly using utility function
        const appointmentDate = parseLocalDate(a.date);
        const sameDay = isSameDay(appointmentDate, sel);
        const status = typeof a.status === 'string' ? a.status : 'SCHEDULED';
        const blocksSlot = status !== 'CANCELLED' && status !== 'NO_SHOW';
        // Filter by barber if selected
        const sameBarber = formData.barberId ? a.barberId === formData.barberId : true;
        return sameDay && blocksSlot && sameBarber;
      })
      .map(a => a.time);
  }, [appointments, formData.date, formData.barberId]);

  const availableSlots = React.useMemo(() => {
    if (!formData.date) return [] as string[];
    const [y, m, d] = formData.date.split('-').map(Number);
    const sel = new Date(y, (m || 1) - 1, d || 1);
    let slots = buildSlotsForDay(sel, lunchIntervals);

    console.log('🔍 DEBUG availableSlots:', {
      date: formData.date,
      totalGenerated: slots.length,
      generatedSlots: slots,
      reservedTimes: reservedTimes,
    });

    // Remover horários já reservados
    slots = slots.filter(t => !reservedTimes.includes(t));
    
    console.log('🔍 After removing reserved:', {
      remaining: slots.length,
      slots: slots
    });

    // Se for hoje, remover já passados
    const today = new Date();
    if (sel.toDateString() === today.toDateString()) {
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      console.log('🔍 Is today! Filtering past times:', {
        now: `${today.getHours()}:${today.getMinutes()}`,
        nowMinutes: nowMinutes
      });
      
      slots = slots.filter(t => {
        const [hh, mm] = t.split(':').map(Number);
        return hh * 60 + mm >= nowMinutes;
      });
      
      console.log('🔍 After removing past:', {
        final: slots.length,
        slots: slots
      });
    }
    return slots;
  }, [reservedTimes, formData.date, lunchIntervals]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <MapPin className="h-4 w-4" />
          <span>Rua coronel tamarindo 407 - Camacari de dentro</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-4">
          Agende seu Horário
        </h1>
        <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Experimente o melhor em cortes masculinos e cuidados com a barba. 
          Profissionais qualificados e ambiente moderno.
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-8 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-green-500 p-2 rounded-full">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-green-300 font-semibold text-lg">Agendamento Confirmado!</h3>
              <p className="text-green-200">Você receberá uma confirmação em breve.</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-10">
        <div className="flex items-center justify-center space-x-4 mb-6">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                currentStep >= step 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg' 
                  : 'bg-white/10 text-gray-400 border border-white/20'
              }`}>
                {step}
              </div>
              {step < 5 && (
                <div className={`w-10 sm:w-16 h-1 mx-2 rounded-full transition-all duration-300 ${
                  currentStep > step ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-white/20'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <span className="text-gray-300 font-medium">
            {currentStep === 1 && "Dados Pessoais"}
            {currentStep === 2 && "Escolha o Barbeiro"}
            {currentStep === 3 && "Escolha o Serviço"}
            {currentStep === 4 && "Selecione o Dia"}
            {currentStep === 5 && "Confirme o Horário"}
          </span>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-4 sm:p-6 md:p-8 border border-white/10 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Step 1: Personal Data */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <User className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Seus Dados</h2>
                <p className="text-gray-300">Precisamos de algumas informações básicas</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:bg-white/15"
                    placeholder="Digite seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">
                    Telefone/WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.clientPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                    className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:bg-white/15"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Barber Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <User className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Escolha o Barbeiro</h2>
                <p className="text-gray-300">Selecione o profissional de sua preferência</p>
              </div>
              
              {barbers.length === 0 ? (
                <div className="text-center text-gray-300 bg-white/10 border border-white/20 rounded-xl p-4">
                  Nenhum barbeiro disponível no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {barbers.map((barber) => (
                    <label
                      key={barber.id}
                      className={`relative cursor-pointer group transition-all duration-300 ${
                        formData.barberId === barber.id ? 'transform scale-105' : 'hover:transform hover:scale-102'
                      }`}
                    >
                      <input
                        type="radio"
                        name="barberId"
                        value={barber.id}
                        checked={formData.barberId === barber.id}
                        onChange={(e) => setFormData(prev => ({ ...prev, barberId: e.target.value }))}
                        className="sr-only"
                      />
                      <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                        formData.barberId === barber.id
                          ? 'border-amber-500 bg-gradient-to-br from-amber-500/20 to-orange-500/20 shadow-lg shadow-amber-500/25'
                          : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                      }`}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
                            formData.barberId === barber.id
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black'
                              : 'bg-white/10 text-amber-400'
                          }`}>
                            {barber.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-bold text-lg">{barber.name}</div>
                            <div className="text-gray-400 text-sm">Barbeiro</div>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Services */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Scissors className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Nossos Serviços</h2>
                <p className="text-gray-300">Selecione um ou mais serviços</p>
                {formData.serviceIds.length > 0 && (
                  <p className="text-xs text-amber-400 mt-2">Selecionados: {formData.serviceIds.length} • Total: {totalDuration}min • R$ {totalPrice}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => {
                  const checked = formData.serviceIds.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      className={`relative cursor-pointer group transition-all duration-300 ${
                        checked ? 'transform scale-105' : 'hover:transform hover:scale-102'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={service.id}
                        checked={checked}
                        onChange={(e) => {
                          setFormData(prev => {
                            let list = [...prev.serviceIds];
                            if (e.target.checked) {
                              list.push(service.id);
                            } else {
                              list = list.filter(id => id !== service.id);
                            }
                            return { ...prev, serviceIds: list, serviceId: list[0] || '' };
                          });
                        }}
                        className="sr-only"
                      />
                      <div className={`p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 ${
                        checked
                          ? 'border-amber-500 bg-gradient-to-br from-amber-500/20 to-orange-500/20 shadow-lg shadow-amber-500/25'
                          : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                      }`}>
                        {service.isPopular && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center">
                            <Star className="h-3 w-3 mr-1" />
                            Popular
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-white font-bold text-lg mr-4">{service.name}</div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                            checked ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-400 border border-white/20'
                          }`}>{checked ? '✓' : '+'}</div>
                        </div>
                        <div className="text-gray-300 text-sm mb-3 min-h-[38px]">{service.description}</div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-4">
                            <span className="text-amber-400 font-semibold">R$ {service.price}</span>
                            <span className="text-gray-400">{service.duration}min</span>
                          </div>
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Date Selection */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Calendar className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Escolha o Dia</h2>
                <p className="text-gray-300">Selecione a data que melhor se adequa à sua agenda</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {getNextWeekDays().map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayName = format(day, 'EEEE', { locale: ptBR });
                  const dayNumber = format(day, 'd');
                  const monthName = format(day, 'MMM', { locale: ptBR });
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const closed = isClosedDay(day);
                  
                  return (
                    <label
                      key={dateStr}
                      className={`cursor-pointer group transition-all duration-300 ${
                        formData.date === dateStr ? 'transform scale-105' : 'hover:transform hover:scale-102'
                      }`}
                    >
                      <input
                        type="radio"
                        name="date"
                        value={dateStr}
                        checked={formData.date === dateStr}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="sr-only"
                        disabled={closed}
                      />
                      <div className={`relative p-4 rounded-2xl border-2 text-center transition-all duration-300 ${
                        closed
                          ? 'border-red-500/40 bg-red-500/10 opacity-80 cursor-not-allowed'
                          : formData.date === dateStr
                          ? 'border-amber-500 bg-gradient-to-br from-amber-500/20 to-orange-500/20 shadow-lg'
                          : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                      }`}>
                        {closed && (
                          <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">FECHADO</div>
                        )}
                        {isToday && !closed && (
                          <div className="text-xs text-amber-400 font-bold mb-1">HOJE</div>
                        )}
                        <div className={`text-white font-bold text-lg capitalize ${closed ? 'text-red-300' : ''}`}>{dayName}</div>
                        <div className={`text-2xl font-bold my-1 ${closed ? 'text-red-300' : 'text-gray-300'}`}>{dayNumber}</div>
                        <div className={`text-xs uppercase ${closed ? 'text-red-400' : 'text-gray-400'}`}>{monthName}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Time Selection */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Horário Disponível</h2>
                <p className="text-gray-300">Escolha o melhor horário para seu atendimento</p>
                {formData.date && (
                  <p className="text-xs text-gray-500 mt-2">
                    Dia da semana: {parseFormDate(formData.date).getDay()} (1=Seg ... 6=Sáb)
                  </p>
                )}
              </div>
              
              {/* Summary */}
              {selectedService && (
                <div className="bg-white/10 rounded-2xl p-6 mb-6 border border-white/20">
                  <h3 className="text-white font-semibold mb-4">Resumo do Agendamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                    {formData.barberId && (
                      <div>
                        <span className="text-gray-400">Barbeiro:</span>
                        <div className="text-white font-medium">
                          {barbers.find(b => b.id === formData.barberId)?.name || '-'}
                        </div>
                      </div>
                    )}
                    <div className="md:col-span-1 lg:col-span-2">
                      <span className="text-gray-400">Serviços:</span>
                      <div className="text-white font-medium">
                        {selectedServices.map(s => s.name).join(', ')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Data:</span>
                      <div className="text-white font-medium">
                        {formData.date && (() => {
                          const localDate = parseFormDate(formData.date);
                          return format(localDate, 'dd/MM/yyyy', { locale: ptBR });
                        })()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Total:</span>
                      <div className="text-white font-medium">{totalDuration}min • R$ {totalPrice}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {availableSlots.length === 0 && (
                <div className="text-center text-gray-300 bg-white/10 border border-white/20 rounded-xl p-4">
                  Nenhum horário disponível para este dia. Escolha outra data.
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
                {availableSlots.map((time) => (
                   <label
                     key={time}
                     className={`cursor-pointer group transition-all duration-300 ${
                       formData.time === time ? 'transform scale-105' : 'hover:transform hover:scale-102'
                     }`}
                   >
                     <input
                       type="radio"
                       name="time"
                       value={time}
                       checked={formData.time === time}
                       onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                       className="sr-only"
                     />
                     <div className={`p-4 rounded-xl border-2 text-center transition-all duration-300 ${
                       formData.time === time
                         ? 'border-amber-500 bg-gradient-to-br from-amber-500/20 to-orange-500/20 shadow-lg'
                         : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                     }`}>
                       <div className="text-white font-bold">{time}</div>
                     </div>
                   </label>
                 ))}
               </div>
             </div>
           )}

           {/* Navigation Buttons - Fixed at bottom */}
           <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-8 pb-6 mt-8 border-t border-white/10">
             <div className="flex justify-between">
               {currentStep > 1 && (
                 <button
                   type="button"
                   onClick={() => setCurrentStep(currentStep - 1)}
                   className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all duration-200 border border-white/20"
                 >
                   Voltar
                 </button>
               )}
               
               <div className="ml-auto">
                 {currentStep < 5 ? (
                   <button
                     type="button"
                     onClick={() => setCurrentStep(currentStep + 1)}
                     disabled={!canProceedToStep(currentStep + 1)}
                     className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                   >
                     Continuar
                   </button>
                 ) : (
                   <button
                     type="submit"
                     disabled={!formData.time || isLoading}
                     className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                   >
                     Confirmar Agendamento
                   </button>
                 )}
               </div>
             </div>
           </div>
 
         </form>
       </div>
     </div>
   );
 }
