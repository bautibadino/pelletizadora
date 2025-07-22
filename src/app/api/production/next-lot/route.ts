import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Production } from '@/models/Production';

// GET - Obtener el próximo número de lote
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Buscar el último lote registrado
    const lastProduction = await Production.findOne()
      .sort({ lotNumber: -1 })
      .select('lotNumber');
    
    let nextLotNumber = '00001';
    
    if (lastProduction && lastProduction.lotNumber) {
      // Extraer el número del último lote (asumiendo formato LOTE-XXXXX)
      const lastNumber = parseInt(lastProduction.lotNumber.replace('LOTE-', ''));
      if (!isNaN(lastNumber)) {
        const nextNumber = lastNumber + 1;
        nextLotNumber = nextNumber.toString().padStart(5, '0');
      }
    }
    
    return NextResponse.json({
      nextLotNumber: `LOTE-${nextLotNumber}`
    });
  } catch (error) {
    console.error('Get next lot number error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 