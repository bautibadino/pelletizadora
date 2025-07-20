import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { Sale } from '@/models/Sale';

export async function GET() {
  try {
    await connectDB();
    
    // Estadísticas básicas
    const totalClients = await Client.countDocuments();
    
    // Clientes con email
    const clientsWithEmail = await Client.countDocuments({ email: { $exists: true, $ne: '' } });
    
    // Clientes con teléfono
    const clientsWithPhone = await Client.countDocuments({ phone: { $exists: true, $ne: '' } });
    
    // Clientes recientes (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentClients = await Client.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Top 5 clientes por ventas (si hay ventas)
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
    
    return NextResponse.json({
      totalClients,
      clientsWithEmail,
      clientsWithPhone,
      recentClients,
      topClients,
      emailPercentage: totalClients > 0 ? Math.round((clientsWithEmail / totalClients) * 100) : 0,
      phonePercentage: totalClients > 0 ? Math.round((clientsWithPhone / totalClients) * 100) : 0,
    });
  } catch (error) {
    console.error('Get client stats error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 