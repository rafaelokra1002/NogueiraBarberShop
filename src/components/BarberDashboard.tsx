import { useState } from 'react';
import { Calendar, Clock, User, Phone, CheckCircle, X, Eye, Users, DollarSign, Filter } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '../lib/dateUtils';

// Define local Appointment type (supports both API statuses and localized lowercase variants)
interface Appointment {
  id: string;
  date: string | Date;
  time: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'agendado' | 'confirmado' | 'concluido' | 'cancelado';
  clientName: string;
  clientPhone: string;
  service: string;
}

interface BarberDashboardProps {
  appointments: Appointment[];
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
}

export default function BarberDashboard({ appointments, onUpdateStatus }: BarberDashboardProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Appointment['status']>('all');

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

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      // Localized
      case 'agendado':
      case 'SCHEDULED': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'confirmado':
      case 'CONFIRMED': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'concluido':
      case 'COMPLETED': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'cancelado':
      case 'CANCELLED': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'NO_SHOW': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusText = (status: Appointment['status']) => {
    switch (status) {
      case 'agendado':
      case 'SCHEDULED': return 'Agendado';
      case 'confirmado':
      case 'CONFIRMED': return 'Confirmado';
      case 'concluido':
      case 'COMPLETED': return 'Concluído';
      case 'cancelado':
      case 'CANCELLED': return 'Cancelado';
      case 'NO_SHOW': return 'Não Compareceu';
      default: return String(status);
    }
  };

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'agendado':
      case 'SCHEDULED': return '📅';
      case 'confirmado':
      case 'CONFIRMED': return '✅';
      case 'concluido':
      case 'COMPLETED': return '🎉';
      case 'cancelado':
      case 'CANCELLED': return '❌';
      case 'NO_SHOW': return '👻';
      default: return '📋';
    }
  };

  const weekDays = getWeekDays();
  const totalAppointments = appointments.length;
  const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmado' || apt.status === 'CONFIRMED').length;
  const completedAppointments = appointments.filter(apt => apt.status === 'concluido' || apt.status === 'COMPLETED').length;

  // Calculate revenue (assuming average price of R$ 30)
  const totalRevenue = completedAppointments * 30;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-4">
          Painel do Barbeiro
        </h1>
        <p className="text-xl text-gray-300">
          Gerencie seus agendamentos e acompanhe o desempenho
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium">Total de Agendamentos</p>
              <p className="text-3xl font-bold text-white mt-1">{totalAppointments}</p>
              <p className="text-blue-300 text-xs mt-1">Este mês</p>
            </div>
            <div className="bg-blue-500/30 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Calendar className="h-6 w-6 text-blue-300" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm font-medium">Confirmados</p>
              <p className="text-3xl font-bold text-white mt-1">{confirmedAppointments}</p>
              <p className="text-green-300 text-xs mt-1">Próximos atendimentos</p>
            </div>
            <div className="bg-green-500/30 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-6 w-6 text-green-300" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-medium">Concluídos</p>
              <p className="text-3xl font-bold text-white mt-1">{completedAppointments}</p>
              <p className="text-purple-300 text-xs mt-1">Atendimentos finalizados</p>
            </div>
            <div className="bg-purple-500/30 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Users className="h-6 w-6 text-purple-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/30 hover:border-amber-400/50 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-200 text-sm font-medium">Faturamento</p>
              <p className="text-3xl font-bold text-white mt-1">R$ {totalRevenue}</p>
              <p className="text-amber-300 text-xs mt-1">Este mês</p>
            </div>
            <div className="bg-amber-500/30 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-6 w-6 text-amber-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Week Navigation and Filters */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Agenda da Semana</h2>
            <p className="text-gray-300">
              {format(weekDays[0], 'dd/MM', { locale: ptBR })} - {format(weekDays[6], 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Todos os Status</option>
                <option value="agendado">Agendados</option>
                <option value="confirmado">Confirmados</option>
                <option value="concluido">Concluídos</option>
                <option value="cancelado">Cancelados</option>
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
                onClick={() => setSelectedWeek(new Date())}
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

        {/* Week Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isDayToday = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`bg-white/5 rounded-xl p-4 border transition-all duration-300 hover:bg-white/10 ${
                  isDayToday 
                    ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10 shadow-lg' 
                    : 'border-white/10'
                }`}
              >
                <div className="text-center mb-4">
                  <div className={`font-bold text-sm ${isDayToday ? 'text-amber-400' : 'text-white'}`}>
                    {format(day, 'EEEE', { locale: ptBR }).toUpperCase()}
                  </div>
                  <div className={`text-2xl font-bold ${isDayToday ? 'text-amber-400' : 'text-gray-300'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(day, 'MMM', { locale: ptBR })}
                  </div>
                  {isDayToday && (
                    <div className="text-xs text-amber-400 font-bold mt-1">HOJE</div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {dayAppointments.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-2">📅</div>
                      <p className="text-gray-500 text-sm">
                        Nenhum agendamento
                      </p>
                    </div>
                  ) : (
                    dayAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${getStatusColor(appointment.status)}`}
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm">{appointment.time}</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">{getStatusIcon(appointment.status)}</span>
                            <Eye className="h-3 w-3 opacity-60" />
                          </div>
                        </div>
                        <div className="text-xs font-medium mb-1">
                          {appointment.clientName}
                        </div>
                        <div className="text-xs opacity-75">
                          {appointment.service}
                        </div>
                        <div className="text-xs opacity-60 mt-1">
                          {getStatusText(appointment.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Detalhes do Agendamento</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6 mb-8">
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
                <div className="bg-amber-500/20 p-2 rounded-lg">
                  <User className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Cliente</p>
                  <p className="text-white font-semibold">{selectedAppointment.clientName}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <Phone className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Telefone</p>
                  <p className="text-white font-semibold">{selectedAppointment.clientPhone}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Data e Hora</p>
                  <p className="text-white font-semibold">
                    {format(parseLocalDate(selectedAppointment.date), 'dd/MM/yyyy', { locale: ptBR })} às {selectedAppointment.time}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Serviço</p>
                  <p className="text-white font-semibold">{selectedAppointment.service}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
                <div className={`w-4 h-4 rounded-full ${
                  selectedAppointment.status === 'agendado' ? 'bg-blue-500' :
                  selectedAppointment.status === 'confirmado' ? 'bg-green-500' :
                  selectedAppointment.status === 'concluido' ? 'bg-purple-500' :
                  'bg-red-500'
                }`} />
                <div>
                  <p className="text-gray-300 text-sm">Status</p>
                  <p className="text-white font-semibold flex items-center">
                    {getStatusIcon(selectedAppointment.status)} {getStatusText(selectedAppointment.status)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {selectedAppointment.status === 'agendado' && (
                <button
                  onClick={() => {
                    onUpdateStatus(selectedAppointment.id, 'confirmado');
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl transition-all duration-200 font-semibold shadow-lg"
                >
                  ✅ Confirmar
                </button>
              )}
              
              {selectedAppointment.status === 'confirmado' && (
                <button
                  onClick={() => {
                    onUpdateStatus(selectedAppointment.id, 'concluido');
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl transition-all duration-200 font-semibold shadow-lg"
                >
                  🎉 Concluir
                </button>
              )}
              
              {selectedAppointment.status !== 'cancelado' && selectedAppointment.status !== 'concluido' && (
                <button
                  onClick={() => {
                    onUpdateStatus(selectedAppointment.id, 'cancelado');
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-4 rounded-xl transition-all duration-200 font-semibold shadow-lg"
                >
                  ❌ Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}