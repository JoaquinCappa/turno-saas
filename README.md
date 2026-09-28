# Turnos SaaS

Sistema de gestión de reservas y turnos diseñado para negocios de servicios (barberías, peluquerías, estética, fitness, etc.).

## Objetivo del Proyecto

Construir un SaaS multi-tenant que permita a múltiples negocios gestionar su calendario de turnos de manera completamente aislada. 
A futuro, este sistema será la base para un marketplace donde los clientes finales podrán buscar y reservar turnos, pero el enfoque inicial está 100% en el núcleo administrativo y operativo de cada negocio.

## Stack Tecnológico

- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Autenticación**: NextAuth.js / Auth.js (con bcryptjs para contraseñas)

## Arquitectura y Seguridad (Multi-Tenant)

La arquitectura de este SaaS requiere un fuerte aislamiento de datos por negocio. 

- La entidad raíz del sistema es `Business`.
- Todas las demás entidades (Usuarios, Profesionales, Clientes, Servicios, Reservas, etc.) pertenecen a un `Business`.
- **Seguridad y Autorización**: Nunca se asume que un usuario tiene acceso global a los recursos solo por estar autenticado. Cualquier operación de lectura, escritura o modificación deberá validar siempre el patrón: `Usuario -> Business -> Recurso`. No se implementará lógica de negocio para un recurso sin antes verificar la pertenencia al `Business` correspondiente.

## Estructura Inicial del Proyecto

- `src/app`: Rutas de la aplicación (App Router).
- `src/components`: Componentes reutilizables de UI.
- `src/lib`: Utilidades, configuración compartida (ej. cliente Prisma).
- `src/server`: Acciones de servidor (Server Actions) y lógica de backend.
- `src/types`: Definiciones de tipos de TypeScript adicionales.
- `prisma/`: Esquema de la base de datos y migraciones.

## Desarrollo y Ejecución

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno:
   Copiar `.env.example` a `.env` y configurar la URL de PostgreSQL (`DATABASE_URL`) y la clave secreta de NextAuth (`AUTH_SECRET`).

3. Sincronizar Prisma (una vez que la base de datos PostgreSQL esté corriendo):
   ```bash
   npx prisma db push
   # o
   npx prisma migrate dev
   ```

4. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```
