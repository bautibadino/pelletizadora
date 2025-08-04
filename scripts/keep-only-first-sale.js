import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0';

async function keepOnlyFirstSale() {
  console.log('🔄 Manteniendo solo la primera venta y eliminando todas las demás...');
  
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
    
    // 2. Obtener todas las ventas ordenadas por fecha de creación
    console.log('\n📊 Obteniendo todas las ventas...');
    const allSales = await salesCollection.find({}).sort({ createdAt: 1 }).toArray();
    
    console.log(`Total de ventas encontradas: ${allSales.length}`);
    
    if (allSales.length === 0) {
      console.log('❌ No hay ventas para procesar');
      await client.close();
      return;
    }
    
    // 3. Identificar la primera venta (la que vamos a mantener)
    const firstSale = allSales[0];
    const salesToDelete = allSales.slice(1); // Todas las demás ventas
    
    console.log('\n📋 Venta que se mantendrá:');
    console.log(`ID: ${firstSale._id}`);
    console.log(`Cliente: ${firstSale.client}`);
    console.log(`Cantidad: ${firstSale.quantity}kg`);
    console.log(`Precio unitario: $${firstSale.unitPrice}`);
    console.log(`Valor: $${(firstSale.quantity * firstSale.unitPrice).toFixed(2)}`);
    console.log(`Fecha: ${new Date(firstSale.createdAt).toLocaleString()}`);
    
    console.log(`\n📋 Ventas que serán eliminadas: ${salesToDelete.length}`);
    
    // 4. Mostrar detalles de las ventas a eliminar
    let totalQuantityToRevert = 0;
    let totalValueToRevert = 0;
    
    salesToDelete.forEach((sale, index) => {
      const quantity = sale.quantity;
      const value = quantity * sale.unitPrice;
      totalQuantityToRevert += quantity;
      totalValueToRevert += value;
      
      console.log(`${index + 1}. ID: ${sale._id}`);
      console.log(`   Cliente: ${sale.client}`);
      console.log(`   Cantidad: ${quantity}kg`);
      console.log(`   Precio unitario: $${sale.unitPrice}`);
      console.log(`   Valor: $${value.toFixed(2)}`);
      console.log(`   Fecha: ${new Date(sale.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    console.log(`\n📊 Resumen:`);
    console.log(`Ventas a eliminar: ${salesToDelete.length}`);
    console.log(`Cantidad total a revertir: ${totalQuantityToRevert}kg`);
    console.log(`Valor total a revertir: $${totalValueToRevert.toFixed(2)}`);
    
    // 5. Verificar stock actual
    const currentStock = await stockCollection.findOne({ presentation: 'Granel' });
    console.log(`\n📦 Stock actual Granel: ${currentStock ? currentStock.quantity : 0}kg`);
    console.log(`Stock después de reversión: ${(currentStock ? currentStock.quantity : 0) + totalQuantityToRevert}kg`);
    
    // 6. Confirmar con el usuario
    console.log('\n⚠️  ADVERTENCIA: Esto eliminará todas las ventas excepto la primera y revertirá el consumo de stock.');
    console.log('¿Desea proceder? (s/N):');
    
    // En un entorno real, aquí se pediría confirmación del usuario
    // Por ahora, simulamos que el usuario confirma
    const shouldProceed = true; // Cambiar a false para cancelar
    
    if (!shouldProceed) {
      console.log('❌ Operación cancelada por el usuario');
      await client.close();
      return;
    }
    
    // 7. Eliminar las ventas duplicadas
    console.log('\n🔄 Eliminando ventas duplicadas...');
    
    for (const sale of salesToDelete) {
      console.log(`\nProcesando venta: ${sale._id}`);
      
      try {
        // Revertir el consumo de stock
        const stockUpdate = await stockCollection.updateOne(
          { presentation: sale.presentation },
          { $inc: { quantity: sale.quantity } }
        );
        
        if (stockUpdate.modifiedCount > 0) {
          console.log(`  ✅ Stock revertido: +${sale.quantity}kg`);
        } else {
          console.log(`  ❌ Error al revertir stock`);
        }
        
        // Crear movimiento de stock para documentar la reversión
        const reversalMovement = {
          presentation: sale.presentation,
          type: 'entrada',
          quantity: sale.quantity,
          date: new Date(),
          reference: 'Reversión de venta duplicada',
          notes: `Reversión automática de venta duplicada ${sale._id} - Cliente: ${sale.client}`
        };
        
        await stockMovementCollection.insertOne(reversalMovement);
        console.log(`  ✅ Movimiento de stock creado para documentar reversión`);
        
        // Eliminar la venta duplicada
        const deleteResult = await salesCollection.deleteOne({ _id: sale._id });
        
        if (deleteResult.deletedCount > 0) {
          console.log(`  ✅ Venta duplicada eliminada`);
        } else {
          console.log(`  ❌ Error al eliminar venta duplicada`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error procesando venta ${sale._id}:`, error);
      }
    }
    
    // 8. Verificar resultado final
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
keepOnlyFirstSale(); 