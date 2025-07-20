'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, TrendingUp, TrendingDown, Package, Users } from 'lucide-react';

interface SalesStats {
  totalSales: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  averageSale: number;
  topClients: Array<{
    name: string;
    company: string;
    totalSales: number;
    totalAmount: number;
  }>;
  recentSales: Array<{
    _id: string;
    client: {
      name: string;
      company: string;
    };
    totalAmount: number;
    status: string;
    date: string;
  }>;
}

export default function SalesStats() {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/sales/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading sales stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Estadísticas de Ventas
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Total Ventas</p>
              <p className="text-2xl font-bold text-purple-900">{stats.totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Total Facturado</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Cobrado</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.paidAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Pendiente</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(stats.pendingAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {stats.topClients.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">
            Top Clientes por Ventas
          </h4>
          <div className="space-y-2">
            {stats.topClients.slice(0, 3).map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(client.totalAmount)}
                  </p>
                  <p className="text-xs text-gray-500">{client.totalSales} ventas</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.recentSales.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3">
            Ventas Recientes
          </h4>
          <div className="space-y-2">
            {stats.recentSales.slice(0, 3).map((sale) => (
              <div key={sale._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{sale.client.name}</p>
                    <p className="text-xs text-gray-500">{formatDate(sale.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(sale.totalAmount)}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    sale.status === 'paid' ? 'bg-green-100 text-green-800' :
                    sale.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {sale.status === 'paid' ? 'Pagada' : 
                     sale.status === 'partial' ? 'Parcial' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 