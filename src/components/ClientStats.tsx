'use client';

import { useState, useEffect } from 'react';
import { Users, Mail, Phone, TrendingUp, Building } from 'lucide-react';

interface ClientStats {
  totalClients: number;
  clientsWithEmail: number;
  clientsWithPhone: number;
  recentClients: number;
  topClients: Array<{
    name: string;
    company: string;
    totalSales: number;
    totalAmount: number;
  }>;
  emailPercentage: number;
  phonePercentage: number;
}

export default function ClientStats() {
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/clients/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading client stats:', error);
    } finally {
      setLoading(false);
    }
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
        Estadísticas de Clientes
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Clientes</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <Mail className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Con Email</p>
              <p className="text-2xl font-bold text-green-900">{stats.clientsWithEmail}</p>
              <p className="text-xs text-green-600">{stats.emailPercentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <Phone className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Con Teléfono</p>
              <p className="text-2xl font-bold text-purple-900">{stats.clientsWithPhone}</p>
              <p className="text-xs text-purple-600">{stats.phonePercentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Nuevos (30 días)</p>
              <p className="text-2xl font-bold text-orange-900">{stats.recentClients}</p>
            </div>
          </div>
        </div>
      </div>

      {stats.topClients.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3">
            Top Clientes por Ventas
          </h4>
          <div className="space-y-2">
            {stats.topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    ${client.totalAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{client.totalSales} ventas</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 