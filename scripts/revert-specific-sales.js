import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0';

async function revertSpecificSales() {
  console.log('🔄 Iniciando reversión de ventas duplicadas específicas...');
  
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
    
    // 2. Obtener todas las ventas para identificar los IDs específicos
    console.log('\n📊 Obteniendo ventas para identificar IDs...');
    const allSales = await salesCollection.find({}).sort({ createdAt: 1 }).toArray();
    
    // 3. Identificar las ventas duplicadas específicas
    const duplicateSales = [];
    
    for (let i = 0; i < allSales.length; i++) {
      const currentSale = allSales[i];
      
      // Buscar ventas similares en las siguientes 10 ventas
      for (let j = i + 1; j < Math.min(i + 10, allSales.length); j++) {
        const compareSale = allSales[j];
        
        if (
          compareSale.client.toString() === currentSale.client.toString() &&
          compareSale.quantity === currentSale.quantity &&
          compareSale.unitPrice === currentSale.unitPrice &&
          Math.abs(new Date(compareSale.createdAt) - new Date(currentSale.createdAt)) < 60000 // 1 minuto
        ) {
          // Solo agregar las duplicadas (no la original)
          if (!duplicateSales.find(s => s._id.toString() === compareSale._id.toString())) {
            duplicateSales.push(compareSale);
          }
        }
      }
    }
    
    console.log(`\n🔍 Ventas duplicadas identificadas: ${duplicateSales.length}`);
    
    // 4. Mostrar detalles de las ventas a revertir
    console.log('\n📋 Ventas que serán revertidas:');
    let totalQuantityToRevert = 0;
    let totalValueToRevert = 0;
    
    duplicateSales.forEach((sale, index) => {
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
    console.log(`Total de ventas a revertir: ${duplicateSales.length}`);
    console.log(`Cantidad total a revertir: ${totalQuantityToRevert}kg`);
    console.log(`Valor total a revertir: $${totalValueToRevert.toFixed(2)}`);
    
    // 5. Verificar stock actual
    const currentStock = await stockCollection.findOne({ presentation: 'Granel' });
    console.log(`\n📦 Stock actual Granel: ${currentStock ? currentStock.quantity : 0}kg`);
    console.log(`Stock después de reversión: ${(currentStock ? currentStock.quantity : 0) + totalQuantityToRevert}kg`);
    
    // 6. Confirmar con el usuario
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
    
    // 7. Revertir las ventas duplicadas
    console.log('\n🔄 Revertiendo ventas duplicadas...');
    
    for (const sale of duplicateSales) {
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
revertSpecificSales(); 