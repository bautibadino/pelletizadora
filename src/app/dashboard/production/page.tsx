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
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';
import { useToast, ToastContainer } from '@/components/Toast';
import { roundToTwoDecimals, formatCurrency } from '@/lib/utils';

interface Production {
  _id: string;
  lotNumber: string;
  pelletType: string;
  totalQuantity: number;
  efficiency: number;
  operator?: string;
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplyConsumption {
  _id: string;
  production: string;
  supplyName: string;
  quantity: number;
  unit: string;
  date: string;
  notes?: string;
}

interface PelletGeneration {
  _id: string;
  production: string;
  presentation: string;
  quantity: number;
  date: string;
  notes?: string;
}

interface AvailableSupply {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  supplier?: {
    _id: string;
    businessName: string;
  };
}

interface SupplyConsumptionInput {
  supplyName: string;
  quantity: number;
  unit: string;
}



export default function ProductionPage() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableSupplies, setAvailableSupplies] = useState<AvailableSupply[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    lotNumber: '',
    pelletType: '',
    totalQuantity: '',
    efficiency: '',
    operator: '',
    notes: '',
  });

  // Opciones predefinidas
  const pelletTypes = [
    'Pellet Alfalfa',
    'Pellet Madera',
    'Pellet Mixto',
    'Pellet Soja',
    'Pellet Girasol',
    'Pellet Trigo',
    'Pellet Cebada',
    'Pellet Avena',
    'Pellet Maíz',
    'Pellet Sorgo',
    'Otro'
  ];

  const efficiencyOptions = [
    { value: '95', label: '95% - Excelente' },
    { value: '90', label: '90% - Muy Buena' },
    { value: '85', label: '85% - Buena' },
    { value: '80', label: '80% - Regular' },
    { value: '75', label: '75% - Baja' },
    { value: '70', label: '70% - Muy Baja' }
  ];

  const [supplyConsumptions, setSupplyConsumptions] = useState<SupplyConsumptionInput[]>([]);

  useEffect(() => {
    loadProductions();
    loadAvailableSupplies();
    success('🚀 Página de producción cargada');
  }, [currentPage, searchTerm]);

  // Cargar próximo número de lote cuando se abre el formulario
  useEffect(() => {
    if (showAddForm) {
      loadNextLotNumber();
      success('📝 Formulario de nueva producción abierto');
    }
  }, [showAddForm]);

  const loadProductions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (searchTerm) {
        params.append('pelletType', searchTerm);
      }

      const response = await fetch(`/api/production?${params}`);
      if (!response.ok) {
        throw new Error(`Error al cargar producciones: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validar que la respuesta tenga la estructura esperada
      if (!data || !Array.isArray(data.productions) || !data.pagination) {
        console.error('Invalid response structure:', data);
        setProductions([]);
        setTotalPages(1);
        error('❌ Error en la estructura de datos de producciones');
        return;
      }
      
      setProductions(data.productions);
      setTotalPages(data.pagination.pages);
      
      if (data.productions.length === 0 && !loading) {
        success('ℹ️ No se encontraron producciones');
      } else if (data.productions.length > 0) {
        success(`📋 ${data.productions.length} producciones cargadas`);
      }
    } catch (err) {
      console.error('Error loading productions:', err);
      setProductions([]);
      setTotalPages(1);
      error('❌ Error al cargar producciones. Intente nuevamente');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSupplies = async () => {
    try {
      const response = await fetch('/api/supplies/available');
      if (!response.ok) {
        throw new Error(`Error al cargar insumos disponibles: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validar que la respuesta tenga la estructura esperada
      if (!data || !Array.isArray(data.supplies)) {
        console.error('Invalid response structure:', data);
        setAvailableSupplies([]);
        error('❌ Error en la estructura de datos de insumos');
        return;
      }
      
      setAvailableSupplies(data.supplies);
      
      if (data.supplies.length === 0) {
        error('⚠️ No hay insumos disponibles para producción. Cree facturas con insumos primero');
      } else {
        success(`📦 ${data.supplies.length} insumos disponibles cargados`);
      }
    } catch (err) {
      console.error('Error loading available supplies:', err);
      setAvailableSupplies([]);
      error('❌ Error al cargar insumos disponibles. Intente nuevamente');
    }
  };

  const loadNextLotNumber = async () => {
    try {
      const response = await fetch('/api/production/next-lot');
      if (!response.ok) {
        throw new Error('Error al generar número de lote');
      }
      
      const data = await response.json();
      setFormData(prev => ({ ...prev, lotNumber: data.nextLotNumber }));
      success(`📋 Lote ${data.nextLotNumber} generado automáticamente`);
    } catch (err) {
      console.error('Error loading next lot number:', err);
      error('❌ Error al generar número de lote. Intente nuevamente');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiples envíos
    if (isSubmitting) {
      error('❌ Ya se está procesando una producción. Espere por favor.');
      return;
    }
    
    console.log('handleSubmit called');
    console.log('formData:', formData);
    console.log('supplyConsumptions:', supplyConsumptions);
    
    // Validación de campos requeridos
    if (!formData.lotNumber || !formData.pelletType || !formData.totalQuantity || !formData.efficiency) {
      console.log('Validation failed: missing required fields');
      error('❌ Por favor complete todos los campos requeridos (marcados con *)');
      return;
    }

    // Validación de cantidad total
    if (Number(formData.totalQuantity) <= 0) {
      error('❌ La cantidad total debe ser mayor a 0');
      return;
    }

    // Validación de eficiencia
    const efficiencyValue = Number(formData.efficiency);
    if (isNaN(efficiencyValue) || efficiencyValue < 0 || efficiencyValue > 100) {
      error('❌ La eficiencia debe estar entre 0% y 100%');
      return;
    }

    // Validación de insumos
    if (supplyConsumptions.length === 0) {
      console.log('Validation failed: no supply consumptions');
      error('❌ Debe agregar al menos un insumo consumido');
      return;
    }

    // Validar que todos los insumos tengan datos completos
    for (let i = 0; i < supplyConsumptions.length; i++) {
      const consumption = supplyConsumptions[i];
      if (!consumption.supplyName) {
        error(`❌ Debe seleccionar un insumo en la fila ${i + 1}`);
        return;
      }
      if (!consumption.quantity || consumption.quantity <= 0) {
        error(`❌ Debe ingresar una cantidad válida para ${consumption.supplyName}`);
        return;
      }
    }

    // Validar stock disponible
    for (const consumption of supplyConsumptions) {
      const availableSupply = availableSupplies.find(s => s.name === consumption.supplyName);
      if (!availableSupply) {
        error(`❌ Insumo ${consumption.supplyName} no encontrado en el stock`);
        return;
      }
      if (consumption.quantity > availableSupply.quantity) {
        error(`❌ Stock insuficiente de ${consumption.supplyName}. Disponible: ${availableSupply.quantity} ${availableSupply.unit}, solicitado: ${consumption.quantity} ${consumption.unit}`);
        return;
      }
    }

    // Validar que no haya insumos duplicados
    const supplyNames = supplyConsumptions.map(c => c.supplyName);
    const uniqueSupplyNames = [...new Set(supplyNames)];
    if (supplyNames.length !== uniqueSupplyNames.length) {
      error('❌ No puede usar el mismo insumo más de una vez');
      return;
    }

    try {
      setIsSubmitting(true);
      success('🔄 Procesando producción...');
      
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lotNumber: formData.lotNumber,
          pelletType: formData.pelletType,
          totalQuantity: roundToTwoDecimals(Number(formData.totalQuantity)),
          efficiency: roundToTwoDecimals(Number(formData.efficiency) / 100), // Convertir porcentaje a decimal
          operator: formData.operator || undefined,
          notes: formData.notes || undefined,
          supplyConsumptions,
          presentations: [
            {
              presentation: 'Granel',
              quantity: roundToTwoDecimals(Number(formData.totalQuantity))
            }
          ]
        }),
      });

      if (response.ok) {
        const result = await response.json();
        success(`✅ Producción ${formData.lotNumber} registrada exitosamente`);
        
        // Mostrar resumen de la producción
        const totalConsumed = supplyConsumptions.reduce((sum, c) => sum + Number(c.quantity), 0);
        const totalGenerated = Number(formData.totalQuantity);
        
        setTimeout(() => {
          success(`📊 Resumen: ${totalConsumed} kg de insumos → ${totalGenerated} kg de pellets (Granel)`);
        }, 1000);
        
        resetForm();
        setShowAddForm(false);
        loadProductions();
        loadAvailableSupplies();
      } else {
        const errorData = await response.json();
        if (errorData.error.includes('Stock insuficiente')) {
          error(`❌ ${errorData.error}`);
        } else if (errorData.error.includes('requeridos')) {
          error(`❌ ${errorData.error}`);
        } else if (errorData.error.includes('ya existe')) {
          error(`❌ ${errorData.error}`);
          // Recargar el número de lote automáticamente
          loadNextLotNumber();
        } else {
          error(`❌ Error al registrar producción: ${errorData.error}`);
        }
      }
    } catch (err) {
      console.error('Error creating production:', err);
      error('❌ Error de conexión. Verifique su conexión a internet e intente nuevamente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      lotNumber: '',
      pelletType: '',
      totalQuantity: '',
      efficiency: '',
      operator: '',
      notes: '',
    });
    setSupplyConsumptions([]);
  };

  const addSupplyConsumption = () => {
    setSupplyConsumptions([...supplyConsumptions, { supplyName: '', quantity: 0, unit: 'kg' }]);
    success('➕ Fila de insumo agregada. Complete los datos');
  };

  const removeSupplyConsumption = (index: number) => {
    const removed = supplyConsumptions[index];
    setSupplyConsumptions(supplyConsumptions.filter((_, i) => i !== index));
    if (removed.supplyName) {
      success(`🗑️ Insumo ${removed.supplyName} removido de la producción`);
    } else {
      success('🗑️ Fila de insumo removida');
    }
  };

  const updateSupplyConsumption = (index: number, field: keyof SupplyConsumptionInput, value: string | number) => {
    const updated = [...supplyConsumptions];
    const oldValue = updated[index][field];
    updated[index] = { ...updated[index], [field]: value };
    setSupplyConsumptions(updated);
    
    // Mostrar toast informativo para cambios importantes
    if (field === 'supplyName' && value && value !== oldValue) {
      const supply = availableSupplies.find(s => s.name === value);
      if (supply) {
        success(`📦 Insumo seleccionado: ${value} (${supply.quantity} ${supply.unit} disponible)`);
      }
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const formatQuantity = (quantity: number, unit: string) => {
    return `${roundToTwoDecimals(quantity)} ${unit}`;
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
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por tipo de pellet..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value) {
                      success(`🔍 Buscando: ${e.target.value}`);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  loadProductions();
                  success('🔄 Actualizando lista de producciones...');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Productions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Producciones</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lote
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Pellet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eficiencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productions.map((production) => (
                  <tr key={production._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {production.lotNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {production.pelletType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatQuantity(production.totalQuantity, 'kg')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {roundToTwoDecimals(production.efficiency)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {production.operator || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(production.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedProduction(production);
                          success(`📋 Ver detalles de producción ${production.lotNumber}`);
                        }}
                        className="text-purple-600 hover:text-purple-900 p-1"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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
                onClick={() => {
                  setCurrentPage(Math.max(1, currentPage - 1));
                  success('⬅️ Página anterior');
                }}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => {
                  setCurrentPage(Math.min(totalPages, currentPage + 1));
                  success('➡️ Página siguiente');
                }}
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
                    onClick={() => {
                      setCurrentPage(Math.max(1, currentPage - 1));
                      success('⬅️ Página anterior');
                    }}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage(Math.min(totalPages, currentPage + 1));
                      success('➡️ Página siguiente');
                    }}
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

        {/* Add Production Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Nueva Producción
                  </h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                                     {/* Información básica */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Número de Lote *
                       </label>
                       <input
                         type="text"
                         value={formData.lotNumber}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-900"
                         readOnly
                       />
                       <p className="text-xs text-gray-500 mt-1">Generado automáticamente</p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Tipo de Pellet *
                       </label>
                       <select
                         value={formData.pelletType}
                         onChange={(e) => setFormData({...formData, pelletType: e.target.value})}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                         required
                       >
                         <option value="">Seleccionar tipo de pellet</option>
                         {pelletTypes.map((type) => (
                           <option key={type} value={type}>
                             {type}
                           </option>
                         ))}
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Cantidad Total (kg) *
                       </label>
                       <input
                         type="number"
                         step="0.01"
                         value={formData.totalQuantity}
                         onChange={(e) => {
                  const newValue = e.target.value;
                  setFormData({...formData, totalQuantity: newValue});
                }}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                         placeholder="0.00"
                         required
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Eficiencia *
                       </label>
                       <select
                         value={formData.efficiency}
                         onChange={(e) => setFormData({...formData, efficiency: e.target.value})}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                         required
                       >
                         <option value="">Seleccionar eficiencia</option>
                         {efficiencyOptions.map((option) => (
                           <option key={option.value} value={option.value}>
                             {option.label}
                           </option>
                         ))}
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Operador
                       </label>
                       <input
                         type="text"
                         value={formData.operator}
                         onChange={(e) => setFormData({...formData, operator: e.target.value})}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                         placeholder="Nombre del operador"
                       />
                     </div>
                   </div>

                  {/* Consumo de Insumos */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-medium text-gray-900">Consumo de Insumos</h3>
                      <button
                        type="button"
                        onClick={addSupplyConsumption}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Agregar Insumo
                      </button>
                    </div>
                    {supplyConsumptions.map((consumption, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Insumo *
                          </label>
                                                     <select
                             value={consumption.supplyName}
                             onChange={(e) => updateSupplyConsumption(index, 'supplyName', e.target.value)}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                             required
                           >
                            <option value="">Seleccionar insumo</option>
                            {availableSupplies.map((supply) => (
                              <option key={supply._id} value={supply.name}>
                                {supply.name} ({formatQuantity(supply.quantity, supply.unit)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad *
                          </label>
                                                     <input
                             type="number"
                             step="0.01"
                             value={consumption.quantity}
                             onChange={(e) => updateSupplyConsumption(index, 'quantity', Number(e.target.value))}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                             placeholder="0.00"
                             required
                           />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unidad
                          </label>
                                                     <input
                             type="text"
                             value={consumption.unit}
                             onChange={(e) => updateSupplyConsumption(index, 'unit', e.target.value)}
                             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                             placeholder="kg"
                             required
                           />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeSupplyConsumption(index)}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Presentación de Pellets - Granel */}
                  <div>
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="text-md font-medium text-blue-900 mb-2">📦 Presentación de Pellets</h3>
                      <p className="text-sm text-blue-700">
                        <strong>Granel:</strong> Todos los pellets producidos se registrarán automáticamente en presentación Granel. 
                        La cantidad total ingresada será la cantidad de pellets disponibles en stock.
                      </p>
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas
                    </label>
                                         <textarea
                       value={formData.notes}
                       onChange={(e) => setFormData({...formData, notes: e.target.value})}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                       rows={3}
                       placeholder="Notas adicionales..."
                     />
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        success('❌ Formulario cancelado');
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '🔄 Procesando...' : 'Registrar Producción'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Test button clicked');
                        console.log('formData:', formData);
                        console.log('supplyConsumptions:', supplyConsumptions);
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 ml-2 disabled:opacity-50"
                    >
                      Test
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Production Details Modal */}
        {selectedProduction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Detalles de Producción
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedProduction(null);
                      success('❌ Detalles cerrados');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Lote:</label>
                    <p className="text-sm text-gray-900">{selectedProduction.lotNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tipo de Pellet:</label>
                    <p className="text-sm text-gray-900">{selectedProduction.pelletType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cantidad Total:</label>
                    <p className="text-sm text-gray-900">{formatQuantity(selectedProduction.totalQuantity, 'kg')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Eficiencia:</label>
                    <p className="text-sm text-gray-900">{roundToTwoDecimals(selectedProduction.efficiency)}%</p>
                  </div>
                  {selectedProduction.operator && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Operador:</label>
                      <p className="text-sm text-gray-900">{selectedProduction.operator}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha:</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedProduction.date)}</p>
                  </div>
                  {selectedProduction.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Notas:</label>
                      <p className="text-sm text-gray-900">{selectedProduction.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => {
                      setSelectedProduction(null);
                      success('❌ Detalles cerrados');
                    }}
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