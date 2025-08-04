import fs from 'fs';
import path from 'path';

// Archivos que contienen logs de debugging
const filesToClean = [
  'src/app/api/supplies/route.ts',
  'src/app/api/supplies/movements/route.ts'
];

function cleanDebugLogs() {
  console.log('🧹 Limpiando logs de debugging...');
  
  filesToClean.forEach(filePath => {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remover console.log de debugging
      content = content.replace(/console\.log\(['"`]GET \/api\/supplies.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`]GET \/api\/supplies\/movements.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Modelo.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Nombre del modelo.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Supplies encontrados.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Movements encontrados.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Supplies raw.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Movements raw.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Parámetros.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Filtros.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Total.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Stats calculadas.*?['"`].*?\);?\n?/g, '');
      content = content.replace(/console\.log\(['"`].*?Respuesta preparada.*?['"`].*?\);?\n?/g, '');
      
      // Limpiar líneas vacías múltiples
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Limpiado: ${filePath}`);
      
    } catch (error) {
      console.error(`❌ Error limpiando ${filePath}:`, error);
    }
  });
  
  console.log('✅ Limpieza completada');
}

cleanDebugLogs(); 