# Scripts de Mantenimiento - Pelletizadora

Este directorio contiene scripts para el mantenimiento y corrección de datos en la aplicación Pelletizadora.

## 📋 Scripts Disponibles

### 🔧 Scripts de Producción

#### `fix-production-issues.js`
**Propósito**: Script completo para corregir problemas de producción
- Elimina lotes duplicados
- Corrige eficiencias inválidas
- Corrige cantidades inválidas
- Elimina registros huérfanos
- Realiza verificación final

**Uso**: `node scripts/fix-production-issues.js`

#### `verify-production-data.js`
**Propósito**: Verifica la integridad de los datos de producción
- Busca lotes duplicados
- Verifica producciones sin consumos/generaciones
- Verifica eficiencias y cantidades inválidas
- Solo reporta, no hace cambios

**Uso**: `node scripts/verify-production-data.js`

#### `fix-duplicate-lots.js`
**Propósito**: Elimina lotes de producción duplicados
- Mantiene el lote más antiguo
- Elimina los duplicados más recientes

**Uso**: `node scripts/fix-duplicate-lots.js`

### 🛒 Scripts de Ventas

#### `check-duplicate-sales.js`
**Propósito**: Verifica ventas duplicadas sin hacer cambios
- Identifica ventas con mismo cliente, cantidad y precio en tiempo cercano
- Muestra detalles de las duplicadas
- Calcula cantidad y valor total a revertir
- Solo reporta, no hace cambios

**Uso**: `node scripts/check-duplicate-sales.js`

#### `fix-duplicate-sales.js`
**Propósito**: Elimina ventas duplicadas y revierte consumo de stock
- Identifica ventas duplicadas
- Revierte el consumo de stock
- Crea movimientos de stock para documentar la reversión
- Elimina las ventas duplicadas

**Uso**: `node scripts/fix-duplicate-sales.js`

### 🔍 Scripts de Diagnóstico

#### `test-supplies-api.js`
**Propósito**: Prueba la API de supplies y verifica la base de datos
- Prueba conexión a MongoDB
- Verifica colecciones y datos
- Prueba consultas de supplies y movements
- Prueba agregaciones de estadísticas

**Uso**: `node scripts/test-supplies-api.js`

#### `clean-debug-logs.js`
**Propósito**: Limpia logs de debugging de los archivos de API
- Remueve console.log de debugging
- Limpia líneas vacías múltiples
- Mantiene el código limpio para producción

**Uso**: `node scripts/clean-debug-logs.js`

## 🚀 Orden Recomendado de Ejecución

### Para Problemas de Producción:
1. `verify-production-data.js` - Verificar problemas
2. `fix-production-issues.js` - Corregir problemas

### Para Problemas de Ventas:
1. `check-duplicate-sales.js` - Verificar ventas duplicadas
2. `fix-duplicate-sales.js` - Corregir ventas duplicadas

### Para Problemas de API:
1. `test-supplies-api.js` - Diagnosticar problemas
2. `clean-debug-logs.js` - Limpiar logs (después de confirmar que todo funciona)

## ⚠️ Advertencias Importantes

- **Siempre hacer backup** antes de ejecutar scripts que modifican datos
- **Verificar en desarrollo** antes de ejecutar en producción
- **Revisar los logs** para confirmar que los cambios son correctos
- **Los scripts de corrección son irreversibles** - usar con precaución

## 📊 Validaciones Implementadas

### Frontend (Ventas):
- ✅ Estado `isSubmitting` para prevenir múltiples clicks
- ✅ Validaciones de cantidad y precio positivos
- ✅ Confirmación de usuario antes de procesar
- ✅ Toasts detallados con información de la venta
- ✅ Botón deshabilitado durante el procesamiento

### Backend (Producción):
- ✅ Validación de lotes únicos
- ✅ Validaciones de cantidad y eficiencia
- ✅ Validaciones de consumos de insumos
- ✅ Índice único en `lotNumber`

### Backend (Supplies):
- ✅ Validaciones de paginación
- ✅ Validaciones de datos de entrada
- ✅ Respuestas robustas con arrays por defecto
- ✅ Manejo de errores mejorado

## 🔧 Comandos Útiles

```bash
# Verificar ventas duplicadas
node scripts/check-duplicate-sales.js

# Corregir ventas duplicadas
node scripts/fix-duplicate-sales.js

# Verificar problemas de producción
node scripts/verify-production-data.js

# Corregir problemas de producción
node scripts/fix-production-issues.js

# Probar API de supplies
node scripts/test-supplies-api.js

# Limpiar logs de debugging
node scripts/clean-debug-logs.js
``` 