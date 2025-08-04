import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bautistabadino9:0WSdPAR5lnDk9C3Z@cluster0.q5wdqwv.mongodb.net/pelletizadora?retryWrites=true&w=majority&appName=Cluster0';

async function checkDuplicateSales() {
  console.log('🔍 Verificando ventas duplicadas...');
  
  try {
    // 1. Conectar a MongoDB
    console.log('\n📡 Conectando a MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Conexión a MongoDB exitosa');
    
    const db = client.db();
    
    // 2. Obtener todas las ventas con información del cliente
    console.log('\n📊 Analizando ventas...');
    const salesCollection = db.collection('sales');
    const clientsCollection = db.collection('clients');
    
    const allSales = await salesCollection.find({}).sort({ createdAt: 1 }).toArray();
    console.log(`Total de ventas encontradas: ${allSales.length}`);
    
    // 3. Obtener información de clientes
    const clientIds = [...new Set(allSales.map(sale => sale.client))];
    const clients = await clientsCollection.find({ _id: { $in: clientIds } }).toArray();
    const clientMap = new Map(clients.map(client => [client._id.toString(), client]));
    
    // 4. Identificar ventas duplicadas
    const duplicateGroups = [];
    const processedIds = new Set();
    
    for (let i = 0; i < allSales.length; i++) {
      if (processedIds.has(allSales[i]._id.toString())) continue;
      
      const currentSale = allSales[i];
      const duplicates = [];
      
      // Buscar ventas similares en las siguientes 10 ventas
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
    
    // 5. Mostrar detalles de las duplicadas
    console.log('\n📋 Detalles de ventas duplicadas:');
    let totalQuantityToRevert = 0;
    
    duplicateGroups.forEach((group, index) => {
      const client = clientMap.get(group.original.client.toString());
      const clientName = client ? client.name : 'Cliente desconocido';
      
      console.log(`\nGrupo ${index + 1}:`);
      console.log(`  Original: ${clientName} - ${group.original.quantity}kg - $${group.original.unitPrice} - ${new Date(group.original.createdAt).toLocaleString()}`);
      
      group.duplicates.forEach((dup, dupIndex) => {
        const dupClient = clientMap.get(dup.client.toString());
        const dupClientName = dupClient ? dupClient.name : 'Cliente desconocido';
        
        console.log(`  Duplicada ${dupIndex + 1}: ${dupClientName} - ${dup.quantity}kg - $${dup.unitPrice} - ${new Date(dup.createdAt).toLocaleString()}`);
        totalQuantityToRevert += dup.quantity;
      });
    });
    
    // 6. Mostrar resumen
    console.log('\n📊 Resumen:');
    console.log(`Total de ventas duplicadas: ${duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0)}`);
    console.log(`Cantidad total a revertir: ${totalQuantityToRevert}kg`);
    console.log(`Valor total de ventas duplicadas: $${duplicateGroups.reduce((sum, group) => sum + group.duplicates.reduce((groupSum, dup) => groupSum + (dup.quantity * dup.unitPrice), 0), 0).toFixed(2)}`);
    
    // 7. Verificar stock actual
    const stockCollection = db.collection('stocks');
    const currentStock = await stockCollection.findOne({ presentation: 'Granel' });
    
    console.log(`\n📦 Stock actual Granel: ${currentStock ? currentStock.quantity : 0}kg`);
    console.log(`Stock después de reversión: ${(currentStock ? currentStock.quantity : 0) + totalQuantityToRevert}kg`);
    
    await client.close();
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

// Ejecutar el script
checkDuplicateSales(); 