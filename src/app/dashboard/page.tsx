'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  Truck, 
  BarChart3, 
  LogOut,
  Plus,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Activity,
  CreditCard,
  ArrowRight,
  Settings,
  FileText
} from 'lucide-react';

interface User {
  username: string;
  role: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    stock: 0,
    clients: 0,
    sales: 0,
    suppliers: 0,
  });
  const router = useRouter();

  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    setUser(JSON.parse(userData));
    loadStats();
  }, [router]);

  const loadStats = async () => {
    try {
      const [stockRes, clientsRes, salesRes, suppliersRes] = await Promise.all([
        fetch('/api/stock'),
        fetch('/api/clients'),
        fetch('/api/sales'),
        fetch('/api/suppliers'),
      ]);

      const stockData = await stockRes.json();
      const clientsData = await clientsRes.json();
      const salesData = await salesRes.json();
      const suppliersData = await suppliersRes.json();

      setStats({
        stock: stockData.length || 0,
        clients: clientsData.pagination?.total || 0,
        sales: salesData.pagination?.total || 0,
        suppliers: suppliersData.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Sistema de Pelletizadora
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Bienvenido, {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Flujo de Trabajo Principal */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Flujo de Trabajo
          </h2>
          
          {/* Flujo Visual */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0 lg:space-x-8">
              
              {/* Paso 1: Proveedores */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <Truck className="h-10 w-10 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Proveedores</h3>
                <p className="text-sm text-gray-600 mb-4">Comprar materia prima</p>
                <button
                  onClick={() => router.push('/dashboard/suppliers')}
                  className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  Gestionar Proveedores
                </button>
              </div>

              {/* Flecha */}
              <div className="hidden lg:flex items-center">
                <ArrowRight className="h-8 w-8 text-gray-400" />
              </div>

              {/* Paso 2: Rollos */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Activity className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Rollos</h3>
                <p className="text-sm text-gray-600 mb-4">Materia prima disponible</p>
                <button
                  onClick={() => router.push('/dashboard/rolls')}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  Ver Rollos
                </button>
              </div>

              {/* Flecha */}
              <div className="hidden lg:flex items-center">
                <ArrowRight className="h-8 w-8 text-gray-400" />
              </div>

              {/* Paso 3: Producción */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Producción</h3>
                <p className="text-sm text-gray-600 mb-4">Convertir rollos en pellets</p>
                <button
                  onClick={() => router.push('/dashboard/production')}
                  className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors font-medium"
                >
                  Registrar Producción
                </button>
              </div>

              {/* Flecha */}
              <div className="hidden lg:flex items-center">
                <ArrowRight className="h-8 w-8 text-gray-400" />
              </div>

              {/* Paso 4: Stock */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Stock</h3>
                <p className="text-sm text-gray-600 mb-4">Pellets disponibles</p>
                <button
                  onClick={() => router.push('/dashboard/stock')}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Ver Stock
                </button>
              </div>

              {/* Flecha */}
              <div className="hidden lg:flex items-center">
                <ArrowRight className="h-8 w-8 text-gray-400" />
              </div>

              {/* Paso 5: Ventas */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Ventas</h3>
                <p className="text-sm text-gray-600 mb-4">Vender pellets</p>
                <button
                  onClick={() => router.push('/dashboard/sales')}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  Nueva Venta
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.stock}</div>
            <div className="text-sm text-gray-600">Stock</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.sales}</div>
            <div className="text-sm text-gray-600">Ventas</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.suppliers}</div>
            <div className="text-sm text-gray-600">Proveedores</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.clients}</div>
            <div className="text-sm text-gray-600">Clientes</div>
          </div>
        </div>

        {/* Botones Secundarios */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Administración
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/dashboard/clients')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-6 w-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Clientes</span>
              <span className="text-xs text-gray-500">Gestionar</span>
            </button>
            
            <button
              onClick={() => router.push('/dashboard/checks')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CreditCard className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Cheques</span>
              <span className="text-xs text-gray-500">Gestionar</span>
            </button>
            
            <button
              onClick={() => router.push('/dashboard/stock')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Package className="h-6 w-6 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Movimientos</span>
              <span className="text-xs text-gray-500">Stock</span>
            </button>
            
            <button
              onClick={() => router.push('/dashboard/rolls')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Activity className="h-6 w-6 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Movimientos</span>
              <span className="text-xs text-gray-500">Rollos</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 