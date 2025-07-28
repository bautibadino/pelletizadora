import { MongoClient } from 'mongodb';

async function fixProductionIssues() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletizadora';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB');

    const db = client.db();
    const productions = db.collection('productions');
    const supplyConsumptions = db.collection('supplyconsumptions');
    const pelletGenerations = db.collection('pelletgenerations');

    console.log('🔧 Iniciando corrección de problemas de producción...\n');

    // 1. Eliminar lotes duplicados
    console.log('1️⃣ Eliminando lotes duplicados...');
    const duplicateLots = await productions.aggregate([
      {
        $group: {
          _id: '$lotNumber',
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    let deletedDuplicates = 0;
    for (const duplicate of duplicateLots) {
      console.log(`   🔍 Procesando lote: ${duplicate._id}`);
      
      // Obtener todos los documentos duplicados ordenados por fecha de creación
      const duplicateDocs = await productions.find({ lotNumber: duplicate._id })
        .sort({ createdAt: 1 })
        .toArray();

      // Mantener el primer documento (más antiguo) y eliminar los demás
      const toKeep = duplicateDocs[0];
      const toDelete = duplicateDocs.slice(1);

      console.log(`   ✅ Manteniendo: ${toKeep._id} (creado: ${toKeep.createdAt})`);
      
      for (const doc of toDelete) {
        console.log(`   ❌ Eliminando: ${doc._id} (creado: ${doc.createdAt})`);
        await productions.deleteOne({ _id: doc._id });
        deletedDuplicates++;
      }
    }

    if (duplicateLots.length === 0) {
      console.log('   ✅ No se encontraron lotes duplicados');
    } else {
      console.log(`   ✅ Se eliminaron ${deletedDuplicates} duplicados`);
    }

    // 2. Corregir eficiencias fuera de rango
    console.log('\n2️⃣ Corrigiendo eficiencias fuera de rango...');
    const invalidEfficiencies = await productions.find({
      $or: [
        { efficiency: { $lt: 0 } },
        { efficiency: { $gt: 1 } }
      ]
    }).toArray();

    let fixedEfficiencies = 0;
    for (const prod of invalidEfficiencies) {
      let newEfficiency = prod.efficiency;
      
      if (newEfficiency < 0) {
        newEfficiency = 0;
      } else if (newEfficiency > 1) {
        newEfficiency = 1;
      }

      console.log(`   🔧 Corrigiendo ${prod.lotNumber}: ${prod.efficiency} → ${newEfficiency}`);
      await productions.updateOne(
        { _id: prod._id },
        { $set: { efficiency: newEfficiency } }
      );
      fixedEfficiencies++;
    }

    if (invalidEfficiencies.length === 0) {
      console.log('   ✅ No se encontraron eficiencias fuera de rango');
    } else {
      console.log(`   ✅ Se corrigieron ${fixedEfficiencies} eficiencias`);
    }

    // 3. Corregir cantidades inválidas
    console.log('\n3️⃣ Corrigiendo cantidades inválidas...');
    const invalidQuantities = await productions.find({
      $or: [
        { totalQuantity: { $lte: 0 } },
        { totalQuantity: { $exists: false } }
      ]
    }).toArray();

    let fixedQuantities = 0;
    for (const prod of invalidQuantities) {
      const newQuantity = prod.totalQuantity <= 0 ? 0.01 : prod.totalQuantity;
      console.log(`   🔧 Corrigiendo ${prod.lotNumber}: ${prod.totalQuantity} → ${newQuantity}`);
      await productions.updateOne(
        { _id: prod._id },
        { $set: { totalQuantity: newQuantity } }
      );
      fixedQuantities++;
    }

    if (invalidQuantities.length === 0) {
      console.log('   ✅ No se encontraron cantidades inválidas');
    } else {
      console.log(`   ✅ Se corrigieron ${fixedQuantities} cantidades`);
    }

    // 4. Verificar integridad de datos relacionados
    console.log('\n4️⃣ Verificando integridad de datos relacionados...');
    
    // Eliminar consumos de insumos huérfanos
    const orphanConsumptions = await supplyConsumptions.aggregate([
      {
        $lookup: {
          from: 'productions',
          localField: 'production',
          foreignField: '_id',
          as: 'production'
        }
      },
      {
        $match: {
          production: { $size: 0 }
        }
      }
    ]).toArray();

    if (orphanConsumptions.length > 0) {
      console.log(`   🗑️ Eliminando ${orphanConsumptions.length} consumos de insumos huérfanos`);
      await supplyConsumptions.deleteMany({
        _id: { $in: orphanConsumptions.map(c => c._id) }
      });
    } else {
      console.log('   ✅ No se encontraron consumos de insumos huérfanos');
    }

    // Eliminar generaciones de pellets huérfanas
    const orphanGenerations = await pelletGenerations.aggregate([
      {
        $lookup: {
          from: 'productions',
          localField: 'production',
          foreignField: '_id',
          as: 'production'
        }
      },
      {
        $match: {
          production: { $size: 0 }
        }
      }
    ]).toArray();

    if (orphanGenerations.length > 0) {
      console.log(`   🗑️ Eliminando ${orphanGenerations.length} generaciones de pellets huérfanas`);
      await pelletGenerations.deleteMany({
        _id: { $in: orphanGenerations.map(g => g._id) }
      });
    } else {
      console.log('   ✅ No se encontraron generaciones de pellets huérfanas');
    }

    // 5. Resumen final
    console.log('\n📊 Resumen de correcciones:');
    console.log(`   - Lotes duplicados eliminados: ${deletedDuplicates}`);
    console.log(`   - Eficiencias corregidas: ${fixedEfficiencies}`);
    console.log(`   - Cantidades corregidas: ${fixedQuantities}`);
    console.log(`   - Consumos huérfanos eliminados: ${orphanConsumptions.length}`);
    console.log(`   - Generaciones huérfanas eliminadas: ${orphanGenerations.length}`);

    const totalFixes = deletedDuplicates + fixedEfficiencies + fixedQuantities + 
                      orphanConsumptions.length + orphanGenerations.length;

    if (totalFixes === 0) {
      console.log('\n✅ No se encontraron problemas que requieran corrección');
    } else {
      console.log(`\n✅ Se realizaron ${totalFixes} correcciones en total`);
    }

    // 6. Verificación final
    console.log('\n🔍 Realizando verificación final...');
    const finalDuplicates = await productions.aggregate([
      {
        $group: {
          _id: '$lotNumber',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    const finalInvalidEfficiencies = await productions.countDocuments({
      $or: [
        { efficiency: { $lt: 0 } },
        { efficiency: { $gt: 1 } }
      ]
    });

    const finalInvalidQuantities = await productions.countDocuments({
      $or: [
        { totalQuantity: { $lte: 0 } },
        { totalQuantity: { $exists: false } }
      ]
    });

    if (finalDuplicates.length === 0 && finalInvalidEfficiencies === 0 && finalInvalidQuantities === 0) {
      console.log('✅ Verificación final exitosa - Todos los problemas han sido corregidos');
    } else {
      console.log('⚠️ Algunos problemas persisten y requieren atención manual');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar el script
fixProductionIssues().catch(console.error); 