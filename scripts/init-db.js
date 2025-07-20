/* eslint-disable */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0';

// Modelos
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'user'], default: 'admin' },
}, { timestamps: true });

const stockSchema = new mongoose.Schema({
  presentation: { type: String, required: true, enum: ['Bolsa 25kg', 'Big Bag', 'Granel'] },
  quantity: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, required: true },
  cuit: { type: String, required: true, unique: true },
  contact: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  phone: { type: String },
}, { timestamps: true });

const supplierSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  contact: { type: String, required: true },
  cuit: { type: String, required: true, unique: true },
  email: { type: String },
  address: { type: String },
  phone: { type: String },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Stock = mongoose.model('Stock', stockSchema);
const Client = mongoose.model('Client', clientSchema);
const Supplier = mongoose.model('Supplier', supplierSchema);

async function initDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Limpiar datos existentes
    console.log('🧹 Limpiando datos existentes...');
    await User.deleteMany({});
    await Stock.deleteMany({});
    await Client.deleteMany({});
    await Supplier.deleteMany({});

    // Crear usuario administrador
    console.log('👤 Creando usuario administrador...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@pelletizadora.com',
      role: 'admin',
    });
    await adminUser.save();
    console.log('✅ Usuario administrador creado: admin / admin123');

    // Crear stock inicial
    console.log('📦 Creando stock inicial...');
    const stockItems = [
      { presentation: 'Bolsa 25kg', quantity: 100 },
      { presentation: 'Big Bag', quantity: 50 },
      { presentation: 'Granel', quantity: 1000 },
    ];

    for (const item of stockItems) {
      const stock = new Stock(item);
      await stock.save();
    }
    console.log('✅ Stock inicial creado');

    // Crear clientes de ejemplo
    console.log('👥 Creando clientes de ejemplo...');
    const clients = [
      {
        name: 'Juan Pérez',
        company: 'Distribuidora Pérez S.A.',
        cuit: '20-12345678-9',
        contact: 'Juan Pérez',
        email: 'juan@perez.com',
        address: 'Av. San Martín 123, Buenos Aires',
        phone: '011-1234-5678',
      },
      {
        name: 'María González',
        company: 'Comercial González',
        cuit: '20-87654321-0',
        contact: 'María González',
        email: 'maria@gonzalez.com',
        address: 'Calle Rivadavia 456, Córdoba',
        phone: '0351-9876-5432',
      },
      {
        name: 'Carlos Rodríguez',
        company: 'Rodríguez e Hijos',
        cuit: '20-11223344-5',
        contact: 'Carlos Rodríguez',
        email: 'carlos@rodriguez.com',
        address: 'Belgrano 789, Rosario',
        phone: '0341-5555-6666',
      },
    ];

    for (const client of clients) {
      const newClient = new Client(client);
      await newClient.save();
    }
    console.log('✅ Clientes de ejemplo creados');

    // Crear proveedores de ejemplo
    console.log('🚛 Creando proveedores de ejemplo...');
    const suppliers = [
      {
        businessName: 'Proveedora de Materias Primas S.A.',
        contact: 'Roberto López',
        cuit: '30-11111111-1',
        email: 'info@materiasprimas.com',
        address: 'Industrial 123, Buenos Aires',
        phone: '011-4444-5555',
      },
      {
        businessName: 'Transportes Rápidos',
        contact: 'Ana Martínez',
        cuit: '30-22222222-2',
        email: 'ana@transportesrapidos.com',
        address: 'Logística 456, Córdoba',
        phone: '0351-7777-8888',
      },
      {
        businessName: 'Bentonita del Sur',
        contact: 'Luis Fernández',
        cuit: '30-33333333-3',
        email: 'luis@bentonita.com',
        address: 'Minería 789, Neuquén',
        phone: '0299-9999-0000',
      },
    ];

    for (const supplier of suppliers) {
      const newSupplier = new Supplier(supplier);
      await newSupplier.save();
    }
    console.log('✅ Proveedores de ejemplo creados');

    console.log('\n🎉 Base de datos inicializada exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin123');
    console.log('\n🌐 Accede a: http://localhost:3000');

  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase }; 