import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Payment } from '@/models/Sale';
import { Sale } from '@/models/Sale';
import { Check } from '@/models/Check';
import mongoose from 'mongoose';

// Definir el modelo Client directamente aquí para evitar problemas de importación
const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
    trim: true,
  },
  cuit: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  contact: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  creditBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

const Client = mongoose.models.Client || mongoose.model('Client', clientSchema);

// GET - Obtener pagos
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const saleId = searchParams.get('saleId');
    
    if (!saleId) {
      return NextResponse.json(
        { error: 'ID de venta requerido' },
        { status: 400 }
      );
    }
    
    const payments = await Payment.find({ sale: saleId })
      .sort({ date: -1 });
    
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo pago
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    const { 
      saleId, 
      amount: rawAmount, 
      method, 
      reference, 
      notes,
      // Campos específicos para cheques
      checkNumber,
      isEcheq,
      receptionDate,
      dueDate,
      receivedFrom,
      issuedBy,
      bankName,
      accountNumber,
      checkAmount
    } = body;

    // Convertir amount a número
    const amount = Number(rawAmount);

    if (!saleId || !amount || !method) {
      return NextResponse.json(
        { error: 'ID de venta, monto y método son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la venta existe
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      );
    }

    // Si el método es saldo_a_favor, verificar que el cliente tenga suficiente saldo
    if (method === 'saldo_a_favor') {
      const client = await Client.findById(sale.client);
      if (!client) {
        return NextResponse.json(
          { error: 'Cliente no encontrado' },
          { status: 404 }
        );
      }
      
      if (client.creditBalance < amount) {
        return NextResponse.json(
          { error: 'Saldo a favor insuficiente' },
          { status: 400 }
        );
      }
    }

    // Verificar que el monto no exceda el total pendiente
    const existingPayments = await Payment.find({ sale: saleId });
    const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = Math.max(0, sale.totalAmount - totalPaid);

    // Calcular el monto que realmente se aplica a la venta y el sobrante
    const amountAppliedToSale = Math.min(amount, remainingAmount);
    const surplusAmount = amount - amountAppliedToSale;

    // Si hay sobrante, verificar que el cliente existe
    if (surplusAmount > 0) {
      const client = await Client.findById(sale.client);
      if (!client) {
        return NextResponse.json(
          { error: 'Cliente no encontrado' },
          { status: 404 }
        );
      }
    }

    // Crear el pago (solo el monto que se aplica a la venta)
    const payment = new Payment({
      sale: saleId,
      amount: amountAppliedToSale,
      method,
      reference,
      notes: surplusAmount > 0 ? `${notes || ''} (Sobrante: ${surplusAmount.toFixed(2)})` : notes,
      date: new Date(),
    });

    await payment.save();

    // Si el método es cheque, crear el registro del cheque
    if (method === 'cheque' && checkNumber && receivedFrom && issuedBy && dueDate) {
      try {
        const check = new Check({
          checkNumber,
          amount: Number(amount), // Usar el monto total del cheque
          isEcheq: isEcheq || false,
          receptionDate: receptionDate ? new Date(receptionDate) : new Date(),
          dueDate: new Date(dueDate),
          receivedFrom,
          issuedBy,
          bankName,
          accountNumber,
          notes: notes || `Pago de venta ${saleId}`,
          clientPaymentId: payment._id,
          status: 'pendiente'
        });

        await check.save();

        // Actualizar el pago con la referencia al cheque
        payment.checkId = check._id;
        await payment.save();
      } catch (checkError) {
        console.error('Error creating check:', checkError);
        // No fallar el pago si falla la creación del cheque
      }
    }

    // Actualizar el estado de la venta
    const newTotalPaid = totalPaid + amountAppliedToSale;
    let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
    
    // Si ya se pagó el total o más, marcar como pagada
    if (newTotalPaid >= sale.totalAmount) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partial';
    }

    await Sale.findByIdAndUpdate(saleId, { status: newStatus });

    // Si hay sobrante, actualizar el saldo a favor del cliente
    if (surplusAmount > 0) {
      await Client.findByIdAndUpdate(
        sale.client,
        { $inc: { creditBalance: surplusAmount } }
      );
    }

    // Si el método es saldo_a_favor, descontar del saldo del cliente
    if (method === 'saldo_a_favor') {
      await Client.findByIdAndUpdate(
        sale.client,
        { $inc: { creditBalance: -amountAppliedToSale } }
      );
    }

    return NextResponse.json({
      message: 'Pago registrado exitosamente',
      payment,
      surplusAmount,
      amountAppliedToSale,
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 