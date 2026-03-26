# 🏥 Portal Médico - Backend

## 🎯 **Sistema Completo Funcionando**

Backend del Portal Médico conectado a **Neon PostgreSQL** con todas las funcionalidades operativas.

## 🚀 **Funcionalidades Principales**

### 🔐 **Autenticación**
- ✅ Login con DNI y contraseña
- ✅ Tokens JWT para sesiones
- ✅ Roles: ADMIN, DOCTOR, PATIENT
- ✅ Contraseñas hasheadas con bcrypt

### 👥 **Gestión de Usuarios**
- ✅ Crear usuarios (Admin)
- ✅ Listar usuarios con paginación
- ✅ Buscar por DNI o nombre
- ✅ Filtrar por rol

### 📊 **Estudios Médicos**
- ✅ Subir radiografías (base64)
- ✅ Asociar pacientes y doctores
- ✅ Guardar notas y tipo de estudio
- ✅ Filtrar por fecha, paciente, tipo

### 📄 **Informes Médicos**
- ✅ Crear informes para estudios
- ✅ Contenido médico completo
- ✅ Descargar PDFs
- ✅ Permisos por rol

## 🛠️ **Configuración**

### **Variables de Entorno (.env)**
```env
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
JWT_SECRET="portal-medico-secreto-2024"
PORT=3000
```

### **Instalación**
```bash
npm install
```

### **Iniciar Servidor**
```bash
node src/index.js
```

## 📁 **Estructura del Proyecto**

```
backend/
├── src/
│   ├── index.js              # Servidor principal
│   ├── lib/
│   │   └── prisma.js       # Configuración de Prisma
│   ├── middleware/
│   │   └── auth.js        # Middleware de autenticación
│   ├── routes/
│   │   ├── auth.js         # Rutas de autenticación
│   │   ├── users.js        # Rutas de usuarios
│   │   ├── studies.js      # Rutas de estudios
│   │   └── reports.js     # Rutas de informes
│   ├── scripts/
│   │   └── seed.js        # Datos iniciales
│   └── services/
│       └── whatsapp.js     # Notificaciones WhatsApp
├── prisma/
│   └── schema.prisma       # Esquema de base de datos
├── package.json
└── README.md
```

## 🎯 **Endpoints API**

### **Autenticación**
```
POST /api/auth/login
```

### **Usuarios**
```
GET    /api/users          # Listar usuarios
POST   /api/users          # Crear usuario
GET    /api/users/:id      # Obtener usuario
PUT    /api/users/:id      # Actualizar usuario
DELETE /api/users/:id      # Eliminar usuario
```

### **Estudios**
```
GET    /api/studies        # Listar estudios
POST   /api/studies        # Crear estudio
GET    /api/studies/:id    # Obtener estudio
```

### **Informes**
```
GET    /api/reports        # Listar informes
POST   /api/reports        # Crear informe
GET    /api/reports/:id    # Obtener informe
```

## 👤 **Usuarios Iniciales**

### **Administrador**
- **DNI**: 12345678
- **Password**: 12345678
- **Rol**: ADMIN
- **Permisos**: Acceso completo

### **Doctor**
- **DNI**: 87654321
- **Password**: 87654321
- **Rol**: DOCTOR
- **Permisos**: Estudios e informes propios

### **Paciente**
- **DNI**: 11223344
- **Password**: 11223344
- **Rol**: PATIENT
- **Permisos**: Solo sus datos

## 🗄️ **Base de Datos**

### **Modelos**
- **User**: Usuarios del sistema
- **Study**: Estudios médicos
- **Report**: Informes médicos

### **Relaciones**
- User → Study (patient/doctor)
- Study → Report (study/doctor)

## 🔧 **Configuración de Neon**

1. **Crear cuenta** en [neon.tech](https://neon.tech)
2. **Crear proyecto** PostgreSQL
3. **Copiar Connection String**
4. **Configurar .env** con la URL
5. **Ejecutar seed**: `node src/scripts/seed.js`

## 🚀 **Características Técnicas**

- **Node.js** con ES Modules
- **Express.js** para API REST
- **Prisma ORM** para base de datos
- **Neon PostgreSQL** como base de datos
- **JWT** para autenticación
- **Bcrypt** para contraseñas
- **CORS** para frontend
- **Payload limit** de 50MB para imágenes

## 📱 **Frontend Integration**

El frontend debe configurar:
- **URL base**: http://localhost:3000
- **Headers**: Authorization: Bearer {token}
- **Content-Type**: application/json

## 🎯 **Estado Actual**

✅ **100% Funcional**
- Autenticación completa
- Gestión de usuarios
- Subida de radiografías
- Creación de informes
- Base de datos persistente
- Permisos por rol
- Descarga de PDFs

**¡Portal Médico listo para producción!** 🏥
