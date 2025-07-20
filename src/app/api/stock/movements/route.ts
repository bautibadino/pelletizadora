import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { StockMovement } from '@/models/Stock';

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
    
    const total = await StockMovement.countDocuments(filter);
    
    return NextResponse.json({
      movements,
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