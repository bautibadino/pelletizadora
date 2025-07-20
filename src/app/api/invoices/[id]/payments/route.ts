import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Invoice } from '@/models/Invoice';

// GET - Obtener pagos de una factura
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      payments: invoice.payments,
      totalPaid: invoice.payments.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0),
      pendingAmount: invoice.getPendingAmount()
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Agregar pago a una factura
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();
    const {
      amount,
      method,
      date,
      reference,
      description,
      receivedFrom
    } = body;
    
    // Validaciones
    if (!amount || !method || amount <= 0) {
      return NextResponse.json(
        { error: 'Monto y método de pago son requeridos' },
        { status: 400 }
      );
    }
    
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que el pago no exceda el monto pendiente
    const pendingAmount = invoice.getPendingAmount();
    if (amount > pendingAmount) {
      return NextResponse.json(
        { error: `El monto del pago excede el monto pendiente ($${pendingAmount})` },
        { status: 400 }
      );
    }
    
    // Crear el pago
    const payment = {
      amount,
      method,
      date: date ? new Date(date) : new Date(),
      reference,
      description,
      receivedFrom
    };
    
    // Agregar el pago a la factura
    await invoice.addPayment(payment);
    
    // Poblar datos del proveedor para la respuesta
    await invoice.populate('supplierId', 'businessName contact');
    
    return NextResponse.json({
      message: 'Pago registrado exitosamente',
      invoice,
      payment
    });
    
  } catch (error) {
    console.error('Add payment error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 