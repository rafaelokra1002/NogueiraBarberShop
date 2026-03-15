import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { appointmentService, clientService } from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    todayAppointments: 0,
    monthRevenue: 0,
    completedToday: 0,
  });

  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appointments, clients] = await Promise.all([
        appointmentService.getAll(),
        clientService.getAll(),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime();
      });

      const completedToday = todayAppointments.filter(
        (apt: any) => apt.status === 'COMPLETED'
      ).length;

      // Calcular receita do mês (agendamentos não cancelados)
      const monthRevenue = appointments
        .filter((apt: any) => {
          const aptDate = new Date(apt.date);
          return (
            aptDate.getMonth() === today.getMonth() &&
            aptDate.getFullYear() === today.getFullYear() &&
            apt.status !== 'CANCELLED'
          );
        })
        .reduce((acc: number, apt: any) => {
          if (apt.services && apt.services.length > 0) {
            return acc + apt.services.reduce((s: number, as: any) => s + (as.service?.price || 0), 0);
          }
          return acc + (apt.service?.price || 0);
        }, 0);

      setStats({
        totalClients: clients.length,
        todayAppointments: todayAppointments.length,
        monthRevenue,
        completedToday,
      });

      // Últimos 5 agendamentos
      setRecentAppointments(appointments.slice(0, 5));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'CONFIRMED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'Agendado';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'COMPLETED':
        return 'Concluído';
      case 'CANCELLED':
        return 'Cancelado';
      case 'NO_SHOW':
        return 'Não Compareceu';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-amber-500/30 transition-all duration-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-blue-500/20 p-2 sm:p-3 rounded-xl">
              <Users className="h-4 w-4 sm:h-6 sm:w-6 text-blue-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalClients}</p>
              <p className="text-gray-400 text-xs sm:text-sm">Clientes</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 text-green-400 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Total cadastrados</span>
            <span className="sm:hidden">Total</span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-amber-500/30 transition-all duration-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-amber-500/20 p-2 sm:p-3 rounded-xl">
              <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-amber-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-white">{stats.todayAppointments}</p>
              <p className="text-gray-400 text-xs sm:text-sm">Hoje</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 text-amber-400 text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Agendamentos</span>
            <span className="sm:hidden">Agenda</span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-amber-500/30 transition-all duration-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-green-500/20 p-2 sm:p-3 rounded-xl">
              <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-3xl font-bold text-white">
                R$ {stats.monthRevenue.toFixed(0)}
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">Este mês</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 text-green-400 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Receita</span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-amber-500/30 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500/20 p-3 rounded-xl">
              <CheckCircle className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{stats.completedToday}</p>
              <p className="text-gray-400 text-sm">Concluídos</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-purple-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Hoje</span>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Clock className="h-6 w-6 mr-2 text-amber-400" />
          Agendamentos Recentes
        </h3>

        <div className="space-y-3">
          {recentAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum agendamento encontrado</p>
            </div>
          ) : (
            recentAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-amber-500/30 transition-all duration-200 gap-3"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-bold text-sm sm:text-base">
                      {apt.client?.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm sm:text-base truncate">{apt.client?.name}</p>
                    <p className="text-gray-400 text-xs sm:text-sm truncate">
                      {apt.service?.name} • {apt.time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                  <p className="text-gray-400 text-xs sm:text-sm">
                    {format(new Date(apt.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <div
                    className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 rounded-full border whitespace-nowrap ${getStatusColor(
                      apt.status
                    )}`}
                  >
                    {getStatusIcon(apt.status)}
                    <span className="text-xs font-medium">{getStatusText(apt.status)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
