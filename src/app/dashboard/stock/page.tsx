'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

interface StockItem {
  _id: string;
  presentation: string;
  quantity: number;
}

interface StockMovement {
  _id: string;
  presentation: string;
  type: 'entrada' | 'salida';
  quantity: number;
  date: string;
  reference?: string;
  notes?: string;
  clientName?: string;
  clientCompany?: string;
}

interface StockStats {
  periodo: {
    dias: number;
    desde: string;
    hasta: string;
  };
  ingresos: {
    total: number;
    cantidad: number;
    velocidad: number;
    promedio: number;
  };
  egresos: {
    total: number;
    cantidad: number;
    velocidad: number;
    promedio: number;
  };
  general: {
    totalMovimientos: number;
    velocidadTotal: number;
    stockActual: number;
    rotacionStock: number;
    tendencia: string;
  };
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stats, setStats] = useState<StockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    quantity: '',
    notes: '',
  });
  const router = useRouter();

  useEffect(() => {
    loadStock();
    loadMovements();
    loadStats();
  }, []);

  const loadStock = async () => {
    try {
      const response = await fetch('/api/stock');
      const data = await response.json();
      // Filtrar solo el stock de Granel
      const granelStock = data.filter((item: StockItem) => item.presentation === 'Granel');
      setStock(granelStock);
    } catch (error) {
      console.error('Error loading stock:', error);
    }
  };

  const loadMovements = async () => {
    try {
      const response = await fetch('/api/stock/movements?presentation=Granel&limit=20');
      const data = await response.json();
      setMovements(data.movements);
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stock/stats?presentation=Granel&days=30');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presentation: 'Granel',
          quantity: formData.quantity,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        setFormData({ quantity: '', notes: '' });
        setShowAddForm(false);
        loadStock();
        loadMovements();
        loadStats();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Error al agregar stock');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatQuantity = (quantity: number) => {
    return `${quantity.toFixed(2)} kg`;
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'creciente':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreciente':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTendenciaColor = (tendencia: string) => {
    switch (tendencia) {
      case 'creciente':
        return 'text-green-600';
      case 'decreciente':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  if (loading && movements.length === 0) {
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
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Stock de Pellets (Granel)
              </h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Agregar Stock
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stock Overview */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          {stock.length > 0 ? (
            stock.map((item) => (
              <div key={item._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Stock de Pellets - Granel
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {formatQuantity(item.quantity)}
                    </p>
                    <p className="text-sm text-gray-600">kilogramos disponibles</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Stock de Pellets - Granel
                  </h3>
                  <p className="text-3xl font-bold text-gray-400">
                    0.00 kg
                  </p>
                  <p className="text-sm text-gray-600">kilogramos disponibles</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Métricas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Ingresos */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ingresos (30 días)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatQuantity(stats.ingresos.total)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.ingresos.velocidad.toFixed(1)} kg/día • {stats.ingresos.cantidad} movimientos
                  </p>
                </div>
              </div>
            </div>

            {/* Egresos */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Egresos (30 días)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatQuantity(stats.egresos.total)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.egresos.velocidad.toFixed(1)} kg/día • {stats.egresos.cantidad} movimientos
                  </p>
                </div>
              </div>
            </div>

            {/* Velocidad Total */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Velocidad Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.general.velocidadTotal.toFixed(1)} kg/día
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.general.totalMovimientos} movimientos totales
                  </p>
                </div>
              </div>
            </div>

            {/* Tendencia */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tendencia</p>
                  <div className="flex items-center">
                    {getTendenciaIcon(stats.general.tendencia)}
                    <span className={`ml-2 text-lg font-bold capitalize ${getTendenciaColor(stats.general.tendencia)}`}>
                      {stats.general.tendencia}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Rotación: {(stats.general.rotacionStock * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Stock Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Agregar Stock de Pellets (Granel)
            </h3>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad (kg)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Ingrese cantidad en kg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Notas adicionales"
                  />
                </div>
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Agregar Stock
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Movements History */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Movimientos de Stock - Granel
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.length > 0 ? (
                  movements.map((movement) => (
                    <tr key={movement._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(movement.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          movement.type === 'entrada' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {movement.type === 'entrada' ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {movement.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatQuantity(movement.quantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movement.type === 'salida' && movement.clientName ? (
                          <div>
                            <div className="font-medium text-gray-900">{movement.clientName}</div>
                            <div className="text-xs text-gray-500">{movement.clientCompany}</div>
                          </div>
                        ) : (
                          movement.reference || '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movement.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No hay movimientos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
} 