import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Sale } from '@/models/Sale';
import { Payment } from '@/models/Sale';

export async function GET() {
  try {
    await connectDB();
    
    // Estadísticas básicas
    const totalSales = await Sale.countDocuments();
    
    // Total facturado
    const totalAmountResult = await Sale.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;
    
    // Total pagado
    const paidAmountResult = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const paidAmount = paidAmountResult.length > 0 ? paidAmountResult[0].total : 0;
    
    // Monto pendiente
    const pendingAmount = totalAmount - paidAmount;
    
    // Promedio por venta
    const averageSale = totalSales > 0 ? totalAmount / totalSales : 0;
    
    // Top 5 clientes por ventas
    const topClients = await Sale.aggregate([
      {
        $group: {
          _id: '$client',
          totalSales: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { totalAmount: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      {
        $unwind: '$clientInfo'
      },
      {
        $project: {
          name: '$clientInfo.name',
          company: '$clientInfo.company',
          totalSales: 1,
          totalAmount: 1
        }
      }
    ]);
    
    // Ventas recientes (últimas 5)
    const recentSales = await Sale.find()
      .populate('client', 'name company')
      .sort({ date: -1 })
      .limit(5)
      .select('client totalAmount status date');
    
    return NextResponse.json({
      totalSales,
      totalAmount,
      pendingAmount,
      paidAmount,
      averageSale,
      topClients,
      recentSales,
    });
  } catch (error) {
    console.error('Get sales stats error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 