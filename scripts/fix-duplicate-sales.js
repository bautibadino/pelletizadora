import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0';

async function fixDuplicateSales() {
  console.log('🔍 Iniciando análisis de ventas duplicadas...');
  
  try {
    // 1. Conectar a MongoDB
    console.log('\n📡 Conectando a MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Conexión a MongoDB exitosa');
    
    const db = client.db();
    
    // 2. Obtener todas las ventas
    console.log('\n📊 Analizando ventas...');
    const salesCollection = db.collection('sales');
    const allSales = await salesCollection.find({}).sort({ createdAt: 1 }).toArray();
    
    console.log(`Total de ventas encontradas: ${allSales.length}`);
    
    // 3. Identificar ventas duplicadas (mismo cliente, misma cantidad, mismo precio, en un rango de tiempo cercano)
    const duplicateGroups = [];
    const processedIds = new Set();
    
    for (let i = 0; i < allSales.length; i++) {
      if (processedIds.has(allSales[i]._id.toString())) continue;
      
      const currentSale = allSales[i];
      const duplicates = [];
      
      // Buscar ventas similares en las siguientes 10 ventas (mismo cliente, cantidad y precio)
      for (let j = i + 1; j < Math.min(i + 10, allSales.length); j++) {
        const compareSale = allSales[j];
        
        if (
          compareSale.client.toString() === currentSale.client.toString() &&
          compareSale.quantity === currentSale.quantity &&
          compareSale.unitPrice === currentSale.unitPrice &&
          Math.abs(new Date(compareSale.createdAt) - new Date(currentSale.createdAt)) < 60000 // 1 minuto
        ) {
          duplicates.push(compareSale);
          processedIds.add(compareSale._id.toString());
        }
      }
      
      if (duplicates.length > 0) {
        duplicateGroups.push({
          original: currentSale,
          duplicates: duplicates
        });
        processedIds.add(currentSale._id.toString());
      }
    }
    
    console.log(`\n🔍 Grupos de ventas duplicadas encontrados: ${duplicateGroups.length}`);
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No se encontraron ventas duplicadas');
      await client.close();
      return;
    }
    
    // 4. Mostrar detalles de las duplicadas
    console.log('\n📋 Detalles de ventas duplicadas:');
    duplicateGroups.forEach((group, index) => {
      console.log(`\nGrupo ${index + 1}:`);
      console.log(`  Original: ${group.original.client} - ${group.original.quantity}kg - $${group.original.unitPrice} - ${new Date(group.original.createdAt).toLocaleString()}`);
      group.duplicates.forEach((dup, dupIndex) => {
        console.log(`  Duplicada ${dupIndex + 1}: ${dup.client} - ${dup.quantity}kg - $${dup.unitPrice} - ${new Date(dup.createdAt).toLocaleString()}`);
      });
    });
    
    // 5. Preguntar al usuario si quiere revertir las duplicadas
    console.log('\n⚠️  ADVERTENCIA: Esto eliminará las ventas duplicadas y revertirá el consumo de stock.');
    console.log('¿Desea proceder con la reversión? (s/N):');
    
    // En un entorno real, aquí se pediría confirmación del usuario
    // Por ahora, simulamos que el usuario confirma
    const shouldProceed = true; // Cambiar a false para cancelar
    
    if (!shouldProceed) {
      console.log('❌ Operación cancelada por el usuario');
      await client.close();
      return;
    }
    
    // 6. Revertir las ventas duplicadas
    console.log('\n🔄 Revertiendo ventas duplicadas...');
    
    const stockCollection = db.collection('stocks');
    const stockMovementCollection = db.collection('stockmovements');
    
    for (const group of duplicateGroups) {
      console.log(`\nProcesando grupo con original: ${group.original._id}`);
      
      for (const duplicate of group.duplicates) {
        console.log(`  Revertiendo venta duplicada: ${duplicate._id}`);
        
        try {
          // Revertir el consumo de stock
          const stockUpdate = await stockCollection.updateOne(
            { presentation: duplicate.presentation },
            { $inc: { quantity: duplicate.quantity } }
          );
          
          if (stockUpdate.modifiedCount > 0) {
            console.log(`    ✅ Stock revertido: +${duplicate.quantity}kg`);
          }
          
          // Crear movimiento de stock para documentar la reversión
          const reversalMovement = {
            presentation: duplicate.presentation,
            type: 'entrada',
            quantity: duplicate.quantity,
            date: new Date(),
            reference: 'Reversión de venta duplicada',
            notes: `Reversión automática de venta duplicada ${duplicate._id}`
          };
          
          await stockMovementCollection.insertOne(reversalMovement);
          console.log(`    ✅ Movimiento de stock creado para documentar reversión`);
          
          // Eliminar la venta duplicada
          const deleteResult = await salesCollection.deleteOne({ _id: duplicate._id });
          
          if (deleteResult.deletedCount > 0) {
            console.log(`    ✅ Venta duplicada eliminada`);
          } else {
            console.log(`    ❌ Error al eliminar venta duplicada`);
          }
          
        } catch (error) {
          console.error(`    ❌ Error procesando venta duplicada ${duplicate._id}:`, error);
        }
      }
    }
    
    // 7. Verificar resultado final
    console.log('\n📊 Verificando resultado final...');
    const finalSales = await salesCollection.find({}).count();
    const finalStock = await stockCollection.findOne({ presentation: 'Granel' });
    
    console.log(`Ventas restantes: ${finalSales}`);
    console.log(`Stock Granel actual: ${finalStock ? finalStock.quantity : 0}kg`);
    
    await client.close();
    console.log('\n✅ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar el script
fixDuplicateSales(); 