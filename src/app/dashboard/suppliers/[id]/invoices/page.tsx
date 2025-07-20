'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, DollarSign, FileText, Calendar, User, ArrowLeft } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/Toast';

interface Supplier {
  _id: string;
  businessName: string;
  contact: string;
  cuit: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface InvoiceLine {
  description: string;
  type: 'rollo_alfalfa' | 'rollo_otro' | 'insumo' | 'servicio' | 'otro';
  quantity: number;
  unitPrice: number;
  total: number;
  weight?: number; // Peso por unidad en kg (solo para rollos)
}

interface Payment {
  amount: number;
  method: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  date: Date;
  reference?: string;
  description?: string;
  receivedFrom?: string;
}

interface Invoice {
  _id: string;
  supplierId: Supplier;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  concept: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pendiente' | 'pagado' | 'parcial';
  payments: Payment[];
  notes?: string;
}

interface PaymentData {
  amount: number;
  method: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  date: string;
  reference?: string;
  description?: string;
  receivedFrom?: string;
}

export default function SupplierInvoices({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toasts, removeToast, success, error } = useToast();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Formulario de factura simplificado
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isBlackMarket: false, // true = en negro (sin IVA), false = en blanco (con IVA)
    notes: ''
  });

  // Líneas de factura simplificadas
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      description: '',
      type: 'rollo_alfalfa',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      weight: 0
    }
  ]);

  // Formulario de pago
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: 0,
    method: 'efectivo',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    receivedFrom: ''
  });

  useEffect(() => {
    const loadData = async () => {
      const { id } = await params;
      await fetchSupplier(id);
      await fetchInvoices(id);
    };
    loadData();
  }, [params]);

  const fetchSupplier = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}`);
      if (response.ok) {
        const data = await response.json();
        setSupplier(data);
      }
    } catch (error) {
      console.error('Error fetching supplier:', error);
    }
  };

  const fetchInvoices = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/invoices?supplierId=${supplierId}`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index: number, field: keyof InvoiceLine, value: unknown) => {
    const newLines = [...lines];
    const line = newLines[index];
    
    switch (field) {
      case 'description':
        line.description = value as string;
        break;
      case 'type':
        line.type = value as 'rollo_alfalfa' | 'rollo_otro' | 'insumo' | 'servicio' | 'otro';
        break;
      case 'quantity':
        line.quantity = value as number;
        break;
      case 'unitPrice':
        line.unitPrice = value as number;
        break;
      case 'weight':
        line.weight = value as number;
        break;
    }
    
    // Calcular total de la línea
    if (field === 'quantity' || field === 'unitPrice') {
      line.total = line.quantity * line.unitPrice;
    }
    
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, {
      description: '',
      type: 'rollo_alfalfa',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      weight: 0
    }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + (line.total || 0), 0);
  };

  const calculateTax = () => {
    if (formData.isBlackMarket) return 0; // En negro, sin IVA
    // Si es en blanco, el precio ya incluye IVA, entonces calculamos cuánto es el IVA
    const totalWithTax = calculateSubtotal();
    const subtotalWithoutTax = totalWithTax / 1.21; // Precio sin IVA
    return totalWithTax - subtotalWithoutTax; // Diferencia = IVA
  };

  const calculateTotal = () => {
    return calculateSubtotal(); // El total es lo que pagamos, el IVA se deduce de ahí
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones más detalladas
    if (!formData.invoiceNumber) {
      error('El número de factura es requerido');
      return;
    }
    
    if (lines.some(line => !line.description)) {
      error('Todas las líneas deben tener una descripción');
      return;
    }
    
    if (lines.some(line => line.quantity <= 0)) {
      error('Todas las cantidades deben ser mayores a 0');
      return;
    }
    
    if (lines.some(line => line.unitPrice <= 0)) {
      error('Todos los precios unitarios deben ser mayores a 0');
      return;
    }
    
    const total = calculateTotal();
    if (total <= 0) {
      error('El total de la factura debe ser mayor a 0');
      return;
    }

    try {
      const { id } = await params;
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierId: id,
          invoiceNumber: formData.invoiceNumber,
          date: formData.date,
          dueDate: formData.dueDate,
          concept: 'Factura de proveedor',
          tax: calculateTax(),
          lines: lines.map(line => ({
            ...line,
            total: line.quantity * line.unitPrice
          })),
          notes: formData.notes
        }),
      });

      if (response.ok) {
        success('Factura creada exitosamente');
        setShowForm(false);
        setFormData({
          invoiceNumber: '',
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isBlackMarket: false,
          notes: ''
        });
        setLines([{
          description: '',
          type: 'rollo_alfalfa',
          quantity: 1,
          unitPrice: 0,
          total: 0,
          weight: 0
        }]);
        fetchInvoices(id);
      } else {
        const errorData = await response.json();
        if (errorData.details) {
          error(`Error de validación: ${errorData.details}`);
        } else {
          error(errorData.error || 'Error al crear la factura');
        }
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      error('Error al crear la factura');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      error('Por favor ingrese un monto válido');
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${selectedInvoice?._id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        success('Pago registrado exitosamente');
        setShowPaymentForm(null);
        setSelectedInvoice(null);
        setPaymentData({
          amount: 0,
          method: 'efectivo',
          date: new Date().toISOString().split('T')[0],
          reference: '',
          description: '',
          receivedFrom: ''
        });
        const { id } = await params;
        fetchInvoices(id);
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al registrar el pago');
      }
    } catch (err) {
      console.error('Error adding payment:', err);
      error('Error al registrar el pago');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'parcial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'transferencia': return 'Transferencia';
      case 'cheque': return 'Cheque';
      default: return 'Otro';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Facturas de {supplier?.businessName}
              </h1>
              <p className="text-gray-600 mt-1">
                {supplier?.contact} • CUIT: {supplier?.cuit}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura
            </button>
          </div>
        </div>

        {/* Lista de Facturas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Facturas ({invoices.length})
            </h2>
            
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay facturas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Factura #{invoice.invoiceNumber}
                        </h3>
                        <p className="text-sm text-gray-600">Factura #{invoice.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status.toUpperCase()}
                        </span>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          ${invoice.total.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(invoice.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Vto: {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        {invoice.lines.length} líneas
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        {invoice.payments.length} pagos
                      </div>
                    </div>

                    {/* Líneas de la factura */}
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-2">Productos/Servicios:</h4>
                      <div className="space-y-1">
                        {invoice.lines.map((line, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{line.description} ({line.type})</span>
                            <span>${line.total.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pagos */}
                    {invoice.payments.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-900 mb-2">Pagos:</h4>
                        <div className="space-y-1">
                          {invoice.payments.map((payment, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>
                                {getMethodLabel(payment.method)}
                                {payment.reference && ` - ${payment.reference}`}
                                {payment.receivedFrom && ` (${payment.receivedFrom})`}
                              </span>
                              <span>${payment.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowPaymentForm(invoice._id);
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Agregar Pago
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal de Nueva Factura - SIMPLIFICADO */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Nueva Factura</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Información básica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Factura *
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Vencimiento *
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Tipo de factura */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isBlackMarket}
                        onChange={(e) => setFormData({...formData, isBlackMarket: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Factura en negro (sin IVA)
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Marque esta casilla si la factura es en negro. Si no la marca, se aplicará 21% de IVA automáticamente.
                    </p>
                  </div>

                  {/* Líneas de productos - SIMPLIFICADO */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Productos/Servicios</h3>
                      <button
                        type="button"
                        onClick={addLine}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Agregar Línea
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {lines.map((line, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción *
                              </label>
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo *
                              </label>
                              <select
                                value={line.type}
                                onChange={(e) => handleLineChange(index, 'type', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              >
                                <option value="rollo_alfalfa">Rollo de Alfalfa</option>
                                <option value="rollo_otro">Rollo Otro</option>
                                <option value="insumo">Insumo</option>
                                <option value="servicio">Servicio</option>
                                <option value="otro">Otro</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cantidad *
                              </label>
                              <input
                                type="number"
                                value={line.quantity}
                                onChange={(e) => handleLineChange(index, 'quantity', Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio Unitario *
                              </label>
                              <input
                                type="number"
                                value={line.unitPrice}
                                onChange={(e) => handleLineChange(index, 'unitPrice', Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Total
                              </label>
                              <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 font-medium">
                                ${line.total.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          {/* Peso solo para rollos */}
                          {(line.type === 'rollo_alfalfa' || line.type === 'rollo_otro') && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso por unidad (kg)
                              </label>
                              <input
                                type="number"
                                value={line.weight || ''}
                                onChange={(e) => handleLineChange(index, 'weight', Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.01"
                                placeholder="Peso en kg por rollo"
                              />
                            </div>
                          )}
                          
                          {lines.length > 1 && (
                            <div className="flex justify-end mt-4">
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Eliminar línea
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totales */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {formData.isBlackMarket ? 'Total (sin IVA)' : 'Total (IVA incluido)'}
                        </label>
                        <div className="text-xl font-bold text-blue-600">
                          ${calculateTotal().toLocaleString()}
                        </div>
                      </div>
                      {!formData.isBlackMarket && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            IVA incluido (21%)
                          </label>
                          <div className="text-lg font-bold text-gray-900">
                            ${calculateTax().toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {formData.isBlackMarket 
                        ? 'Factura en negro: el precio ingresado es el total final'
                        : 'Factura en blanco: el precio ingresado incluye IVA'
                      }
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Crear Factura
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pago */}
        {showPaymentForm && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Agregar Pago - Factura #{selectedInvoice.invoiceNumber}
                </h2>
                
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto *
                    </label>
                    <input
                      type="number"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Pago *
                    </label>
                    <select
                      value={paymentData.method}
                      onChange={(e) => setPaymentData({...paymentData, method: e.target.value as 'efectivo' | 'transferencia' | 'cheque' | 'otro'})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={paymentData.date}
                      onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referencia
                    </label>
                    <input
                      type="text"
                      value={paymentData.reference}
                      onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Número de transferencia, cheque, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={paymentData.description}
                      onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recibido de (para cheques de terceros)
                    </label>
                    <input
                      type="text"
                      value={paymentData.receivedFrom}
                      onChange={(e) => setPaymentData({...paymentData, receivedFrom: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre de quien entrega el cheque"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentForm(null);
                        setSelectedInvoice(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Registrar Pago
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </div>
  );
} 