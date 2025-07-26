const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0');

// Esquemas simplificados para el script
const clientSchema = new mongoose.Schema({
  name: String,
  company: String,
  cuit: String,
  contact: String,
  email: String,
  address: String,
  phone: String,
  creditBalance: { type: Number, default: 0 },
}, { timestamps: true });

const stockSchema = new mongoose.Schema({
  presentation: String,
  quantity: Number,
}, { timestamps: true });

const saleSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  presentation: String,
  quantity: Number,
  unitPrice: Number,
  totalAmount: Number,
  lot: String,
  notes: String,
  status: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);
const Stock = mongoose.model('Stock', stockSchema);
const Sale = mongoose.model('Sale', saleSchema);

async function createTestSale() {
  try {
    console.log('🔍 Verificando datos disponibles...');
    
    // 1. Obtener clientes disponibles
    const clients = await Client.find().limit(5);
    console.log(`📋 Clientes disponibles: ${clients.length}`);
    
    if (clients.length === 0) {
      console.log('❌ No hay clientes disponibles. Creando cliente de prueba...');
      
      const testClient = new Client({
        name: 'Cliente de Prueba',
        company: 'Empresa de Prueba S.A.',
        cuit: '20-99999999-9',
        contact: 'Juan Prueba',
        email: 'prueba@test.com',
        address: 'Calle de Prueba 123',
        phone: '011-1234-5678',
      });
      
      await testClient.save();
      console.log('✅ Cliente de prueba creado');
      
      clients.push(testClient);
    }
    
    // Mostrar clientes disponibles
    clients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.name} - ${client.company}`);
    });
    
    // 2. Verificar stock disponible
    const stock = await Stock.find({ presentation: 'Granel' });
    console.log(`📦 Stock de Granel disponible: ${stock.length > 0 ? stock[0].quantity + ' kg' : '0 kg'}`);
    
    if (stock.length === 0 || stock[0].quantity < 100) {
      console.log('⚠️  Stock insuficiente. Agregando stock de prueba...');
      
      let stockItem = await Stock.findOne({ presentation: 'Granel' });
      if (!stockItem) {
        stockItem = new Stock({
          presentation: 'Granel',
          quantity: 1000, // 1000 kg de stock inicial
        });
      } else {
        stockItem.quantity = 1000;
      }
      
      await stockItem.save();
      console.log('✅ Stock de prueba agregado (1000 kg)');
    }
    
    // 3. Crear venta de testing
    const selectedClient = clients[0]; // Usar el primer cliente disponible
    const testSaleData = {
      clientId: selectedClient._id,
      presentation: 'Granel',
      quantity: 50, // 50 kg
      unitPrice: 1500, // $1500 por kg
      lot: 'LOTE-TEST-001',
      notes: 'Venta de prueba creada por script de testing'
    };
    
    console.log('\n🛒 Creando venta de prueba...');
    console.log(`   Cliente: ${selectedClient.name} (${selectedClient.company})`);
    console.log(`   Presentación: ${testSaleData.presentation}`);
    console.log(`   Cantidad: ${testSaleData.quantity} kg`);
    console.log(`   Precio unitario: $${testSaleData.unitPrice}/kg`);
    console.log(`   Total: $${testSaleData.quantity * testSaleData.unitPrice}`);
    console.log(`   Lote: ${testSaleData.lot}`);
    
    // Crear la venta directamente en la base de datos
    const totalAmount = testSaleData.quantity * testSaleData.unitPrice;
    
    const sale = new Sale({
      client: testSaleData.clientId,
      presentation: testSaleData.presentation,
      quantity: testSaleData.quantity,
      unitPrice: testSaleData.unitPrice,
      totalAmount: totalAmount,
      lot: testSaleData.lot,
      notes: testSaleData.notes,
      status: 'pending',
    });
    
    await sale.save();
    
    // Actualizar stock
    const stockItem = await Stock.findOne({ presentation: 'Granel' });
    stockItem.quantity -= testSaleData.quantity;
    await stockItem.save();
    
    console.log('\n✅ Venta de prueba creada exitosamente!');
    console.log(`   ID de venta: ${sale._id}`);
    console.log(`   Total: $${sale.totalAmount}`);
    console.log(`   Estado: ${sale.status}`);
    console.log(`   Stock restante: ${stockItem.quantity} kg`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar el script
createTestSale(); 