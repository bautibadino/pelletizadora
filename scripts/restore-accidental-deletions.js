import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0';

async function restoreAccidentalDeletions() {
  console.log('🔄 Restaurando ventas eliminadas por error...');
  
  try {
    // 1. Conectar a MongoDB
    console.log('\n📡 Conectando a MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Conexión a MongoDB exitosa');
    
    const db = client.db();
    const salesCollection = db.collection('sales');
    const stockCollection = db.collection('stocks');
    const stockMovementCollection = db.collection('stockmovements');
    
    // 2. Restaurar las ventas que eliminé por error
    const ventasARestaurar = [
      {
        _id: '688a712ae660d5c7199be7b1',
        client: '688a6e9de660d5c7199be77b',
        quantity: 3040,
        unitPrice: 220,
        presentation: 'Granel',
        totalAmount: 668800,
        status: 'pending',
        date: new Date('2025-07-30T16:23:22.000Z'),
        createdAt: new Date('2025-07-30T16:23:22.000Z'),
        updatedAt: new Date('2025-07-30T16:23:22.000Z')
      },
      {
        _id: '688a719009641a0cb1a36a98',
        client: '688a70bfe660d5c7199be780',
        quantity: 375,
        unitPrice: 220,
        presentation: 'Granel',
        totalAmount: 82500,
        status: 'pending',
        date: new Date('2025-07-30T16:25:04.000Z'),
        createdAt: new Date('2025-07-30T16:25:04.000Z'),
        updatedAt: new Date('2025-07-30T16:25:04.000Z')
      }
    ];
    
    console.log('\n📋 Ventas a restaurar:');
    ventasARestaurar.forEach((venta, index) => {
      console.log(`${index + 1}. ID: ${venta._id}`);
      console.log(`   Cliente: ${venta.client}`);
      console.log(`   Cantidad: ${venta.quantity}kg`);
      console.log(`   Precio unitario: $${venta.unitPrice}`);
      console.log(`   Valor: $${venta.totalAmount}`);
      console.log(`   Fecha: ${new Date(venta.date).toLocaleString()}`);
      console.log('');
    });
    
    // 3. Restaurar cada venta
    console.log('\n🔄 Restaurando ventas...');
    
    for (const venta of ventasARestaurar) {
      console.log(`\nRestaurando venta: ${venta._id}`);
      
      try {
        // Restaurar la venta
        await salesCollection.insertOne(venta);
        console.log(`  ✅ Venta restaurada`);
        
        // Consumir el stock correspondiente
        const stockUpdate = await stockCollection.updateOne(
          { presentation: venta.presentation },
          { $inc: { quantity: -venta.quantity } }
        );
        
        if (stockUpdate.modifiedCount > 0) {
          console.log(`  ✅ Stock consumido: -${venta.quantity}kg`);
        } else {
          console.log(`  ❌ Error al consumir stock`);
        }
        
        // Crear movimiento de stock para documentar la restauración
        const stockMovement = {
          presentation: venta.presentation,
          type: 'salida',
          quantity: venta.quantity,
          date: new Date(),
          reference: 'Restauración de venta eliminada por error',
          notes: `Restauración de venta ${venta._id} - Cliente: ${venta.client}`
        };
        
        await stockMovementCollection.insertOne(stockMovement);
        console.log(`  ✅ Movimiento de stock creado para documentar restauración`);
        
      } catch (error) {
        console.error(`  ❌ Error restaurando venta ${venta._id}:`, error);
      }
    }
    
    // 4. Verificar resultado final
    console.log('\n📊 Verificando resultado final...');
    const finalSales = await salesCollection.find({}).count();
    const finalStock = await stockCollection.findOne({ presentation: 'Granel' });
    
    console.log(`Ventas totales: ${finalSales}`);
    console.log(`Stock Granel actual: ${finalStock ? finalStock.quantity : 0}kg`);
    
    await client.close();
    console.log('\n✅ Restauración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
    process.exit(1);
  }
}

// Ejecutar el script
restoreAccidentalDeletions(); 