import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Sale, Payment } from '@/models/Sale';
import { Stock, StockMovement } from '@/models/Stock';
import Client from '@/models/Client';

// GET - Obtener todas las ventas
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    const filter: Record<string, unknown> = {};
    
    if (clientId) {
      filter.client = clientId;
    }
    
    if (status) {
      filter.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const sales = await Sale.find(filter)
      .populate('client', 'name company creditBalance')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    // Calcular el sobrante de cada venta
    const salesWithSurplus = await Promise.all(sales.map(async (sale) => {
      const payments = await Payment.find({ sale: sale._id });
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const surplus = Math.max(0, totalPaid - sale.totalAmount);
      
      return {
        ...sale.toObject(),
        surplus
      };
    }));
    
    const total = await Sale.countDocuments(filter);
    
    return NextResponse.json({
      sales: salesWithSurplus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva venta
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { 
      clientId, 
      presentation, 
      quantity, 
      unitPrice, 
      lot, 
      notes 
    } = await request.json();

    if (!clientId || !presentation || !quantity || !unitPrice) {
      return NextResponse.json(
        { error: 'Cliente, presentación, cantidad y precio unitario son requeridos' },
        { status: 400 }
      );
    }

    // Verificar stock disponible
    const stock = await Stock.findOne({ presentation });
    
    if (!stock || stock.quantity < quantity) {
      return NextResponse.json(
        { error: 'Stock insuficiente para esta venta' },
        { status: 400 }
      );
    }

    const totalAmount = quantity * unitPrice;

    // Crear la venta
    const sale = new Sale({
      client: clientId,
      presentation,
      quantity,
      unitPrice,
      totalAmount,
      lot,
      notes,
    });

    await sale.save();

    // Actualizar stock
    stock.quantity -= quantity;
    await stock.save();

    // Registrar movimiento de salida
    const movement = new StockMovement({
      presentation,
      type: 'salida',
      quantity,
      date: new Date(),
      reference: `Venta ${sale._id}`,
      notes: `Venta a cliente`,
    });
    
    await movement.save();

    // Poblar datos del cliente para la respuesta
    await sale.populate('client', 'name company');

    return NextResponse.json({
      message: 'Venta creada exitosamente',
      sale,
    });
  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 