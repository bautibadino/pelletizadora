import { MongoClient } from 'mongodb';

async function fixDuplicateLots() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletizadora';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB');

    const db = client.db();
    const productions = db.collection('productions');

    // Encontrar lotes duplicados
    const duplicates = await productions.aggregate([
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

    console.log(`📊 Encontrados ${duplicates.length} lotes duplicados:`);

    for (const duplicate of duplicates) {
      console.log(`\n🔍 Lote: ${duplicate._id}`);
      console.log(`   Cantidad de duplicados: ${duplicate.count}`);
      console.log(`   IDs: ${duplicate.docs.join(', ')}`);

      // Obtener todos los documentos duplicados ordenados por fecha de creación
      const duplicateDocs = await productions.find({ lotNumber: duplicate._id })
        .sort({ createdAt: 1 })
        .toArray();

      // Mantener el primer documento (más antiguo) y eliminar los demás
      const toKeep = duplicateDocs[0];
      const toDelete = duplicateDocs.slice(1);

      console.log(`   ✅ Manteniendo: ${toKeep._id} (creado: ${toKeep.createdAt})`);
      console.log(`   ❌ Eliminando ${toDelete.length} duplicados:`);

      for (const doc of toDelete) {
        console.log(`      - ${doc._id} (creado: ${doc.createdAt})`);
        await productions.deleteOne({ _id: doc._id });
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron lotes duplicados');
    } else {
      console.log(`\n✅ Proceso completado. Se eliminaron ${duplicates.reduce((sum, d) => sum + d.count - 1, 0)} duplicados`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar el script
fixDuplicateLots().catch(console.error); 