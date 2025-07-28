# Scripts de Corrección de Producción

Este directorio contiene scripts para verificar y corregir problemas en los datos de producción.

## Problemas Identificados

1. **Lotes duplicados**: Se generaron múltiples producciones con el mismo número de lote
2. **Error 500 en supplies**: Problemas en la API de insumos
3. **Falta de validaciones**: Datos inválidos en la base de datos

## Scripts Disponibles

### 1. `verify-production-data.js`
**Propósito**: Verificar la integridad de los datos de producción sin hacer cambios.

**Ejecución**:
```bash
node scripts/verify-production-data.js
```

**Verificaciones realizadas**:
- Lotes duplicados
- Producciones sin consumos de insumos
- Producciones sin generación de pellets
- Eficiencias fuera de rango (0-1)
- Cantidades inválidas (≤ 0)

### 2. `fix-duplicate-lots.js`
**Propósito**: Eliminar lotes duplicados manteniendo el registro más antiguo.

**Ejecución**:
```bash
node scripts/fix-duplicate-lots.js
```

**Acciones**:
- Identifica lotes duplicados
- Mantiene el registro más antiguo
- Elimina los duplicados más recientes

### 3. `fix-production-issues.js`
**Propósito**: Script completo que corrige todos los problemas identificados.

**Ejecución**:
```bash
node scripts/fix-production-issues.js
```

**Correcciones realizadas**:
- Elimina lotes duplicados
- Corrige eficiencias fuera de rango
- Corrige cantidades inválidas
- Elimina datos huérfanos (consumos y generaciones sin producción)
- Realiza verificación final

## Orden de Ejecución Recomendado

1. **Primero**: Ejecutar `verify-production-data.js` para identificar problemas
2. **Segundo**: Ejecutar `fix-production-issues.js` para corregir todos los problemas
3. **Tercero**: Ejecutar `verify-production-data.js` nuevamente para confirmar las correcciones

## Variables de Entorno

Los scripts utilizan la variable de entorno `MONGODB_URI` para conectarse a la base de datos:

```bash
export MONGODB_URI="mongodb://localhost:27017/pelletizadora"
```

## Validaciones Implementadas

### Backend (API)
- ✅ Validación de lotes únicos
- ✅ Validación de cantidades positivas
- ✅ Validación de eficiencias en rango (0-1)
- ✅ Validación de stock disponible
- ✅ Validación de presentaciones
- ✅ Manejo mejorado de errores

### Frontend
- ✅ Prevención de múltiples envíos
- ✅ Validación de campos requeridos
- ✅ Validación de eficiencias (0-100%)
- ✅ Validación de insumos duplicados
- ✅ Validación de stock disponible
- ✅ Manejo mejorado de errores de API

### Base de Datos
- ✅ Índice único en `lotNumber` para prevenir duplicados
- ✅ Validaciones de esquema en Mongoose

## Notas Importantes

1. **Backup**: Siempre hacer backup de la base de datos antes de ejecutar scripts de corrección
2. **Producción**: Los scripts están diseñados para ser seguros, pero es recomendable probarlos en un entorno de desarrollo primero
3. **Logs**: Todos los scripts generan logs detallados de las acciones realizadas
4. **Rollback**: Los scripts no incluyen funcionalidad de rollback automático

## Problemas Resueltos

### Duplicación de Lotes
- ✅ Validación a nivel de API
- ✅ Validación a nivel de base de datos (índice único)
- ✅ Script de limpieza de duplicados existentes

### Error 500 en Supplies
- ✅ Mejora en manejo de errores de API
- ✅ Validación de parámetros de paginación
- ✅ Validación de estructura de respuesta
- ✅ Manejo de arrays vacíos

### Validaciones Generales
- ✅ Validación de datos de entrada
- ✅ Validación de rangos numéricos
- ✅ Validación de stock disponible
- ✅ Prevención de envíos múltiples
- ✅ Mensajes de error descriptivos 