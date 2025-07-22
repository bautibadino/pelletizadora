import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { StockMovement } from '@/models/Stock';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const presentation = searchParams.get('presentation') || 'Granel';
    const days = parseInt(searchParams.get('days') || '30');
    
    // Calcular fechas
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Obtener movimientos del período
    const movements = await StockMovement.find({
      presentation,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    // Calcular métricas
    let totalIngresos = 0;
    let totalEgresos = 0;
    const cantidadMovimientos = movements.length;
    let cantidadIngresos = 0;
    let cantidadEgresos = 0;
    
    movements.forEach(movement => {
      if (movement.type === 'entrada') {
        totalIngresos += movement.quantity;
        cantidadIngresos++;
      } else {
        totalEgresos += movement.quantity;
        cantidadEgresos++;
      }
    });
    
    // Calcular velocidad de movimiento (kg por día)
    const diasTranscurridos = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const velocidadIngreso = totalIngresos / diasTranscurridos;
    const velocidadEgreso = totalEgresos / diasTranscurridos;
    const velocidadTotal = (totalIngresos + totalEgresos) / diasTranscurridos;
    
    // Calcular promedio por movimiento
    const promedioIngreso = cantidadIngresos > 0 ? totalIngresos / cantidadIngresos : 0;
    const promedioEgreso = cantidadEgresos > 0 ? totalEgresos / cantidadEgresos : 0;
    
    // Obtener stock actual
    const stockResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/stock`);
    const stockData = await stockResponse.json();
    const stockActual = stockData.find((item: { presentation: string; quantity: number }) => item.presentation === presentation)?.quantity || 0;
    
    // Calcular rotación de stock
    const rotacionStock = stockActual > 0 ? totalEgresos / stockActual : 0;
    
    // Obtener movimientos de los últimos 7 días para tendencia
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    
    const lastWeekMovements = await StockMovement.find({
      presentation,
      date: { $gte: lastWeekDate, $lte: endDate }
    });
    
    let tendencia = 'estable';
    if (lastWeekMovements.length > 0) {
      const lastWeekEgresos = lastWeekMovements
        .filter(m => m.type === 'salida')
        .reduce((sum, m) => sum + m.quantity, 0);
      
      const previousWeekEgresos = totalEgresos - lastWeekEgresos;
      
      if (lastWeekEgresos > previousWeekEgresos * 1.2) {
        tendencia = 'creciente';
      } else if (lastWeekEgresos < previousWeekEgresos * 0.8) {
        tendencia = 'decreciente';
      }
    }
    
    return NextResponse.json({
      stats: {
        periodo: {
          dias: days,
          desde: startDate.toISOString(),
          hasta: endDate.toISOString()
        },
        ingresos: {
          total: totalIngresos,
          cantidad: cantidadIngresos,
          velocidad: velocidadIngreso,
          promedio: promedioIngreso
        },
        egresos: {
          total: totalEgresos,
          cantidad: cantidadEgresos,
          velocidad: velocidadEgreso,
          promedio: promedioEgreso
        },
        general: {
          totalMovimientos: cantidadMovimientos,
          velocidadTotal: velocidadTotal,
          stockActual: stockActual,
          rotacionStock: rotacionStock,
          tendencia: tendencia
        }
      }
    });
  } catch (error) {
    console.error('Get stock stats error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 