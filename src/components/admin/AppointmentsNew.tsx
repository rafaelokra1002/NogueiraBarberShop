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
  MessageSquare
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { appointmentService } from '../../services/api';
import toast from 'react-hot-toast';
import { parseLocalDate } from '../../lib/dateUtils';

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

type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
const formatMoney = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Appointments() {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDayForList, setSelectedDayForList] = useState<Date | null>(new Date());

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await appointmentService.getAll();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureAppointments = (data as AppointmentWithRelations[]).filter(apt => {
        const appointmentDate = parseLocalDate(apt.date);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate >= today;
      });
      
      setAppointments(futureAppointments);
    } catch (error) {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setIsLoading(false);
    }
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
    const phone = appointment.client.phone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
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
          `📍 *Local:* Barbearia NOGUEIRA\n\n` +
          `Aguardamos você! 🔥`;
        break;
        
      case 'reminder':
        message = `⏰ *LEMBRETE DE AGENDAMENTO*\n\n` +
          `Olá ${appointment.client.name}! 👋\n\n` +
          `Lembramos que você tem um agendamento:\n\n` +
          `📅 *Data:* ${date}\n` +
          `⏰ *Horário:* ${appointment.time}\n` +
          `✂️ *Serviço:* ${appointment.service.name}\n\n` +
          `Te esperamos! 😊`;
        break;
        
      default:
        message = `📋 *INFORMAÇÕES DO AGENDAMENTO*\n\n` +
          `Olá ${appointment.client.name}! 👋\n\n` +
          `Detalhes do seu agendamento:\n\n` +
          `📅 *Data:* ${date}\n` +
          `⏰ *Horário:* ${appointment.time}\n` +
          `✂️ *Serviço:* ${appointment.service.name}\n` +
          `💰 *Valor:* ${formatMoney(appointment.service.price)}`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    toast.success(`Mensagem enviada via WhatsApp!`);
  };

  const weekDays = useMemo(() => getWeekDays(), [selectedWeek]);
  const { totalAppointments, confirmedAppointments, completedAppointments } = useMemo(() => ({
    totalAppointments: appointments.length,
    confirmedAppointments: appointments.filter(apt => apt.status === 'CONFIRMED').length,
    completedAppointments: appointments.filter(apt => apt.status === 'COMPLETED').length,
  }), [appointments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-blue-500/20 p-2 sm:p-3 rounded-xl">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Total de Agendamentos</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{totalAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-green-500/20 p-2 sm:p-3 rounded-xl">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Confirmados</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{confirmedAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-purple-500/20 p-2 sm:p-3 rounded-xl">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Concluídos</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{completedAppointments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtrar por Status
            </h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-auto px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="all">Todos</option>
              <option value="SCHEDULED">Agendados</option>
              <option value="CONFIRMED">Confirmados</option>
              <option value="COMPLETED">Concluídos</option>
              <option value="CANCELLED">Cancelados</option>
              <option value="NO_SHOW">Não Compareceram</option>
            </select>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="text-white text-xl sm:text-2xl">←</span>
            </button>
            <h3 className="text-base sm:text-lg font-medium text-white">
              {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h3>
            <button
              onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="text-white text-xl sm:text-2xl">→</span>
            </button>
          </div>

          {/* Week Days Grid */}
          <div className="grid grid-cols-7 gap-2 sm:gap-4">
            {weekDays.map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isDayToday = isToday(day);
              const isSelected = selectedDayForList && isSameDay(day, selectedDayForList);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDayForList(isSelected ? null : day)}
                  className={`p-2 sm:p-4 rounded-lg sm:rounded-xl transition-all border-2 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500'
                      : isDayToday
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="text-center">
                    <p className={`text-[10px] sm:text-xs font-medium mb-1 ${
                      isSelected || isDayToday ? 'text-white' : 'text-gray-400'
                    }`}>
                      {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                    </p>
                    <p className={`text-lg sm:text-2xl font-bold mb-1 sm:mb-2 ${
                      isSelected ? 'text-amber-400' : isDayToday ? 'text-blue-400' : 'text-white'
                    }`}>
                      {format(day, 'd')}
                    </p>
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] sm:text-xs ${
                        dayAppointments.length > 0 ? 'text-amber-400' : 'text-gray-500'
                      }`}>
                        {dayAppointments.length} agend.
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Appointments List */}
        {selectedDayForList && (
          <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center justify-between">
              <span>
                Agendamentos de {format(selectedDayForList, "dd 'de' MMMM", { locale: ptBR })}
              </span>
              <button
                onClick={() => setSelectedDayForList(null)}
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                Ver todos
              </button>
            </h3>

            {getAppointmentsForDay(selectedDayForList).length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-500 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-400">Nenhum agendamento para este dia</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {getAppointmentsForDay(selectedDayForList).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                            {getStatusIcon(appointment.status)} {getStatusText(appointment.status)}
                          </span>
                          <span className="text-amber-400 font-semibold text-sm sm:text-base">{appointment.time}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <User className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{appointment.client.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{appointment.client.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <span>✂️</span>
                            <span>{appointment.service.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{appointment.service.duration} min - {formatMoney(appointment.service.price)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'CONFIRMED')}
                          className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-1.5 sm:py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors border border-green-500/30 text-xs sm:text-sm"
                        >
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Confirmar</span>
                        </button>
                        <button
                          onClick={() => sendWhatsAppConfirmation(appointment)}
                          className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-1.5 sm:py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors border border-blue-500/30 text-xs sm:text-sm"
                        >
                          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        <button
                          onClick={() => setSelectedAppointment(appointment)}
                          className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 text-xs sm:text-sm"
                        >
                          <span>Mais</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h3 className="text-xl font-semibold text-white">Detalhes do Agendamento</h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Status</label>
                    <div className={`inline-block px-4 py-2 rounded-lg border ${getStatusColor(selectedAppointment.status)} mt-1`}>
                      {getStatusIcon(selectedAppointment.status)} {getStatusText(selectedAppointment.status)}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Cliente</label>
                    <p className="text-white font-medium">{selectedAppointment.client.name}</p>
                    <p className="text-gray-300">{selectedAppointment.client.phone}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Data e Horário</label>
                    <p className="text-white">
                      {format(parseLocalDate(selectedAppointment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {selectedAppointment.time}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Serviço</label>
                    <p className="text-white">{selectedAppointment.service.name}</p>
                    <p className="text-gray-300">
                      {selectedAppointment.service.duration} minutos - {formatMoney(selectedAppointment.service.price)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleStatusUpdate(selectedAppointment.id, 'CONFIRMED')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors border border-green-500/30"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Confirmar
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedAppointment.id, 'COMPLETED')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors border border-purple-500/30"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Concluir
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedAppointment.id, 'CANCELLED')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors border border-red-500/30"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={() => sendWhatsAppConfirmation(selectedAppointment, 'confirmation')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors border border-blue-500/30"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Enviar Confirmação
                  </button>
                  <button
                    onClick={() => sendWhatsAppConfirmation(selectedAppointment, 'reminder')}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors border border-amber-500/30"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Enviar Lembrete
                  </button>
                  <button
                    onClick={() => handleReleaseSlot(selectedAppointment)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors border border-red-500/30"
                  >
                    <X className="h-4 w-4" />
                    Deletar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
