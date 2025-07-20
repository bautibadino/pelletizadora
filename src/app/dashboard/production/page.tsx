'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Eye,
  TrendingUp,
  Package,
  Activity,
  Calculator,
  User,
  Calendar,
  BarChart3
} from 'lucide-react';

interface Production {
  _id: string;
  date: string;
  rollType: string;
  rollQuantity: number;
  pelletQuantity: number;
  efficiency: number;
  operator?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface RollStock {
  _id: string;
  type: string;
  quantity: number;
}

interface Presentation {
  presentation: string;
  quantity: number;
}

export default function ProductionPage() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [rolls, setRolls] = useState<RollStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  const [formData, setFormData] = useState({
    rollType: '',
    rollQuantity: '',
    pelletQuantity: '',
    efficiency: '',
    operator: '',
    notes: '',
  });

  const [presentations, setPresentations] = useState<Presentation[]>([
    { presentation: 'Bolsa 25kg', quantity: 0 },
    { presentation: 'Big Bag', quantity: 0 },
    { presentation: 'Granel', quantity: 0 },
  ]);

  useEffect(() => {
    loadProductions();
    loadRolls();
  }, [currentPage]);

  const loadProductions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      const response = await fetch(`/api/production?${params}`);
      const data = await response.json();
      
      setProductions(data.productions);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error loading productions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRolls = async () => {
    try {
      const response = await fetch('/api/rolls');
      const data = await response.json();
      setRolls(data.rolls);
    } catch (error) {
      console.error('Error loading rolls:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          presentations: presentations.filter(p => p.quantity > 0),
        }),
      });

      if (response.ok) {
        setFormData({
          rollType: '',
          rollQuantity: '',
          pelletQuantity: '',
          efficiency: '',
          operator: '',
          notes: '',
        });
        setPresentations([
          { presentation: 'Bolsa 25kg', quantity: 0 },
          { presentation: 'Big Bag', quantity: 0 },
          { presentation: 'Granel', quantity: 0 },
        ]);
        setShowAddForm(false);
        loadProductions();
        loadRolls();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error creating production:', error);
      alert('Error al registrar la producción');
    }
  };

  const updatePresentation = (index: number, field: keyof Presentation, value: string | number) => {
    const newPresentations = [...presentations];
    newPresentations[index] = {
      ...newPresentations[index],
      [field]: field === 'quantity' ? parseFloat(value as string) || 0 : value,
    };
    setPresentations(newPresentations);
  };

  const calculateEfficiency = () => {
    const rollQty = parseFloat(formData.rollQuantity) || 0;
    const pelletQty = parseFloat(formData.pelletQuantity) || 0;
    if (rollQty > 0) {
      const efficiency = (pelletQty / rollQty) * 100;
      setFormData(prev => ({ ...prev, efficiency: efficiency.toFixed(2) }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const formatQuantity = (quantity: number) => {
    return `${quantity.toFixed(2)} ton`;
  };

  const formatEfficiency = (efficiency: number) => {
    return `${(efficiency * 100).toFixed(1)}%`;
  };

  const formatRollType = (type: string) => {
    // Convertir rollo_alfalfa -> Alfalfa, rollo_maiz -> Maíz, etc.
    if (type.startsWith('rollo_')) {
      const name = type.replace('rollo_', '');
      // Capitalizar primera letra
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return type;
  };

  if (loading && productions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <Activity className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Producción de Pellets
              </h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Nueva Producción
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Production Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Registrar Producción
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Rollo *
                  </label>
                  <select
                    value={formData.rollType}
                    onChange={(e) => setFormData({ ...formData, rollType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    required
                  >
                    <option value="">Seleccionar rollo</option>
                    {rolls.map((roll) => (
                      <option key={roll._id} value={roll.type}>
                        {formatRollType(roll.type)} - {formatQuantity(roll.quantity)} disponible
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de Rollos (ton) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.rollQuantity}
                    onChange={(e) => setFormData({ ...formData, rollQuantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de Pellets (ton) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.pelletQuantity}
                    onChange={(e) => {
                      setFormData({ ...formData, pelletQuantity: e.target.value });
                      calculateEfficiency();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Eficiencia (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.efficiency}
                    onChange={(e) => setFormData({ ...formData, efficiency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                    placeholder="0.0"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operador
                  </label>
                  <input
                    type="text"
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                    placeholder="Nombre del operador"
                  />
                </div>
              </div>

              {/* Presentaciones de Pellets */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Presentaciones de Pellets Generadas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {presentations.map((presentation, index) => (
                    <div key={presentation.presentation}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {presentation.presentation}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={presentation.quantity}
                        onChange={(e) => updatePresentation(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                  rows={3}
                  placeholder="Notas sobre la producción"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
                >
                  Registrar Producción
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Productions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Producciones ({productions.length})
            </h3>
          </div>
          {productions.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay producciones registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo de Rollo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rollos Consumidos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pellets Producidos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Eficiencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operador
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productions.map((production) => (
                    <tr key={production._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(production.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {formatRollType(production.rollType)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatQuantity(production.rollQuantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatQuantity(production.pelletQuantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Calculator className="h-3 w-3 mr-1" />
                          {formatEfficiency(production.efficiency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {production.operator || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setSelectedProduction(production)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Production Details Modal */}
      {selectedProduction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles de Producción
                </h3>
                <button
                  onClick={() => setSelectedProduction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha:</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedProduction.date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo de Rollo:</label>
                  <p className="text-sm text-gray-900">{formatRollType(selectedProduction.rollType)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Rollos Consumidos:</label>
                  <p className="text-sm text-gray-900">{formatQuantity(selectedProduction.rollQuantity)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pellets Producidos:</label>
                  <p className="text-sm text-gray-900">{formatQuantity(selectedProduction.pelletQuantity)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Eficiencia:</label>
                  <p className="text-sm text-gray-900">{formatEfficiency(selectedProduction.efficiency)}</p>
                </div>
                {selectedProduction.operator && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Operador:</label>
                    <p className="text-sm text-gray-900">{selectedProduction.operator}</p>
                  </div>
                )}
                {selectedProduction.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notas:</label>
                    <p className="text-sm text-gray-900">{selectedProduction.notes}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha de Registro:</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedProduction.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 