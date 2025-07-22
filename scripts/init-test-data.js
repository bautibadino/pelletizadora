const { MongoClient } = require('mongodb');

async function initTestData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletizadora';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db();

    console.log('🚀 Inicializando datos de prueba...\n');

    // 1. Crear proveedores de prueba
    const suppliersCollection = db.collection('suppliers');
    const suppliers = [
      {
        businessName: 'Proveedor Test 1',
        cuit: '20-12345678-9',
        address: 'Av. Test 123, CABA',
        phone: '011-1234-5678',
        email: 'test1@proveedor.com',
        contactPerson: 'Juan Pérez',
        notes: 'Proveedor de prueba para testing'
      },
      {
        businessName: 'Proveedor Test 2',
        cuit: '20-98765432-1',
        address: 'Calle Test 456, La Plata',
        phone: '0221-8765-4321',
        email: 'test2@proveedor.com',
        contactPerson: 'María García',
        notes: 'Segundo proveedor de prueba'
      }
    ];

    const suppliersResult = await suppliersCollection.insertMany(suppliers);
    console.log(`✅ Proveedores creados: ${suppliersResult.insertedCount}`);

    // 2. Crear clientes de prueba
    const clientsCollection = db.collection('clients');
    const clients = [
      {
        name: 'Cliente Test 1',
        company: 'Empresa Test 1 S.A.',
        cuit: '30-11111111-1',
        address: 'Av. Cliente 100, CABA',
        phone: '011-1111-1111',
        email: 'cliente1@test.com',
        notes: 'Cliente de prueba para testing'
      },
      {
        name: 'Cliente Test 2',
        company: 'Empresa Test 2 S.R.L.',
        cuit: '30-22222222-2',
        address: 'Calle Cliente 200, Rosario',
        phone: '0341-2222-2222',
        email: 'cliente2@test.com',
        notes: 'Segundo cliente de prueba'
      }
    ];

    const clientsResult = await clientsCollection.insertMany(clients);
    console.log(`✅ Clientes creados: ${clientsResult.insertedCount}`);

    // 3. Crear stock inicial de insumos
    const supplyStocksCollection = db.collection('supplystocks');
    const supplyStocks = [
      {
        name: 'BENTONITA',
        quantity: 1000,
        unit: 'kg',
        minStock: 100
      },
      {
        name: 'CARBONATO DE CALCIO',
        quantity: 2000,
        unit: 'kg',
        minStock: 200
      },
      {
        name: 'VITAMINAS',
        quantity: 500,
        unit: 'kg',
        minStock: 50
      }
    ];

    const supplyStocksResult = await supplyStocksCollection.insertMany(supplyStocks);
    console.log(`✅ Stock de insumos creado: ${supplyStocksResult.insertedCount} tipos`);

    // 4. Crear stock inicial de pellets (Granel)
    const stocksCollection = db.collection('stocks');
    const stocks = [
      {
        presentation: 'Granel',
        quantity: 0
      }
    ];

    const stocksResult = await stocksCollection.insertMany(stocks);
    console.log(`✅ Stock de pellets creado: ${stocksResult.insertedCount} presentaciones`);

    console.log('\n🎉 Datos de prueba inicializados exitosamente!');
    console.log('\n📋 Datos creados:');
    console.log('   • 2 Proveedores');
    console.log('   • 2 Clientes');
    console.log('   • 3 Tipos de insumos con stock inicial');
    console.log('   • Stock de pellets Granel (vacío)');
    console.log('\n💡 Ahora puedes:');
    console.log('   1. Crear facturas de proveedores');
    console.log('   2. Registrar producción de pellets');
    console.log('   3. Realizar ventas');
    console.log('   4. Probar todas las funcionalidades');

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initTestData();
}

module.exports = { initTestData }; 