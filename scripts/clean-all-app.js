const mongoose = require('mongoose');

// Configurar la conexión de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletizadora';

async function cleanAllData() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Lista de todas las colecciones a limpiar
    const collections = [
      'productions',
      'supplyconsumptions', 
      'pelletgenerations',
      'stocks',
      'stockmovements',
      'supplystocks',
      'supplymovements',
      'sales',
      'clients',
      'suppliers',
      'invoices',
      'payments',
      'checks',
      'users'
    ];

    console.log('🧹 Iniciando limpieza completa del sistema...\n');

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.collection(collectionName);
        const result = await collection.deleteMany({});
        console.log(`✅ ${collectionName}: ${result.deletedCount} documentos eliminados`);
      } catch (error) {
        console.log(`⚠️  ${collectionName}: No se pudo limpiar (posiblemente no existe)`);
      }
    }

    console.log('\n🎉 Limpieza completada exitosamente!');
    console.log('\n📋 El sistema está listo para testing manual.');
    console.log('💡 Puedes comenzar creando:');
    console.log('   1. Proveedores');
    console.log('   2. Clientes');
    console.log('   3. Facturas de proveedores (para tener insumos)');
    console.log('   4. Producción de pellets');
    console.log('   5. Ventas de pellets');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanAllData();
}

module.exports = { cleanAllData }; 