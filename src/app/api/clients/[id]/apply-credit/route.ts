import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { Sale } from '@/models/Sale';
import { Payment } from '@/models/Sale';

// POST - Aplicar saldo a favor a una venta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id: clientId } = await params;
    const { saleId, amount } = await request.json();

    if (!saleId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'ID de venta y monto válido son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el cliente existe y tiene saldo suficiente
    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    if (client.creditBalance < amount) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Disponible: ${client.creditBalance}, solicitado: ${amount}` },
        { status: 400 }
      );
    }

    // Verificar que la venta existe y pertenece al cliente
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      );
    }

    if (sale.client.toString() !== clientId) {
      return NextResponse.json(
        { error: 'La venta no pertenece a este cliente' },
        { status: 400 }
      );
    }

    // Verificar que la venta tiene saldo pendiente
    const existingPayments = await Payment.find({ sale: saleId });
    const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = sale.totalAmount - totalPaid;

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { error: 'La venta ya está completamente pagada' },
        { status: 400 }
      );
    }

    // Calcular el monto que realmente se puede aplicar
    const amountToApply = Math.min(amount, remainingAmount);

    // Crear el pago
    const payment = new Payment({
      sale: saleId,
      amount: amountToApply,
      method: 'saldo_a_favor',
      reference: 'Aplicación de saldo a favor',
      notes: `Saldo a favor aplicado: ${amountToApply.toFixed(2)}`,
      date: new Date(),
    });

    await payment.save();

    // Actualizar el saldo a favor del cliente
    await Client.findByIdAndUpdate(
      clientId,
      { $inc: { creditBalance: -amountToApply } }
    );

    // Actualizar el estado de la venta
    const newTotalPaid = totalPaid + amountToApply;
    let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
    
    if (newTotalPaid >= sale.totalAmount) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partial';
    }

    await Sale.findByIdAndUpdate(saleId, { status: newStatus });

    return NextResponse.json({
      message: 'Saldo a favor aplicado exitosamente',
      payment,
      amountApplied: amountToApply,
      remainingCredit: client.creditBalance - amountToApply,
    });
  } catch (error) {
    console.error('Apply credit error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 