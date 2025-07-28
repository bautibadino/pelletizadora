import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0';

async function testSuppliesAPI() {
  console.log('🔍 Iniciando prueba de la API de supplies...');
  
  try {
    // 1. Probar conexión a MongoDB
    console.log('\n📡 Probando conexión a MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Conexión a MongoDB exitosa');
    
    const db = client.db();
    
    // 2. Verificar colecciones
    console.log('\n📊 Verificando colecciones...');
    const collections = await db.listCollections().toArray();
    console.log('Colecciones disponibles:', collections.map(c => c.name));
    
    // 3. Verificar datos en SupplyStock
    console.log('\n📦 Verificando datos en SupplyStock...');
    const supplyStockCollection = db.collection('supplystocks');
    const supplyStockCount = await supplyStockCollection.countDocuments();
    console.log(`Total de registros en SupplyStock: ${supplyStockCount}`);
    
    if (supplyStockCount > 0) {
      const sampleSupply = await supplyStockCollection.findOne();
      console.log('Ejemplo de registro SupplyStock:', JSON.stringify(sampleSupply, null, 2));
    }
    
    // 4. Verificar datos en SupplyMovement
    console.log('\n🔄 Verificando datos en SupplyMovement...');
    const supplyMovementCollection = db.collection('supplymovements');
    const supplyMovementCount = await supplyMovementCollection.countDocuments();
    console.log(`Total de registros en SupplyMovement: ${supplyMovementCount}`);
    
    if (supplyMovementCount > 0) {
      const sampleMovement = await supplyMovementCollection.findOne();
      console.log('Ejemplo de registro SupplyMovement:', JSON.stringify(sampleMovement, null, 2));
    }
    
    // 5. Probar consulta de supplies con paginación
    console.log('\n🔍 Probando consulta de supplies con paginación...');
    const supplies = await supplyStockCollection
      .find({})
      .sort({ name: 1 })
      .skip(0)
      .limit(10)
      .toArray();
    
    console.log(`Supplies encontrados: ${supplies.length}`);
    console.log('Supplies:', supplies.map(s => ({ name: s.name, quantity: s.quantity, unit: s.unit })));
    
    // 6. Probar agregación de estadísticas
    console.log('\n📈 Probando agregación de estadísticas...');
    const stats = await supplyStockCollection.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          lowStock: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$minStock', 0] }, { $lte: ['$quantity', '$minStock'] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();
    
    console.log('Estadísticas calculadas:', stats);
    
    // 7. Probar consulta de movements
    console.log('\n🔄 Probando consulta de movements...');
    const movements = await supplyMovementCollection
      .find({})
      .sort({ date: -1 })
      .skip(0)
      .limit(10)
      .toArray();
    
    console.log(`Movements encontrados: ${movements.length}`);
    console.log('Movements:', movements.map(m => ({ 
      supplyName: m.supplyName, 
      type: m.type, 
      quantity: m.quantity,
      date: m.date 
    })));
    
    await client.close();
    console.log('\n✅ Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar la prueba
testSuppliesAPI(); 