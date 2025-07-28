import { MongoClient } from 'mongodb';

async function verifyProductionData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pelletizadora';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB');

    const db = client.db();
    const productions = db.collection('productions');
    const supplyConsumptions = db.collection('supplyconsumptions');
    const pelletGenerations = db.collection('pelletgenerations');

    console.log('🔍 Verificando integridad de datos de producción...\n');

    // 1. Verificar lotes duplicados
    console.log('1️⃣ Verificando lotes duplicados...');
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

    if (duplicateLots.length > 0) {
      console.log(`❌ Encontrados ${duplicateLots.length} lotes duplicados:`);
      duplicateLots.forEach(lot => {
        console.log(`   - ${lot._id}: ${lot.count} duplicados`);
      });
    } else {
      console.log('✅ No se encontraron lotes duplicados');
    }

    // 2. Verificar producciones sin consumos de insumos
    console.log('\n2️⃣ Verificando producciones sin consumos de insumos...');
    const productionsWithoutConsumptions = await productions.aggregate([
      {
        $lookup: {
          from: 'supplyconsumptions',
          localField: '_id',
          foreignField: 'production',
          as: 'consumptions'
        }
      },
      {
        $match: {
          consumptions: { $size: 0 }
        }
      }
    ]).toArray();

    if (productionsWithoutConsumptions.length > 0) {
      console.log(`❌ Encontradas ${productionsWithoutConsumptions.length} producciones sin consumos:`);
      productionsWithoutConsumptions.forEach(prod => {
        console.log(`   - ${prod.lotNumber}: ${prod.pelletType}`);
      });
    } else {
      console.log('✅ Todas las producciones tienen consumos de insumos');
    }

    // 3. Verificar producciones sin generación de pellets
    console.log('\n3️⃣ Verificando producciones sin generación de pellets...');
    const productionsWithoutGenerations = await productions.aggregate([
      {
        $lookup: {
          from: 'pelletgenerations',
          localField: '_id',
          foreignField: 'production',
          as: 'generations'
        }
      },
      {
        $match: {
          generations: { $size: 0 }
        }
      }
    ]).toArray();

    if (productionsWithoutGenerations.length > 0) {
      console.log(`❌ Encontradas ${productionsWithoutGenerations.length} producciones sin generación de pellets:`);
      productionsWithoutGenerations.forEach(prod => {
        console.log(`   - ${prod.lotNumber}: ${prod.pelletType}`);
      });
    } else {
      console.log('✅ Todas las producciones tienen generación de pellets');
    }

    // 4. Verificar eficiencias fuera de rango
    console.log('\n4️⃣ Verificando eficiencias fuera de rango...');
    const invalidEfficiencies = await productions.find({
      $or: [
        { efficiency: { $lt: 0 } },
        { efficiency: { $gt: 1 } }
      ]
    }).toArray();

    if (invalidEfficiencies.length > 0) {
      console.log(`❌ Encontradas ${invalidEfficiencies.length} producciones con eficiencia inválida:`);
      invalidEfficiencies.forEach(prod => {
        console.log(`   - ${prod.lotNumber}: ${prod.efficiency} (debe estar entre 0 y 1)`);
      });
    } else {
      console.log('✅ Todas las eficiencias están en el rango correcto');
    }

    // 5. Verificar cantidades negativas o cero
    console.log('\n5️⃣ Verificando cantidades inválidas...');
    const invalidQuantities = await productions.find({
      $or: [
        { totalQuantity: { $lte: 0 } },
        { totalQuantity: { $exists: false } }
      ]
    }).toArray();

    if (invalidQuantities.length > 0) {
      console.log(`❌ Encontradas ${invalidQuantities.length} producciones con cantidad inválida:`);
      invalidQuantities.forEach(prod => {
        console.log(`   - ${prod.lotNumber}: ${prod.totalQuantity} kg`);
      });
    } else {
      console.log('✅ Todas las cantidades son válidas');
    }

    // 6. Resumen general
    console.log('\n📊 Resumen de verificación:');
    const totalProductions = await productions.countDocuments();
    console.log(`   - Total de producciones: ${totalProductions}`);
    console.log(`   - Lotes duplicados: ${duplicateLots.length}`);
    console.log(`   - Sin consumos: ${productionsWithoutConsumptions.length}`);
    console.log(`   - Sin generaciones: ${productionsWithoutGenerations.length}`);
    console.log(`   - Eficiencias inválidas: ${invalidEfficiencies.length}`);
    console.log(`   - Cantidades inválidas: ${invalidQuantities.length}`);

    const totalIssues = duplicateLots.length + productionsWithoutConsumptions.length + 
                       productionsWithoutGenerations.length + invalidEfficiencies.length + 
                       invalidQuantities.length;

    if (totalIssues === 0) {
      console.log('\n✅ Todos los datos de producción están correctos');
    } else {
      console.log(`\n⚠️ Se encontraron ${totalIssues} problemas que requieren atención`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar el script
verifyProductionData().catch(console.error); 