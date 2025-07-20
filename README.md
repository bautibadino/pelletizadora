# 🏭 Sistema de Gestión Pelletizadora - MVP

Sistema web completo para la gestión de una fábrica de pellets, incluyendo control de stock, ventas a clientes y cuentas con proveedores.

## 🚀 Características

### 📦 Módulo de Stock
- Registro de inventario por presentación (Bolsa 25kg, Big Bag, Granel)
- Trazabilidad de entradas y salidas
- Historial de movimientos
- Control automático de stock al realizar ventas

### 👥 Módulo de Clientes
- CRUD completo de clientes
- Gestión de información de contacto y CUIT
- Búsqueda y filtrado de clientes

### 💰 Módulo de Ventas
- Registro de ventas con múltiples presentaciones
- Control automático de stock
- Sistema de pagos (efectivo, transferencia, cheque, tarjeta)
- Cuenta corriente por cliente
- Historial de ventas y pagos

### 🚛 Módulo de Proveedores
- CRUD completo de proveedores
- Registro de facturas y gastos
- Sistema de pagos a proveedores
- Cuenta corriente por proveedor

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Base de Datos**: MongoDB con Mongoose
- **Autenticación**: JWT
- **Hosting**: Vercel (recomendado)

## 📋 Requisitos Previos

- Node.js 18+ 
- MongoDB (local o Atlas)
- npm o yarn

## 🔧 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd pelletizadora
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env.local
   ```
   
   Editar `.env.local` con tus configuraciones:
   ```env
   MONGODB_URI=mongodb://localhost:27017/pelletizadora
   JWT_SECRET=tu-clave-secreta-super-segura
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

5. **Crear usuario administrador**
   
   La primera vez que ejecutes la aplicación, necesitarás crear un usuario administrador. Puedes hacerlo mediante la API:
   
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin",
       "password": "tu-contraseña",
       "email": "admin@pelletizadora.com"
     }'
   ```

## 🏃‍♂️ Uso

1. **Acceder a la aplicación**: http://localhost:3000
2. **Iniciar sesión** con las credenciales creadas
3. **Navegar por los módulos** desde el dashboard principal

### 📊 Dashboard Principal
- Vista general de estadísticas
- Acceso rápido a todos los módulos
- Acciones rápidas para operaciones comunes

### 📦 Gestión de Stock
- Ver stock actual por presentación
- Agregar entradas de stock manualmente
- Consultar historial de movimientos
- Trazabilidad completa de inventario

### 👥 Gestión de Clientes
- Crear y editar clientes
- Buscar clientes por nombre, empresa o CUIT
- Ver información completa de contacto

### 💰 Gestión de Ventas
- Crear nuevas ventas seleccionando cliente y productos
- Control automático de stock disponible
- Registrar pagos parciales o completos
- Consultar cuenta corriente por cliente

### 🚛 Gestión de Proveedores
- Crear y editar proveedores
- Registrar facturas y gastos
- Gestionar pagos a proveedores
- Control de cuenta corriente

## 🚀 Despliegue en Producción

### Vercel (Recomendado)

1. **Conectar repositorio a Vercel**
2. **Configurar variables de entorno** en el dashboard de Vercel:
   - `MONGODB_URI`: URL de tu base de datos MongoDB
   - `JWT_SECRET`: Clave secreta para JWT
3. **Desplegar automáticamente**

### MongoDB Atlas

1. Crear cluster en MongoDB Atlas
2. Obtener string de conexión
3. Configurar en variables de entorno

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Autenticación
│   │   ├── stock/         # Gestión de stock
│   │   ├── clients/       # Gestión de clientes
│   │   ├── sales/         # Gestión de ventas
│   │   ├── payments/      # Pagos de ventas
│   │   ├── suppliers/     # Gestión de proveedores
│   │   ├── invoices/      # Facturas de proveedores
│   │   └── supplier-payments/ # Pagos a proveedores
│   ├── dashboard/         # Páginas del dashboard
│   └── page.tsx           # Página de login
├── lib/                   # Utilidades
│   └── mongodb.ts         # Configuración de MongoDB
├── models/                # Modelos de Mongoose
│   ├── User.ts           # Usuario
│   ├── Stock.ts          # Stock y movimientos
│   ├── Client.ts         # Clientes
│   ├── Sale.ts           # Ventas y pagos
│   └── Supplier.ts       # Proveedores, facturas y pagos
└── components/            # Componentes reutilizables
```

## 🔒 Seguridad

- Autenticación JWT
- Contraseñas hasheadas con bcrypt
- Validación de datos en frontend y backend
- Sanitización de inputs

## 📈 Escalabilidad Futura

El sistema está diseñado para escalar con futuros módulos:

- **Producción**: Registro por lote, rollos, kilos
- **Costeo automático**: Cálculo de costos
- **Control de empleados**: Gestión de personal
- **Control de calidad**: Análisis y certificaciones
- **Panel multiusuario**: Permisos y roles
- **App móvil**: Aplicación complementaria

## 🐛 Solución de Problemas

### Error de conexión a MongoDB
- Verificar que MongoDB esté ejecutándose
- Revisar la URL de conexión en `.env.local`
- Verificar credenciales si usas MongoDB Atlas

### Error de autenticación
- Verificar que el usuario existe en la base de datos
- Revisar que el JWT_SECRET esté configurado
- Limpiar localStorage si hay problemas de sesión

### Problemas de CORS
- Verificar configuración de Next.js
- Revisar headers en las API routes

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Crear un issue en el repositorio
- Contactar al equipo de desarrollo

---

**Desarrollado con ❤️ para la gestión eficiente de fábricas de pellets**
# pelletizadora
