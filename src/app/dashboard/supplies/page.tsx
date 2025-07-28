'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Search,
  Eye,
  TrendingUp,
  Package,
  Calendar,
  User,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingDown
} from 'lucide-react';
import { useToast, ToastContainer } from '@/components/Toast';
import { roundToTwoDecimals, formatCurrency } from '@/lib/utils';

interface SupplyStock {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  supplier?: {
    _id: string;
    businessName: string;
    contact: string;
  };
  invoiceNumber?: string;
  minStock?: number;
  createdAt: string;
  updatedAt: string;
}

interface SupplyMovement {
  _id: string;
  supplyName: string;
  type: 'entrada' | 'salida' | 'produccion';
  quantity: number;
  unit: string;
  date: string;
  supplier?: {
    _id: string;
    businessName: string;
    contact: string;
  };
  invoiceNumber?: string;
  reference?: string;
  notes?: string;
}

interface SupplyStats {
  totalItems: number;
  lowStock: number;
}

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<SupplyStock[]>([]);
  const [movements, setMovements] = useState<SupplyMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<SupplyStock | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<SupplyStats>({ totalItems: 0, lowStock: 0 });
  const router = useRouter();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'kg',
    supplierId: '',
    minStock: '',
    notes: '',
  });

  useEffect(() => {
    loadSupplies();
    loadMovements();
  }, [currentPage, searchTerm]);

  const loadSupplies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/supplies?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validar que la respuesta tenga la estructura esperada
      if (!data || typeof data !== 'object') {
        throw new Error('Respuesta inválida del servidor');
      }
      
      // Validar supplies
      if (!Array.isArray(data.supplies)) {
        console.warn('API no devolvió un array de supplies, usando array vacío');
        setSupplies([]);
      } else {
        setSupplies(data.supplies);
      }
      
      // Validar pagination
      if (data.pagination && typeof data.pagination === 'object') {
        setTotalPages(data.pagination.pages || 1);
      } else {
        console.warn('API no devolvió pagination válida, usando valores por defecto');
        setTotalPages(1);
      }
      
      // Validar stats
      if (data.stats && typeof data.stats === 'object') {
        setStats({
          totalItems: data.stats.totalItems || 0,
          lowStock: data.stats.lowStock || 0
        });
      } else {
        console.warn('API no devolvió stats válidas, usando valores por defecto');
        setStats({ totalItems: 0, lowStock: 0 });
      }
      
    } catch (err) {
      console.error('Error loading supplies:', err);
      error('Error al cargar los insumos. Por favor, intente nuevamente.');
      
      // Establecer valores por defecto en caso de error
      setSupplies([]);
      setTotalPages(1);
      setStats({ totalItems: 0, lowStock: 0 });
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const response = await fetch('/api/supplies/movements?limit=10');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validar que la respuesta tenga la estructura esperada
      if (!data || typeof data !== 'object') {
        throw new Error('Respuesta inválida del servidor');
      }
      
      // Validar movements
      if (!Array.isArray(data.movements)) {
        console.warn('API no devolvió un array de movements, usando array vacío');
        setMovements([]);
      } else {
        setMovements(data.movements);
      }
      
    } catch (err) {
      console.error('Error loading movements:', err);
      error('Error al cargar los movimientos. Por favor, intente nuevamente.');
      
      // Establecer valores por defecto en caso de error
      setMovements([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.quantity) {
      error('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      const response = await fetch('/api/supplies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          quantity: roundToTwoDecimals(Number(formData.quantity)),
          unit: formData.unit,
          supplier: formData.supplierId || undefined,
          minStock: formData.minStock ? Number(formData.minStock) : 0,
          notes: formData.notes
        }),
      });

      if (response.ok) {
        success('Insumo agregado exitosamente');
        setFormData({
          name: '',
          quantity: '',
          unit: 'kg',
          supplierId: '',
          minStock: '',
          notes: '',
        });
        setShowAddForm(false);
        loadSupplies();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al agregar insumo');
      }
    } catch (err) {
      console.error('Error adding supply:', err);
      error('Error al agregar insumo');
    }
  };

  const handleMovement = async (supplyName: string, type: 'salida' | 'produccion', quantity: number) => {
    try {
      const response = await fetch('/api/supplies/movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplyName,
          type,
          quantity: roundToTwoDecimals(quantity),
          unit: 'kg',
          reference: type === 'produccion' ? 'Producción' : 'Salida manual',
          notes: type === 'produccion' ? 'Consumo en producción' : 'Salida manual'
        }),
      });

      if (response.ok) {
        success(`${type === 'produccion' ? 'Consumo' : 'Salida'} registrado exitosamente`);
        loadSupplies();
        loadMovements();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al registrar movimiento');
      }
    } catch (err) {
      console.error('Error creating movement:', err);
      error('Error al registrar movimiento');
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entrada': return <TrendingUp className="h-4 w-4" />;
      case 'salida': return <TrendingDown className="h-4 w-4" />;
      case 'produccion': return <Activity className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getMovementText = (type: string) => {
    switch (type) {
      case 'entrada': return 'Entrada';
      case 'salida': return 'Salida';
      case 'produccion': return 'Producción';
      default: return 'Movimiento';
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'entrada': return 'text-green-600 bg-green-100';
      case 'salida': return 'text-red-600 bg-red-100';
      case 'produccion': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const formatQuantity = (quantity: number, unit: string) => {
    return `${roundToTwoDecimals(quantity)} ${unit}`;
  };

  const isLowStock = (supply: SupplyStock) => {
    return supply.minStock && supply.quantity <= supply.minStock;
  };

  if (loading && supplies.length === 0) {
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
              <Package className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Gestión de Insumos
              </h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Agregar Insumo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Insumos</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalItems}
                </p>
              </div>
            </div>
          </div>
          
                    <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Insumos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalItems}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.lowStock}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar insumos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadSupplies}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Supplies Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Stock de Insumos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Insumo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supplies.map((supply) => (
                  <tr key={supply._id} className={`hover:bg-gray-50 ${isLowStock(supply) ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Package className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {supply.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {supply.unit}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                                             <div className="text-sm font-medium text-gray-900">
                         {formatQuantity(supply.quantity, supply.unit)}
                       </div>
                       {supply.minStock && (
                         <div className="text-sm text-gray-500">
                           Mín: {formatQuantity(supply.minStock, supply.unit)}
                         </div>
                       )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {supply.supplier?.businessName || '-'}
                      </div>
                      {supply.invoiceNumber && (
                        <div className="text-sm text-gray-500">
                          Factura: {supply.invoiceNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isLowStock(supply) ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Stock Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setSelectedSupply(supply)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            const quantity = prompt(`Ingrese cantidad a consumir en producción (${supply.unit}):`);
                            if (quantity && !isNaN(Number(quantity))) {
                              handleMovement(supply.name, 'produccion', Number(quantity));
                            }
                          }}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Consumo en producción"
                        >
                          <Activity className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            const quantity = prompt(`Ingrese cantidad de salida (${supply.unit}):`);
                            if (quantity && !isNaN(Number(quantity))) {
                              handleMovement(supply.name, 'salida', Number(quantity));
                            }
                          }}
                          className="text-orange-600 hover:text-orange-900 p-1"
                          title="Salida manual"
                        >
                          <TrendingDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Recent Movements */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Movimientos Recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Insumo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referencia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((movement) => (
                  <tr key={movement._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {movement.supplyName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getMovementColor(movement.type)}`}>
                        {getMovementIcon(movement.type)}
                        <span className="ml-1">{getMovementText(movement.type)}</span>
                      </span>
                    </td>
                                         <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm text-gray-900">
                         {formatQuantity(movement.quantity, movement.unit)}
                       </div>
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(movement.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {movement.reference || '-'}
                      </div>
                      {movement.notes && (
                        <div className="text-sm text-gray-500">
                          {movement.notes}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Supply Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Agregar Insumo
                  </h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Insumo *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ej: BENTONITA"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unidad
                      </label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="kg">kg</option>
                        <option value="litros">litros</option>
                        <option value="unidades">unidades</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minStock}
                      onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows={3}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Agregar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Supply Details Modal */}
        {selectedSupply && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Detalles del Insumo
                  </h2>
                  <button
                    onClick={() => setSelectedSupply(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nombre:</label>
                    <p className="text-sm text-gray-900">{selectedSupply.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cantidad:</label>
                    <p className="text-sm text-gray-900">{formatQuantity(selectedSupply.quantity, selectedSupply.unit)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Unidad:</label>
                    <p className="text-sm text-gray-900">{selectedSupply.unit}</p>
                  </div>
                  {selectedSupply.minStock && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Stock Mínimo:</label>
                      <p className="text-sm text-gray-900">{formatQuantity(selectedSupply.minStock, selectedSupply.unit)}</p>
                    </div>
                  )}
                  {selectedSupply.supplier && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Proveedor:</label>
                      <p className="text-sm text-gray-900">{selectedSupply.supplier.businessName}</p>
                    </div>
                  )}
                  {selectedSupply.invoiceNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Factura:</label>
                      <p className="text-sm text-gray-900">{selectedSupply.invoiceNumber}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado:</label>
                    {isLowStock(selectedSupply) ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Stock Bajo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        OK
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setSelectedSupply(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <ToastContainer toasts={[]} removeToast={() => {}} />
      </main>
    </div>
  );
} 