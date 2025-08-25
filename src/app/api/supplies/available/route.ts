import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SupplyStock } from '@/models/Stock';
import { Supplier } from '@/models/Supplier';

// GET - Obtener insumos disponibles para producción
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const supplies = await SupplyStock.find({ quantity: { $gt: 0 } })
      .populate({ path: 'supplier', model: Supplier, select: 'businessName' })
      .sort({ name: 1 });
    
    return NextResponse.json({
      supplies: supplies || []
    });
  } catch (error) {
    console.error('Get available supplies error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 