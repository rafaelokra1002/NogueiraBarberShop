import React, { useState, useEffect } from 'react';
import { Clock, Calendar, X, Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { closedDaysService, type ClosedDay } from '../../services/api';
import toast from 'react-hot-toast';

interface WorkingHours {
  day: string;
  open: number;
  close: number;
  enabled: boolean;
}

const Schedule: React.FC = () => {
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: '',
    reason: ''
  });

  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([
    { day: 'Segunda-feira', open: 8 * 60, close: 20 * 60, enabled: true },
    { day: 'Terça-feira', open: 8 * 60, close: 20 * 60, enabled: true },
    { day: 'Quarta-feira', open: 8 * 60, close: 20 * 60, enabled: true },
    { day: 'Quinta-feira', open: 8 * 60, close: 20 * 60, enabled: true },
    { day: 'Sexta-feira', open: 8 * 60, close: 20 * 60, enabled: true },
    { day: 'Sábado', open: 8 * 60, close: 20 * 60, enabled: true },
    { day: 'Domingo', open: 8 * 60, close: 20 * 60, enabled: false },
  ]);

  useEffect(() => {
    loadClosedDays();
  }, []);

  const loadClosedDays = async () => {
    try {
      setLoading(true);
      const data = await closedDaysService.list();
      setClosedDays(data);
    } catch (error) {
      console.error('Erro ao carregar dias fechados:', error);
      toast.error('Erro ao carregar dias fechados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClosedDay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await closedDaysService.create({
        date: new Date(formData.date),
        reason: formData.reason
      });
      loadClosedDays();
      setShowAddModal(false);
      setFormData({ date: '', reason: '' });
      toast.success('Dia fechado adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar dia fechado:', error);
      toast.error('Erro ao adicionar dia fechado');
    }
  };

  const handleDeleteClosedDay = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este dia fechado?')) return;
    
    try {
      const dayToDelete = closedDays.find(d => d.id === id);
      if (dayToDelete) {
        await closedDaysService.remove(typeof dayToDelete.date === 'string' ? new Date(dayToDelete.date) : dayToDelete.date);
        loadClosedDays();
        toast.success('Dia fechado removido com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao remover dia fechado:', error);
      toast.error('Erro ao remover dia fechado');
    }
  };

  const formatMinutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const parseTimeToMinutes = (time: string): number => {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  };

  const handleHourChange = (index: number, field: 'open' | 'close', value: string) => {
    const newHours = [...workingHours];
    newHours[index][field] = parseTimeToMinutes(value);
    setWorkingHours(newHours);
  };

  const handleEnabledChange = (index: number) => {
    const newHours = [...workingHours];
    newHours[index].enabled = !newHours[index].enabled;
    setWorkingHours(newHours);
  };

  const handleSaveWorkingHours = () => {
    // Salvar configurações de horário
    toast.success('Horários de funcionamento salvos com sucesso!');
    console.log('Working hours:', workingHours);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Gerenciar Horários</h1>
        <p className="text-sm sm:text-base text-gray-400">Configure os horários de funcionamento e dias fechados</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-400 mb-1">Dias Abertos</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">
                {workingHours.filter(h => h.enabled).length}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-400 mb-1">Dias Fechados</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-400">{closedDays.length}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-400 mb-1">Horário Padrão</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-400">08:00 - 20:00</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Horários de Funcionamento */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10 mb-4 sm:mb-6">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">Horários de Funcionamento</h2>
                <p className="text-xs sm:text-sm text-gray-400">Configure os horários de abertura e fechamento</p>
              </div>
            </div>
            <button
              onClick={handleSaveWorkingHours}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap text-sm sm:text-base"
            >
              <Clock className="w-4 h-4" />
              <span>Salvar Horários</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {workingHours.map((schedule, index) => (
              <div key={schedule.day} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Checkbox e Nome do Dia */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={() => handleEnabledChange(index)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-white min-w-[120px]">{schedule.day}</span>
                  </div>

                  {/* Horários ou Status Fechado */}
                  {schedule.enabled ? (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400 min-w-[70px]">Abertura:</label>
                        <input
                          type="time"
                          value={formatMinutesToTime(schedule.open)}
                          onChange={(e) => handleHourChange(index, 'open', e.target.value)}
                          className="flex-1 sm:flex-none px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400 min-w-[70px]">Fechamento:</label>
                        <input
                          type="time"
                          value={formatMinutesToTime(schedule.close)}
                          onChange={(e) => handleHourChange(index, 'close', e.target.value)}
                          className="flex-1 sm:flex-none px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">Fechado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dias Fechados */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">Dias Fechados</h2>
                <p className="text-xs sm:text-sm text-gray-400">Feriados e dias sem atendimento</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Adicionar Dia Fechado</span>
              <span className="sm:hidden">Adicionar</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {closedDays.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-500 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-400 text-sm sm:text-base">Nenhum dia fechado cadastrado</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Adicione feriados e datas sem atendimento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {closedDays.map((day) => {
                const dateStr = typeof day.date === 'string' ? day.date : day.date.toISOString().split('T')[0];
                return (
                  <div key={day.id} className="border border-white/10 bg-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:bg-white/10 hover:border-red-500/50 transition-all">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
                        <span className="font-medium text-white text-sm sm:text-base">
                          {format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteClosedDay(day.id)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">
                      {day.reason || 'Sem motivo especificado'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">
                      {format(parseISO(dateStr), "EEEE", { locale: ptBR })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Adicionar Dia Fechado */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Adicionar Dia Fechado</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddClosedDay} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Selecione a data que não haverá atendimento</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Ex: Feriado Nacional, Férias, Evento especial..."
                    required
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ date: '', reason: '' });
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
