import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Datos del usuario administrador
    const adminData = {
      username: 'admin',
      password: 'admin123',
      email: 'admin@pelletizadora.com',
      role: 'admin'
    };

    // Verificar si ya existe
    const existingUser = await User.findOne({
      $or: [{ username: adminData.username }, { email: adminData.email }]
    });

    if (existingUser) {
      return NextResponse.json({
        message: 'El usuario administrador ya existe',
        user: {
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role,
          id: existingUser._id
        }
      }, { status: 200 });
    }

    // Crear nuevo usuario
    const adminUser = new User(adminData);
    await adminUser.save();

    return NextResponse.json({
      message: 'Usuario administrador creado exitosamente',
      user: {
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        id: adminUser._id
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 