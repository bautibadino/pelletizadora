import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Supplier } from '@/models/Supplier';
import { Invoice, Payment } from '@/models/Invoice';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current_month'; // 'current_month', 'all_time'
    
    // Calcular fechas para el filtro del mes corriente
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (period === 'current_month') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Primer día del mes
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Último día del mes
    }
    
    // Obtener todos los proveedores con sus facturas
    const suppliers = await Supplier.find({});
    
    const suppliersWithBalance = await Promise.all(
      suppliers.map(async (supplier) => {
        // Construir filtro de fechas para facturas
        const invoiceFilter: Record<string, unknown> = { supplierId: supplier._id };
        if (startDate && endDate) {
          invoiceFilter.date = { $gte: startDate, $lte: endDate };
        }
        
        // Obtener facturas del proveedor (filtradas por fecha si es necesario)
        const invoices = await Invoice.find(invoiceFilter);
        
        // Calcular totales
        const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
        const totalPaid = invoices.reduce((sum, invoice) => {
          const invoicePaid = invoice.payments.reduce((paymentSum: number, payment: Payment) => paymentSum + payment.amount, 0);
          return sum + invoicePaid;
        }, 0);
        const balance = totalInvoiced - totalPaid;
        
        // Contar facturas por estado
        const pendingInvoices = invoices.filter(invoice => invoice.status === 'pendiente').length;
        const partialInvoices = invoices.filter(invoice => invoice.status === 'parcial').length;
        const paidInvoices = invoices.filter(invoice => invoice.status === 'pagado').length;
        
        return {
          _id: supplier._id,
          businessName: supplier.businessName,
          contact: supplier.contact,
          cuit: supplier.cuit,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          totalInvoiced,
          totalPaid,
          balance,
          invoiceCount: invoices.length,
          pendingInvoices,
          partialInvoices,
          paidInvoices,
          hasDebt: balance > 0
        };
      })
    );
    
    // Calcular estadísticas generales
    const totalSuppliers = suppliersWithBalance.length;
    const suppliersWithDebt = suppliersWithBalance.filter(s => s.hasDebt).length;
    const totalDebt = suppliersWithBalance.reduce((sum, s) => sum + s.balance, 0);
    const totalInvoiced = suppliersWithBalance.reduce((sum, s) => sum + s.totalInvoiced, 0);
    const totalPaid = suppliersWithBalance.reduce((sum, s) => sum + s.totalPaid, 0);
    
    return NextResponse.json({
      suppliers: suppliersWithBalance,
      stats: {
        totalSuppliers,
        suppliersWithDebt,
        totalDebt,
        totalInvoiced,
        totalPaid,
        averageDebt: suppliersWithDebt > 0 ? totalDebt / suppliersWithDebt : 0,
        period,
        periodLabel: period === 'current_month' ? 'Mes Corriente' : 'Todo el Tiempo'
      }
    });
  } catch (error) {
    console.error('Get suppliers stats error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 