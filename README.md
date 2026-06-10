# Babel Translations

Plataforma SaaS de traducción de documentos legales mediante inteligencia artificial.

## Stack Tecnológico

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **UI:** Shadcn/UI, Lucide Icons
- **Backend:** Next.js Server Actions, Prisma ORM 5
- **Base de datos:** PostgreSQL
- **Autenticación:** NextAuth/Auth.js con estrategia JWT
- **Lenguaje:** TypeScript (tipado completo)

## Características

- Landing page profesional con secciones de servicios, cómo funciona y beneficios
- Registro e inicio de sesión de usuarios con validación
- Dashboard con sidebar colapsable y topbar con menú de usuario
- Subida de documentos (PDF, DOCX, TXT) con arrastrar y soltar
- Traducción automática mediante servicio modular (preparado para DeepSeek, OpenRouter, Gemini, OpenAI)
- Visualizador de resultados con dos paneles (original y traducido)
- Historial de documentos con tabla, filtros y acciones
- Configuración de perfil (nombre, contraseña)
- Diseño responsive, moderno y profesional
- Skeletons, toasts, estados vacíos y manejo de errores

## Instalación y ejecución local

### Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd babel-translations

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Editar el archivo .env con tus credenciales de PostgreSQL
# DATABASE_URL="postgresql://usuario:password@localhost:5432/babel_translations"

# 4. Inicializar la base de datos
npx prisma db push

# 5. Ejecutar en desarrollo
npm run dev
```

Visitar `http://localhost:3000`

### Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://postgres:postgres@localhost:5432/babel_translations` |
| `NEXTAUTH_URL` | URL de la aplicación | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secreto para JWT | `generar con openssl rand -base64 32` |

### Proveedores de IA (opcional)

Para usar traducción real con IA, configurar en `.env`:

| Variable | Proveedor |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek |
| `OPENROUTER_API_KEY` | OpenRouter |
| `GEMINI_API_KEY` | Google Gemini |
| `OPENAI_API_KEY` | OpenAI |

Sin estas variables, el sistema usa un modo mock para demostración.

## Despliegue en Vercel

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Desplegar
vercel

# 3. Configurar variables de entorno en el dashboard de Vercel:
#    - DATABASE_URL (usar Neon, Supabase o Railway para PostgreSQL)
#    - NEXTAUTH_URL (https://tu-app.vercel.app)
#    - NEXTAUTH_SECRET
```

### Base de datos en producción

Usar un servicio PostgreSQL administrado:
- [Neon](https://neon.tech) (recomendado, tier gratuito)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

## Estructura del proyecto

```
├── prisma/               # Esquema de base de datos
│   └── schema.prisma
├── src/
│   ├── actions/          # Server Actions
│   ├── app/              # Páginas y layouts (App Router)
│   │   ├── api/          # API Routes
│   │   ├── dashboard/    # Dashboard protegido
│   │   ├── login/        # Inicio de sesión
│   │   └── register/     # Registro
│   ├── components/       # Componentes UI reutilizables
│   ├── features/         # Componentes por funcionalidad
│   │   ├── auth/         # Formularios de autenticación
│   │   ├── dashboard/    # Sidebar, Topbar
│   │   ├── documents/    # Tabla de documentos
│   │   ├── landing/      # Secciones de landing page
│   │   ├── settings/     # Formularios de configuración
│   │   └── translation/  # Formulario y visor de traducción
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilidades (Prisma client, Auth, cn)
│   ├── middleware.ts     # Protección de rutas
│   ├── services/         # TranslationService modular
│   └── types/            # Tipos TypeScript
└── uploads/              # Archivos subidos (local)
```

## Licencia

MIT
