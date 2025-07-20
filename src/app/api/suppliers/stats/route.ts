import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Supplier } from '@/models/Supplier';
import { Invoice, Payment } from '@/models/Invoice';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Obtener todos los proveedores con sus facturas
    const suppliers = await Supplier.find({});
    
    const suppliersWithBalance = await Promise.all(
      suppliers.map(async (supplier) => {
        // Obtener todas las facturas del proveedor
        const invoices = await Invoice.find({ supplierId: supplier._id });
        
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
        averageDebt: suppliersWithDebt > 0 ? totalDebt / suppliersWithDebt : 0
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