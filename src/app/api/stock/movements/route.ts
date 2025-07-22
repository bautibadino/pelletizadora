import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { StockMovement } from '@/models/Stock';
import { Sale } from '@/models/Sale';
import Client from '@/models/Client';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const presentation = searchParams.get('presentation');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    const filter: Record<string, string> = {};
    
    if (presentation) {
      filter.presentation = presentation;
    }
    
    if (type) {
      filter.type = type;
    }
    
    const skip = (page - 1) * limit;
    
    const movements = await StockMovement.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    // Enriquecer movimientos con información del cliente para ventas
    const enrichedMovements = await Promise.all(
      movements.map(async (movement) => {
        const movementObj = movement.toObject();
        
        // Si es una salida y la referencia contiene "Venta", buscar información del cliente
        if (movement.type === 'salida' && movement.reference && movement.reference.startsWith('Venta ')) {
          try {
            const saleId = movement.reference.replace('Venta ', '');
            const sale = await Sale.findById(saleId).populate('client', 'name company');
            
            if (sale && sale.client) {
              movementObj.clientName = sale.client.name;
              movementObj.clientCompany = sale.client.company;
            }
          } catch (error) {
            console.error('Error fetching sale info:', error);
          }
        }
        
        return movementObj;
      })
    );
    
    const total = await StockMovement.countDocuments(filter);
    
    return NextResponse.json({
      movements: enrichedMovements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get movements error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 