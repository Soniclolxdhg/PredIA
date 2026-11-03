# PredIA - Sistema de Gestión Agrícola

Plataforma de Inteligencia y Gestión Agrícola basada en arquitectura de Monolito Modular con frontend desacoplado.

## Estructura del Monorepositorio

```text
predia/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml           # Tests en Jest y build NestJS
│       └── frontend-ci.yml          # Linter y build estático Angular
├── backend/                         # Capa NestJS (Monolito Modular)
│   ├── prisma/
│   │   ├── migrations/              # Historial declarativo de migraciones
│   │   └── schema.prisma            # 15 Modelos relacionales en español (PostgreSQL 16)
│   ├── src/
│   │   ├── common/                  # Guards, Interceptor de Auditoría ISO 27001, PrismaService
│   │   ├── config/                  # Configuración de entorno
│   │   ├── modules/                 # Módulos delimitados de negocio
│   │   │   ├── auth/                # Autenticación, JWT, Argon2, Roles
│   │   │   ├── production/          # Naves, Ciclos, Labores
│   │   │   ├── inventory/           # Insumos, Kardex, Mermas
│   │   │   ├── cost-labor/          # Jornales, Trabajadores, Costos Indirectos
│   │   │   ├── costing-engine/      # Motor de Costeo ($/Kg)
│   │   │   ├── sales/               # Ventas, Clientes, Márgenes
│   │   │   ├── weather/             # Clima Open-Meteo y Alertas
│   │   │   └── analytics/           # Analítica, Proyecciones y Cron
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                        # SPA Angular (Standalone Components)
├── docs/                            # Documentación técnica y arquitectura
├── docker-compose.yml               # PostgreSQL 16 para desarrollo local
└── README.md
```

## Requisitos Previos
- Node.js v20+ LTS
- Docker y Docker Compose
- PostgreSQL 16

## Puesta en Marcha Rápida (Desarrollo Local)

1. **Iniciar Base de Datos Local**:
   ```bash
   docker compose up -d
   ```

2. **Backend**:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run start:dev
   ```

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run start
   ```
