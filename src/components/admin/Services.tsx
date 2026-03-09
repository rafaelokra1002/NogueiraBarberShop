import { useState, useEffect } from 'react';
import {
  Scissors,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Clock,
  Star,
  Search
} from 'lucide-react';
import { serviceService } from '../../services/api';
import toast from 'react-hot-toast';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    isPopular: false
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await serviceService.getAll();
      setServices(data);
    } catch (error) {
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
        isPopular: formData.isPopular
      };

      if (editingService) {
        await serviceService.update(editingService.id, data);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await serviceService.create(data);
        toast.success('Serviço criado com sucesso!');
      }

      loadServices();
      closeModal();
    } catch (error) {
      toast.error('Erro ao salvar serviço');
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration.toString(),
      price: service.price.toString(),
      isPopular: service.isPopular || false
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      await serviceService.delete(id);
      toast.success('Serviço excluído com sucesso!');
      loadServices();
    } catch (error) {
      toast.error('Erro ao excluir serviço');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      duration: '',
      price: '',
      isPopular: false
    });
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="bg-amber-500/20 p-2 sm:p-3 rounded-xl">
              <Scissors className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-white">{services.length}</p>
              <p className="text-gray-400 text-xs sm:text-sm">Total de Serviços</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="bg-green-500/20 p-2 sm:p-3 rounded-xl">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                R$ {services.length > 0 
                  ? (services.reduce((acc, s) => acc + s.price, 0) / services.length).toFixed(2)
                  : '0.00'}
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">Preço Médio</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="bg-purple-500/20 p-2 sm:p-3 rounded-xl">
              <Star className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {services.filter(s => s.isPopular).length}
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">Serviços Populares</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 max-w-full sm:max-w-md relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base"
          />
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg whitespace-nowrap"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base">Novo Serviço</span>
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredServices.length === 0 ? (
          <div className="col-span-full text-center py-8 sm:py-12 text-gray-400">
            <Scissors className="h-12 sm:h-16 w-12 sm:w-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm sm:text-base">Nenhum serviço encontrado</p>
          </div>
        ) : (
          filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-amber-500/30 transition-all duration-200 relative"
            >
              {service.isPopular && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-lg">
                  <Star className="h-3 w-3 mr-1" />
                  Popular
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="bg-gradient-to-br from-amber-400 to-orange-600 p-3 rounded-xl">
                  <Scissors className="h-6 w-6 text-black" />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-white font-bold text-lg mb-2">{service.name}</h3>

              {service.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {service.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{service.duration} min</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-400">
                    R$ {service.price.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ex: Corte Degradê"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  placeholder="Descrição do serviço"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Duração (min) *
                  </label>
                  <input
                    type="number"
                    required
                    min="5"
                    step="5"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="30"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="30.00"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={formData.isPopular}
                  onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  className="w-5 h-5 rounded bg-white/5 border border-white/10 checked:bg-amber-500 focus:ring-2 focus:ring-amber-500"
                />
                <label htmlFor="isPopular" className="text-gray-300 text-sm font-medium cursor-pointer">
                  Marcar como serviço popular
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200"
                >
                  {editingService ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
