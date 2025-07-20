import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Stock, StockMovement } from '@/models/Stock';

// GET - Obtener stock actual
export async function GET() {
  try {
    await connectDB();
    
    const stock = await Stock.find().sort({ presentation: 1 });
    
    return NextResponse.json(stock);
  } catch (error) {
    console.error('Get stock error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Agregar entrada de stock
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { presentation, quantity, notes } = await request.json();

    if (!presentation || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Presentación y cantidad válida son requeridas' },
        { status: 400 }
      );
    }

    // Crear o actualizar stock
    let stock = await Stock.findOne({ presentation });
    
    if (!stock) {
      stock = new Stock({ presentation, quantity: 0 });
    }
    
    stock.quantity += quantity;
    await stock.save();

    // Registrar movimiento
    const movement = new StockMovement({
      presentation,
      type: 'entrada',
      quantity,
      date: new Date(),
      notes,
      reference: 'Carga manual',
    });
    
    await movement.save();

    return NextResponse.json({
      message: 'Stock actualizado exitosamente',
      stock,
      movement,
    });
  } catch (error) {
    console.error('Add stock error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 