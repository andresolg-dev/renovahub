# 🚀 RenovaHub - Sistema de Gestión de Licencias

RenovaHub es una aplicación web moderna para la gestión centralizada de licencias de software con notificaciones automáticas de renovación.

## ✨ Características Principales

### 📊 Dashboard Completo
- **Métricas en tiempo real**: Total de licencias, costos, vencimientos
- **Gráficos interactivos**: Renovaciones por mes, distribución por estado, costos por moneda
- **Próximas renovaciones**: Vista rápida de licencias que vencen pronto
- **Estado del sistema**: Monitoreo de conexiones y servicios

### 📋 Gestión de Licencias
- **CRUD completo**: Crear, leer, actualizar y eliminar licencias
- **Importación masiva**: Desde Excel/CSV y Google Sheets
- **Exportación**: A Excel/CSV y Google Sheets
- **Filtros y búsqueda**: Por estado, fecha, responsable, etc.
- **Agrupación por origen**: Organización por fuente de datos

### 📧 Sistema de Notificaciones
- **Resend (Recomendado)**: Integración con Resend para máxima deliverability
- **SMTP Personalizado**: Soporte para Gmail, Outlook, SendGrid, Mailgun, etc.
- **Notificaciones automáticas**: Licencias próximas a vencer, vencidas, reportes
- **Pruebas de configuración**: Verificación de configuración con emails de prueba

### 🔗 Integraciones
- **Google Sheets**: Importación/exportación automática
- **Excel/CSV**: Soporte completo para archivos locales
- **API REST**: Endpoints para integraciones personalizadas

### 👥 Gestión de Usuarios
- **Roles y permisos**: Administrator y User
- **Autenticación Firebase**: Segura y escalable
- **Gestión de usuarios**: Panel de administración completo

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Next.js 14**: Framework React con App Router
- **TypeScript**: Tipado estático para mayor robustez
- **Tailwind CSS**: Estilos utilitarios y responsive
- **shadcn/ui**: Componentes UI modernos y accesibles
- **Recharts**: Gráficos interactivos y responsivos
- **Lucide React**: Iconografía consistente

### Backend
- **Next.js API Routes**: Endpoints serverless
- **Firebase Admin SDK**: Gestión de base de datos y autenticación
- **Firestore**: Base de datos NoSQL en tiempo real
- **Resend**: Servicio de email moderno
- **Nodemailer**: Cliente SMTP para emails personalizados

### Servicios Externos
- **Firebase**: Autenticación y base de datos
- **Google Sheets API**: Integración con hojas de cálculo
- **Resend**: Servicio de email con alta deliverability

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd renovaHub
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crear archivo `.env.local`:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Configurar Firebase
1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitar Authentication (Email/Password)
3. Crear base de datos Firestore
4. Generar credenciales de Service Account
5. Habilitar Google Sheets API en Google Cloud Console

### 5. Ejecutar en Desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📱 Navegación y Uso

### 🏠 Página Principal (Logo Clickeable)
- Hacer clic en el logo **RenovaHub** lleva al Dashboard principal
- Navegación responsive con menú hamburguesa en móviles

### 📊 Dashboard (`/dashboard`)
- Vista general con métricas clave
- Gráficos interactivos de renovaciones y costos
- Estado del sistema y próximas renovaciones

### 📋 Licencias (`/`)
- Tabla completa de licencias
- Funciones de importación/exportación
- Gestión CRUD de licencias individuales

### 👥 Usuarios (`/admin`) - Solo Administradores
- Gestión de usuarios del sistema
- Asignación de roles y permisos

### 📧 Configuración Email (`/config/smtp`) - Solo Administradores
- Configuración de Resend o SMTP personalizado
- Pruebas de configuración
- Gestión de notificaciones automáticas

### 🔗 Integraciones (`/integrations`) - Solo Administradores
- Configuración de Google Sheets
- Gestión de APIs externas

### 🔔 Notificaciones (`/admin/notifications`) - Solo Administradores
- Configuración de alertas automáticas
- Historial de notificaciones enviadas

## 📧 Configuración de Email

### Opción 1: Resend (Recomendado)
1. Crear cuenta en [resend.com](https://resend.com)
2. Obtener API Key
3. Configurar en `/config/smtp`
4. **Ventajas**: 3,000 emails gratis/mes, excelente deliverability, fácil configuración

### Opción 2: SMTP Personalizado
Proveedores soportados:
- **Gmail**: smtp.gmail.com:587 (usar contraseña de aplicación)
- **Outlook**: smtp-mail.outlook.com:587
- **SendGrid**: smtp.sendgrid.net:587 (usar API Key)
- **Mailgun**: smtp.mailgun.org:587
- **Personalizado**: Cualquier servidor SMTP

## 📊 Importación de Datos

### Formato de Columnas (Por Posición)
1. **Nombre del Software** (obligatorio)
2. **Fecha de Renovación** (obligatorio)
3. **Monto** (obligatorio, > 0)
4. **Moneda** (opcional, por defecto "USD")
5. **Email Responsable** (obligatorio)
6. **URL de Renovación** (opcional)
7. **Estado** (opcional, por defecto "active")

### Fuentes Soportadas
- **Excel/CSV**: Archivos locales con formato estándar
- **Google Sheets**: Importación directa desde hojas de cálculo

## 🔒 Seguridad

- **Autenticación Firebase**: Gestión segura de usuarios
- **Roles y permisos**: Control de acceso granular
- **Validación de datos**: Sanitización en frontend y backend
- **Conexiones encriptadas**: HTTPS y TLS para emails
- **Variables de entorno**: Credenciales protegidas

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Desplegar automáticamente

### Otros Proveedores
- **Netlify**: Soporte completo para Next.js
- **Railway**: Despliegue con base de datos
- **DigitalOcean**: App Platform

## 🤝 Contribución

1. Fork del repositorio
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o reportar bugs:
1. Crear issue en GitHub
2. Incluir pasos para reproducir el problema
3. Adjuntar logs relevantes
4. Especificar versión y entorno

---

**RenovaHub** - Gestión inteligente de licencias de software 🚀