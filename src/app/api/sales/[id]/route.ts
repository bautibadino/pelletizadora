import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Sale, Payment } from '@/models/Sale';

// GET - Obtener venta por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const sale = await Sale.findById(id)
      .populate('client', 'name company creditBalance');
    
    if (!sale) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      );
    }
    
    // Calcular el sobrante de esta venta
    const payments = await Payment.find({ sale: sale._id });
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const surplus = Math.max(0, totalPaid - sale.totalAmount);
    
    const saleWithSurplus = {
      ...sale.toObject(),
      surplus
    };
    
    return NextResponse.json(saleWithSurplus);
  } catch (error) {
    console.error('Get sale error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 