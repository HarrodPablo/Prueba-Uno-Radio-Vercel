# Portal Médico de Radiografías

Aplicación web fullstack para la gestión de radiografías médicas con autenticación por roles.

## Stack Tecnológico

### Frontend
- React.js + Vite
- Tailwind CSS
- Context API para estado
- Cornerstone.js para visor DICOM

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL (Neon)
- JWT con roles

## Roles
- **ADMIN**: Gestión de usuarios y sistema
- **DOCTOR**: Atención de pacientes, informes, visor DICOM
- **PATIENT**: Consulta de historial y resultados

## Estructura del Proyecto

```
/
├── backend/          # API REST con Node.js
├── frontend/         # Aplicación React
└── README.md
```

## Instalación

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Funcionalidades Principales

- Autenticación con DNI + contraseña
- Subida y visualización de radiografías
- Informes médicos
- Notificaciones automáticas por WhatsApp
- Generación de PDFs
- Diseño mobile-first
