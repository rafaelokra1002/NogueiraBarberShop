import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  X, 
  Users, 
  Filter,
  LogOut,
  Settings
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuthStore } from '../store/authStore';
import { appointmentService } from '../services/api';
import toast from 'react-hot-toast';
import { closedDaysService } from '../services/api';
import { parseLocalDate } from '../lib/dateUtils';

interface AppointmentWithRelations {
  id: string;
  date: Date;
  time: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  client: {
    id: string;
    name: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
  };
}

// Improve typing and formatting helpers
type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
const formatMoney = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDayForList, setSelectedDayForList] = useState<Date | null>(new Date());
  const [closedDays, setClosedDays] = useState<{ date: string | Date; reason?: string | null }[]>([]);
  const [newClosedDate, setNewClosedDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [lunchStart, setLunchStart] = useState<string>('');
  const [lunchEnd, setLunchEnd] = useState<string>('');

  useEffect(() => {
    loadAppointments();
    loadClosedDays();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await appointmentService.getAll();
      
      // Filtrar apenas agendamentos de hoje em diante
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Zerar horário para comparar apenas datas
      
      const futureAppointments = (data as AppointmentWithRelations[]).filter(apt => {
        // ✅ FIX: Parse appointment date correctly
        const appointmentDate = parseLocalDate(apt.date);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate >= today; // Incluir hoje e dias futuros
      });
      
      setAppointments(futureAppointments);
    } catch (error) {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setIsLoading(false);
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

  const addClosedDay = async () => {
    if (!newClosedDate) return;
    try {
      const [y, m, d] = newClosedDate.split('-').map(Number);
      const localDate = new Date(y, (m || 1) - 1, d || 1);
      await closedDaysService.create({ date: localDate, reason });
      setNewClosedDate('');
      setReason('');
      await loadClosedDays();
      toast.success('Dia marcado como fechado');
    } catch (e) {
      toast.error('Falha ao marcar dia fechado');
    }
  };

  const removeClosedDay = async (date: string | Date) => {
    try {
      await closedDaysService.remove(new Date(date));
      await loadClosedDays();
      toast.success('Dia reaberto');
    } catch (e) {
      toast.error('Falha ao reabrir dia');
    }
  };

  // Timezone-robust closed day check (avoids midnight UTC shifting one day back/forward)
  const isClosedDay = (day: Date) => {
    return closedDays.some(cd => {
      const closedDate = parseLocalDate(cd.date);
      return closedDate.toDateString() === day.toDateString();
    });
  };

  const getWeekDays = () => {
    const startWeek = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(startWeek, i));
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => {
      const appointmentDate = parseLocalDate(apt.date);
      return isSameDay(appointmentDate, day) && 
        (statusFilter === 'all' || apt.status === statusFilter);
    }).sort((a, b) => a.time.localeCompare(b.time));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'CONFIRMED': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'COMPLETED': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'CANCELLED': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'NO_SHOW': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'Agendado';
      case 'CONFIRMED': return 'Confirmado';
      case 'COMPLETED': return 'Concluído';
      case 'CANCELLED': return 'Cancelado';
      case 'NO_SHOW': return 'Não Compareceu';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return '📅';
      case 'CONFIRMED': return '✅';
      case 'COMPLETED': return '🎉';
      case 'CANCELLED': return '❌';
      case 'NO_SHOW': return '👻';
      default: return '📋';
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const appointment = appointments.find(apt => apt.id === id);
      
      await appointmentService.updateStatus(id, status as any);
      await loadAppointments();
      
      // Enviar mensagem WhatsApp se for confirmação
      if (status === 'CONFIRMED' && appointment) {
        sendWhatsAppConfirmation(appointment);
      }
      
      setSelectedAppointment(null);
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleReleaseSlot = async (appointment: AppointmentWithRelations) => {
    try {
      await appointmentService.delete(appointment.id);
      await loadAppointments();
      setSelectedAppointment(null);
      toast.success('Horário liberado para novos agendamentos.');
    } catch (error) {
      toast.error('Erro ao liberar horário');
    }
  };

  const sendWhatsAppConfirmation = (appointment: AppointmentWithRelations, messageType: 'confirmation' | 'reminder' | 'custom' = 'confirmation') => {
    const phone = appointment.client.phone.replace(/\D/g, ''); // Remove caracteres não numéricos
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`; // Adiciona código do Brasil se necessário
    
    // ✅ FIX: Format date correctly
    const date = format(parseLocalDate(appointment.date), 'dd/MM/yyyy', { locale: ptBR });
    
    let message = '';
    
    switch (messageType) {
      case 'confirmation':
        message = `🎉 *AGENDAMENTO CONFIRMADO!*\n\n` +
          `Olá ${appointment.client.name}! 👋\n\n` +
          `Seu agendamento foi confirmado com sucesso:\n\n` +
          `📅 *Data:* ${date}\n` +
          `⏰ *Horário:* ${appointment.time}\n` +
          `✂️ *Serviço:* ${appointment.service.name}\n` +
          `⏱️ *Duração:* ${appointment.service.duration} minutos\n` +
          `💰 *Valor:* ${formatMoney(appointment.service.price)}\n\n` +
          `📍 *Local:* Barbearia NOGUEIRA\n` +
          `📞 *Contato:* Em caso de dúvidas, entre em contato\n\n` +
          `Aguardamos você! 🔥\n\n` +
          `_Mensagem automática do sistema BarberPro_`;
        break;
        
      case 'reminder':
        message = `⏰ *LEMBRETE DE AGENDAMENTO*\n\n` +
          `Olá ${appointment.client.name}! 👋\n\n` +
          `Lembramos que você tem um agendamento:\n\n` +
          `📅 *Data:* ${date}\n` +
          `⏰ *Horário:* ${appointment.time}\n` +
          `✂️ *Serviço:* ${appointment.service.name}\n` +
          `⏱️ *Duração:* ${appointment.service.duration} minutos\n\n` +
          `📍 *Local:* Barbearia NOGUEIRA\n` +
          `📞 *Contato:* Em caso de dúvidas, entre em contato\n\n` +
          `Te esperamos! 😊\n\n` +
          `_Mensagem automática do sistema BarberPro_`;
        break;
        
      default:
        message = `📋 *INFORMAÇÕES DO AGENDAMENTO*\n\n` +
          `Olá ${appointment.client.name}! 👋\n\n` +
          `Detalhes do seu agendamento:\n\n` +
          `📅 *Data:* ${date}\n` +
          `⏰ *Horário:* ${appointment.time}\n` +
          `✂️ *Serviço:* ${appointment.service.name}\n` +
          `⏱️ *Duração:* ${appointment.service.duration} minutos\n` +
          `💰 *Valor:* ${formatMoney(appointment.service.price)}\n` +
          `📊 *Status:* ${getStatusText(appointment.status)}\n\n` +
          `📍 *Local:* Barbearia NOGUEIRA\n` +
          `📞 *Contato:* Em caso de dúvidas, entre em contato\n\n` +
          `_Mensagem automática do sistema BarberPro_`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    // Abrir WhatsApp Web em nova aba
    window.open(whatsappUrl, '_blank');
    
    const actionText = messageType === 'confirmation' ? 'Confirmação enviada' : 
                      messageType === 'reminder' ? 'Lembrete enviado' : 'Mensagem enviada';
    toast.success(`${actionText} via WhatsApp para ${appointment.client.name}`);
  };

  // Memoized derived values for performance and cleanliness
  const weekDays = useMemo(() => getWeekDays(), [selectedWeek]);
  const { totalAppointments, confirmedAppointments, completedAppointments } = useMemo(() => ({
    totalAppointments: appointments.length,
    confirmedAppointments: appointments.filter(apt => apt.status === 'CONFIRMED').length,
    completedAppointments: appointments.filter(apt => apt.status === 'COMPLETED').length,
  }), [appointments]);

  useEffect(() => {
    if (selectedDayForList) {
      const load = async () => {
        try {
          const iso = format(selectedDayForList, 'yyyy-MM-dd');
          const res = await fetch(`/api/lunch-intervals`);
          if (!res.ok) throw new Error('Falha');
          const list = await res.json();
          const found = list.find((i: any) => i.date === iso);
          if (found) { setLunchStart(found.start); setLunchEnd(found.end); } else { setLunchStart(''); setLunchEnd(''); }
        } catch (e) { setLunchStart(''); setLunchEnd(''); }
      };
      load();
    } 
    // cleanup handled by load
  }, [selectedDayForList]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative bg-black/30 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {/* Logo Image */}
                <div className="relative flex items-center">
                  <img
                    src="/images/logo-nogueira.png"
                    alt="Logo NOGUEIRA"
                    className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl object-cover border-2 border-amber-500/30 shadow-lg"
                    onError={(e) => {
                      // Fallback para o ícone SVG se a imagem não carregar
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  {/* Fallback Icon */}
                  <div className="hidden bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-2 sm:p-3 rounded-xl shadow-lg">
                    <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-amber-300 rounded-full animate-pulse"></div>
                </div>
                <div>
                 <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                          Nogueira BarberShop
                        </h1>
                  <p className="text-xs sm:text-sm text-gray-400">Bem-vindo, {user?.name}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors border border-red-500/30"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 pb-24 md:pb-10 [padding-bottom:env(safe-area-inset-bottom)]">
         <div className="space-y-4 sm:space-y-6">
           {/* Mobile compact stats */}
           <div className="md:hidden flex items-center gap-2">
             <div className="flex-1 bg-blue-500/20 border border-blue-500/30 rounded-xl px-3 py-2 text-white text-xs flex items-center justify-between">
               <span>Total</span>
               <span className="font-bold">{totalAppointments}</span>
             </div>
             <div className="flex-1 bg-green-500/20 border border-green-500/30 rounded-xl px-3 py-2 text-white text-xs flex items-center justify-between">
               <span>Conf.</span>
               <span className="font-bold">{confirmedAppointments}</span>
             </div>
             <div className="flex-1 bg-purple-500/20 border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs flex items-center justify-between">
               <span>Conc.</span>
               <span className="font-bold">{completedAppointments}</span>
             </div>
           </div>

           {/* Statistics Cards (desktop/tablet) */}
           <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 group">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-blue-200 text-xs font-medium">Total de Agendamentos</p>
                   <p className="text-2xl font-bold text-white mt-1">{totalAppointments}</p>
                   <p className="text-blue-300 text-[11px] mt-1">Este mês</p>
                 </div>
                 <div className="bg-blue-500/30 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                   <Calendar className="h-5 w-5 text-blue-300" />
                 </div>
               </div>
             </div>
             
             <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-2xl p-4 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 group">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-green-200 text-xs font-medium">Confirmados</p>
                   <p className="text-2xl font-bold text-white mt-1">{confirmedAppointments}</p>
                   <p className="text-green-300 text-[11px] mt-1">Próximos atendimentos</p>
                 </div>
                 <div className="bg-green-500/30 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                   <CheckCircle className="h-5 w-5 text-green-300" />
                 </div>
               </div>
             </div>
             
             <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 group">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-purple-200 text-xs font-medium">Concluídos</p>
                   <p className="text-2xl font-bold text-white mt-1">{completedAppointments}</p>
                   <p className="text-purple-300 text-[11px] mt-1">Atendimentos finalizados</p>
                 </div>
                 <div className="bg-purple-500/30 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                   <Users className="h-5 w-5 text-purple-300" />
                 </div>
               </div>
             </div>

             {/* Faturamento card removido conforme solicitado */}
           </div>

           {/* Week Navigation and Filters */}
           <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-4 sm:p-6 md:p-8 border border-white/10">
             <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
               <div>
                 <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Agenda da Semana</h2>
                 <p className="text-gray-300 text-sm sm:text-base">
                   {format(weekDays[0], 'dd/MM', { locale: ptBR })} - {format(weekDays[6], 'dd/MM/yyyy', { locale: ptBR })}
                 </p>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                 {/* Status Filter */}
                 <div className="flex items-center space-x-2">
                   <Filter className="h-4 w-4 text-gray-400" />
                   <select
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'all')}
                     className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                   >
                     <option value="all">Todos os Status</option>
                     <option value="SCHEDULED">Agendados</option>
                     <option value="CONFIRMED">Confirmados</option>
                     <option value="COMPLETED">Concluídos</option>
                     <option value="CANCELLED">Cancelados</option>
                     <option value="NO_SHOW">Não Compareceu</option>
                   </select>
                 </div>
                 
                 {/* Week Navigation */}
                 <div className="flex space-x-2">
                   <button
                     onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
                     className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/30"
                   >
                     ← Anterior
                   </button>
                   <button
                     onClick={() => { setSelectedWeek(new Date()); setSelectedDayForList(new Date()); }}
                     className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black rounded-lg transition-all duration-200 font-semibold shadow-lg"
                   >
                     Hoje
                   </button>
                   <button
                     onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
                     className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/30"
                   >
                     Próxima →
                   </button>
                 </div>
               </div>
             </div>

             {/* Admin: Fechamento de dias */}
             <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
               <h3 className="text-white font-semibold mb-3">Dias Fechados</h3>
               <div className="flex flex-col md:flex-row gap-3 md:items-end">
                 <div>
                   <label className="block text-xs text-gray-300 mb-1">Data</label>
                   <input type="date" value={newClosedDate} onChange={(e) => setNewClosedDate(e.target.value)} className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" />
                 </div>
                 <div className="flex-1">
                   <label className="block text-xs text-gray-300 mb-1">Motivo (opcional)</label>
                   <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Feriado, manutenção..." className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" />
                 </div>
                 <div>
                   <button onClick={addClosedDay} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/30">Fechar dia</button>
                 </div>
               </div>

               {closedDays.length > 0 && (
                 <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                   {closedDays.map(cd => {
                     const closedDate = parseLocalDate(cd.date);
                     return (
                       <div key={closedDate.toISOString()} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                         <div>
                           <div className="text-white font-medium">{format(closedDate, 'dd/MM/yyyy', { locale: ptBR })}</div>
                           {cd.reason && <div className="text-gray-400 text-xs">{cd.reason}</div>}
                         </div>
                         <button onClick={() => removeClosedDay(cd.date)} className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded border border-green-500/30 text-xs">Reabrir</button>
                       </div>
                     );
                   })}
                 </div>
               )}
             </div>

             {/* Week Grid */}
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
               {weekDays.map((day) => {
                 const dayAppointments = getAppointmentsForDay(day);
                 const isDayToday = isToday(day);
                 
                 return (
                   <div
                     key={day.toISOString()}
                     className={`cursor-pointer group transition-all duration-300 ${
                       selectedDayForList && isSameDay(selectedDayForList, day) ? 'transform scale-110 z-10' : 'hover:transform hover:scale-102'
                     }`}
                     onClick={() => setSelectedDayForList(day)}
                   >
                     <div className={`p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 relative ${
                       selectedDayForList && isSameDay(selectedDayForList, day)
                         ? 'border-amber-500 bg-gradient-to-br from-amber-500/30 to-orange-500/30 shadow-2xl shadow-amber-500/50 ring-4 ring-amber-500/30' 
                         : isDayToday 
                         ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:border-amber-500/70 shadow-lg' 
                         : isClosedDay(day)
                         ? 'border-red-500/50 bg-red-500/10'
                         : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 hover:shadow-lg'
                     }`}>
                       {/* Selected Day Glow Effect */}
                       {selectedDayForList && isSameDay(selectedDayForList, day) && (
                         <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 blur-sm -z-10"></div>
                       )}
                       {/* Closed day badge */}
                       {isClosedDay(day) && (
                         <div className="absolute top-1 right-1 text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">FECHADO</div>
                       )}
                       {/* Day Header */}
                       <div className="text-center mb-2 sm:mb-3 md:mb-4">
                         {isDayToday && (
                           <div className="text-[10px] sm:text-xs text-amber-400 font-bold mb-1">HOJE</div>
                         )}
                         {selectedDayForList && isSameDay(selectedDayForList, day) && (
                           <div className="text-[10px] sm:text-xs text-amber-300 font-bold mb-1 animate-pulse">✨ SELECIONADO</div>
                         )}
                         <div className={`font-bold text-xs sm:text-sm capitalize mb-1 transition-all duration-300 ${
                           selectedDayForList && isSameDay(selectedDayForList, day)
                             ? 'text-amber-300 sm:text-lg'
                             : isDayToday 
                             ? 'text-amber-400' 
                             : isClosedDay(day)
                             ? 'text-red-300'
                             : 'text-white'
                         }`}>
                           {format(day, 'EEEE', { locale: ptBR })}
                         </div>
                         <div className={`font-bold mb-1 transition-all duration-300 ${
                           selectedDayForList && isSameDay(selectedDayForList, day)
                             ? 'text-amber-300 text-xl sm:text-2xl md:text-3xl'
                             : isDayToday 
                             ? 'text-amber-400 text-lg sm:text-xl md:text-2xl' 
                             : isClosedDay(day)
                             ? 'text-red-300 text-lg sm:text-xl md:text-2xl'
                             : 'text-gray-300 text-lg sm:text-xl md:text-2xl'
                         }`}>
                           {format(day, 'd')}
                         </div>
                         <div className={`text-[10px] sm:text-xs uppercase transition-all duration-300 ${
                           selectedDayForList && isSameDay(selectedDayForList, day)
                             ? 'text-amber-400'
                             : isClosedDay(day)
                             ? 'text-red-400'
                             : 'text-gray-400'
                         }`}>
                           {format(day, 'MMM', { locale: ptBR })}
                         </div>
                       </div>
                       
                       {/* Appointments Preview */}
                       <div className="space-y-1 sm:space-y-2">
                         {isClosedDay(day) ? (
                           <div className="text-center py-1 sm:py-2 md:py-3">
                             <div className="text-lg sm:text-xl md:text-2xl mb-1">🚪</div>
                             <p className="text-red-300 text-[10px] sm:text-xs">Fechado</p>
                           </div>
                         ) : dayAppointments.length === 0 ? (
                           <div className="text-center py-1 sm:py-2 md:py-3">
                             <div className="text-lg sm:text-xl md:text-2xl mb-1">📅</div>
                             <p className="text-gray-500 text-[10px] sm:text-xs">
                               Livre
                             </p>
                           </div>
                         ) : (
                           <>
                             {/* Show only the next/closest appointment */}
                             {dayAppointments.slice(0, 1).map((appointment) => (
                               <div
                                 key={appointment.id}
                                 className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg border text-[10px] sm:text-xs transition-all duration-200 ${getStatusColor(appointment.status)}`}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setSelectedAppointment(appointment);
                                 }}
                               >
                                 <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                                   <span className="font-bold text-[10px] sm:text-xs">{appointment.time}</span>
                                   <span className="text-xs sm:text-sm">{getStatusIcon(appointment.status)}</span>
                                 </div>
                                 <div className="font-medium truncate opacity-80 text-[9px] sm:text-[10px]">
                                   {appointment.client.name}
                                 </div>
                               </div>
                             ))}
                             {dayAppointments.length > 1 && (
                               <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 text-center py-0.5 sm:py-1">
                                 +{dayAppointments.length - 1} outros
                               </div>
                             )}
                           </>
                         )}
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
         </div>
       </main>

      {/* Day Appointments Modal */}
      {selectedDayForList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/15 shadow-2xl" role="dialog" aria-modal="true" aria-label="Agendamentos do Dia">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                  Agendamentos - {format(selectedDayForList, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                </h3>
                <p className="text-gray-300 text-sm">
                  {getAppointmentsForDay(selectedDayForList).length} agendamento(s) para este dia
                </p>
              </div>
              {/* Lunch interval controls */}
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-300 mr-2">Intervalo de Almoço:</div>
                <input type="time" value={lunchStart} onChange={(e) => setLunchStart(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                <span className="text-gray-400">—</span>
                <input type="time" value={lunchEnd} onChange={(e) => setLunchEnd(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                <button onClick={() => {
                  if (!selectedDayForList) return;
                  (async () => {
                    try {
                      if (!lunchStart || !lunchEnd) { toast.error('Defina horário início e fim'); return; }
                      const iso = format(selectedDayForList!, 'yyyy-MM-dd');
                      const res = await fetch('/api/lunch-intervals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: iso, start: lunchStart, end: lunchEnd }) });
                      if (!res.ok) throw new Error('Falha');
                      toast.success('Intervalo de almoço salvo');
                    } catch (e) { toast.error('Falha ao salvar'); }
                  })();
                 }} className="px-2 py-1 bg-amber-500 text-black rounded ml-2 text-xs">Salvar</button>
                <button onClick={() => {
                   if (!selectedDayForList) return;
                  (async () => {
                    try {
                      const iso = format(selectedDayForList!, 'yyyy-MM-dd');
                      const res = await fetch('/api/lunch-intervals/' + encodeURIComponent(iso), { method: 'DELETE' });
                      if (!res.ok) throw new Error('Falha');
                      setLunchStart(''); setLunchEnd(''); toast.success('Intervalo removido');
                    } catch (e) { toast.error('Falha ao remover'); }
                  })();
                 }} className="px-2 py-1 bg-white/10 text-white rounded ml-1 text-xs">Remover</button>
              </div>
              <button
                onClick={() => setSelectedDayForList(null)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {getAppointmentsForDay(selectedDayForList).length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📅</div>
                  <h4 className="text-xl font-bold text-white mb-2">Nenhum agendamento</h4>
                  <p className="text-gray-400">Este dia está livre para novos agendamentos.</p>
                </div>
              ) : (
                getAppointmentsForDay(selectedDayForList).map((appointment) => (
                  <div
                    key={appointment.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:bg-white/5 ${getStatusColor(appointment.status)}`}
                    onClick={() => setSelectedAppointment(appointment)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {/* Time and Status */}
                        <div className="flex items-center space-x-3 flex-shrink-0">
                          <div className="text-center">
                            <div className="font-bold text-xl text-white">{appointment.time}</div>
                            <div className="text-xs opacity-75">{appointment.service.duration}min</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{getStatusIcon(appointment.status)}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-white/10 whitespace-nowrap">
                              {getStatusText(appointment.status)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Client Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="font-bold text-white truncate">{appointment.client.name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <a 
                              href={`tel:${appointment.client.phone}`} 
                              className="text-sm text-gray-300 hover:text-white hover:underline truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {appointment.client.phone}
                            </a>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-300 truncate">
                              {appointment.service.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      {appointment.status === 'CANCELLED' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReleaseSlot(appointment); }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow"
                        >
                          Liberar horário
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-1 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl p-4 max-w-sm sm:max-w-md w-full border border-white/15 shadow-md" role="dialog" aria-modal="true" aria-label="Detalhes do Agendamento">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-bold text-white">Detalhes do Agendamento</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-400 hover:text-white transition-colors p-0.5 hover:bg-white/10 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-2 p-2 bg-white/5 rounded-lg">
                <div className="bg-amber-500/20 p-0.5 rounded-md">
                  <User className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-[11px]">Cliente</p>
                  <p className="text-white font-semibold text-xs">{selectedAppointment.client.name}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-2 bg-white/5 rounded-lg">
                <div className="bg-green-500/20 p-0.5 rounded-md">
                  <Phone className="h-3.5 w-3.5 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-[11px]">Telefone</p>
                  <p className="text-white font-semibold text-xs">
                    <a href={`tel:${selectedAppointment.client.phone}`} className="hover:underline">{selectedAppointment.client.phone}</a>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-2 bg-white/5 rounded-lg">
                <div className="bg-blue-500/20 p-0.5 rounded-md">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-[11px]">Data e Hora</p>
                  <p className="text-white font-semibold text-xs">
                    {format(parseLocalDate(selectedAppointment.date), 'dd/MM/yyyy', { locale: ptBR })} às {selectedAppointment.time}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-2 bg-white/5 rounded-lg">
                <div className="bg-purple-500/20 p-0.5 rounded-md">
                  <Clock className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-[11px]">Serviço</p>
                  <p className="text-white font-semibold text-xs">
                    {selectedAppointment.service.name} • {formatMoney(selectedAppointment.service.price)} • {selectedAppointment.service.duration}min
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-2 bg-white/5 rounded-lg">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  selectedAppointment.status === 'SCHEDULED' ? 'bg-blue-500' :
                  selectedAppointment.status === 'CONFIRMED' ? 'bg-green-500' :
                  selectedAppointment.status === 'COMPLETED' ? 'bg-purple-500' :
                  selectedAppointment.status === 'CANCELLED' ? 'bg-red-500' :
                  'bg-gray-500'
                }`} />
                <div className="flex items-center gap-1">
                  <p className="text-gray-300 text-[11px]">Status:</p>
                  <p className="text-white font-semibold flex items-center text-xs">
                    {getStatusIcon(selectedAppointment.status)} {getStatusText(selectedAppointment.status)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-1.5">
              {selectedAppointment.status === 'SCHEDULED' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate(selectedAppointment.id, 'CONFIRMED')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-1.5 px-2 rounded-lg transition-all duration-200 font-semibold text-xs shadow"
                    aria-label="Confirmar agendamento"
                  >
                    ✅ Confirmar + WhatsApp
                  </button>
                  <button
                    onClick={() => sendWhatsAppConfirmation(selectedAppointment)}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-1.5 px-2 rounded-lg transition-all duration-200 font-semibold text-xs shadow"
                    aria-label="Enviar WhatsApp"
                    title="Enviar confirmação via WhatsApp"
                  >
                    📱
                  </button>
                </>
              )}
              
              {selectedAppointment.status === 'CONFIRMED' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate(selectedAppointment.id, 'COMPLETED')}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-1.5 px-2 rounded-lg transition-all duration-200 font-semibold text-xs shadow"
                    aria-label="Concluir agendamento"
                  >
                    🎉 Concluir
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedAppointment.id, 'NO_SHOW')}
                    className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-1.5 px-2 rounded-lg transition-all duration-200 font-semibold text-xs shadow"
                    aria-label="Marcar como não compareceu"
                  >
                    👻 Não Compareceu
                  </button>
                  <button
                    onClick={() => sendWhatsAppConfirmation(selectedAppointment)}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-1.5 px-2 rounded-lg transition-all duration-200 font-semibold text-xs shadow"
                    aria-label="Enviar WhatsApp"
                    title="Reenviar confirmação via WhatsApp"
                  >
                    📱
                  </button>
                </>
              )}
              
              {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && (
                <button
                  onClick={() => handleStatusUpdate(selectedAppointment.id, 'CANCELLED')}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-1.5 px-2 rounded-lg transition-all duration-200 font-semibold text-xs shadow"
                  aria-label="Cancelar agendamento"
                >
                  ❌ Cancelar
                </button>
              )}

              {selectedAppointment.status === 'CANCELLED' && (
                <button
                  onClick={() => handleReleaseSlot(selectedAppointment)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-1.5 px-2 rounded-lg transition-all duration-200 font-semibold text-xs shadow"
                  aria-label="Liberar horário cancelado"
                >
                  🔓 Liberar horário
                </button>
              )}
              
              {/* Botão WhatsApp sempre disponível */}
              {(selectedAppointment.status === 'COMPLETED' || selectedAppointment.status === 'CANCELLED') && (
                <button
                  onClick={() => sendWhatsAppConfirmation(selectedAppointment)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-1.5 px-2 rounded-lg transition-all duration-200 font-semibold text-xs shadow"
                  aria-label="Enviar WhatsApp"
                  title="Enviar mensagem via WhatsApp"
                >
                  📱 WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}