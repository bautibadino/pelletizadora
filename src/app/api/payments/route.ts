import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Payment } from '@/models/Sale';
import { Sale } from '@/models/Sale';
import { Check } from '@/models/Check';

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
    
    const { 
      saleId, 
      amount, 
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
    } = await request.json();

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

    // Verificar que el monto no exceda el total pendiente
    const existingPayments = await Payment.find({ sale: saleId });
    const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = sale.totalAmount - totalPaid;

    if (amount > remainingAmount) {
      return NextResponse.json(
        { error: `El monto excede el total pendiente (${remainingAmount})` },
        { status: 400 }
      );
    }

    // Crear el pago
    const payment = new Payment({
      sale: saleId,
      amount,
      method,
      reference,
      notes,
      date: new Date(),
    });

    await payment.save();

    // Si el método es cheque, crear el registro del cheque
    if (method === 'cheque' && checkNumber && receivedFrom && issuedBy && dueDate) {
      try {
        const check = new Check({
          checkNumber,
          amount: checkAmount ? Number(checkAmount) : Number(amount),
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
    const newTotalPaid = totalPaid + amount;
    let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
    
    if (newTotalPaid >= sale.totalAmount) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partial';
    }

    await Sale.findByIdAndUpdate(saleId, { status: newStatus });

    return NextResponse.json({
      message: 'Pago registrado exitosamente',
      payment,
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 