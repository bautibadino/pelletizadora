import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SupplierPayment, Invoice } from '@/models/Supplier';

// GET - Obtener pagos por factura
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'ID de factura es requerido' },
        { status: 400 }
      );
    }
    
    const payments = await SupplierPayment.find({ invoice: invoiceId })
      .sort({ date: -1 });
    
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Get supplier payments error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Registrar nuevo pago a proveedor
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { 
      invoiceId, 
      amount, 
      method, 
      reference, 
      notes 
    } = await request.json();

    if (!invoiceId || !amount || !method) {
      return NextResponse.json(
        { error: 'Factura, monto y método de pago son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la factura existe
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Crear el pago
    const payment = new SupplierPayment({
      invoice: invoiceId,
      amount,
      method,
      reference,
      notes,
    });

    await payment.save();

    // Calcular total pagado para esta factura
    const totalPaid = await SupplierPayment.aggregate([
      { $match: { invoice: invoice._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const paidAmount = totalPaid.length > 0 ? totalPaid[0].total : 0;

    // Actualizar estado de la factura
    if (paidAmount >= invoice.amount) {
      invoice.status = 'paid';
    } else if (paidAmount > 0) {
      invoice.status = 'partial';
    }

    await invoice.save();

    return NextResponse.json({
      message: 'Pago registrado exitosamente',
      payment,
      invoiceStatus: invoice.status,
    });
  } catch (error) {
    console.error('Create supplier payment error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 