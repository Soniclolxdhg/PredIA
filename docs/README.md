# PredIA - Sistema de Gestión Agrícola

## Documentación Técnica y Arquitectura del Sistema

### 1. Visión General
**PredIA** es una plataforma integral de gestión y predicción agrícola diseñada bajo un patrón de **Monolito Modular** desacoplado, combinando NestJS en el backend y Angular en el frontend.

### 2. Estándar de Lenguaje en el Código
- Todas las entidades de base de datos, enums, atributos, tablas y relaciones están modeladas en **español**.
- Los servicios, DTOs, interfaces, variables y funciones de negocio utilizan nomenclatura en **español** para máxima claridad con el dominio agrícola.

### 3. Modelo Relacional de Base de Datos (15 Tablas Principales)
Gestionado con **PostgreSQL 16** y **Prisma ORM v5.x**:
1. `Usuario` (`usuarios`): Gestión de cuentas con hash Argon2 y roles RBAC (Administrador, Operador, Agrónomo, Contador).
2. `RegistroAuditoria` (`registros_auditoria`): Trazabilidad de operaciones críticas (ISO 27001).
3. `Nave` (`naves`): Invernaderos y naves agrícolas con superficie en $m^2$.
4. `CicloCultivo` (`ciclos_cultivo`): Ciclos productivos por variedad, fechas, estado y telemetría JSONB.
5. `LaborCampo` (`labores_campo`): Tareas programadas y ejecutadas (siembra, riego, poda, cosecha, etc.).
6. `Insumo` (`insumos`): Catálogo de fertilizantes, semillas, sustratos y control de stock mínimo.
7. `MovimientoKardex` (`movimientos_kardex`): Registro de movimientos de entrada, salida y saldo valorizado.
8. `MermaInsumo` (`mermas_insumo`): Control de desperdicios o pérdidas justificadas de insumos.
9. `Trabajador` (`trabajadores`): Personal de campo con asignación de cargo y costo hora.
10. `Jornal` (`jornales`): Horas efectivas trabajadas asignadas a cada labor de campo.
11. `CostoIndirecto` (`costos_indirectos`): Gastos de amortización, servicios y costos indirectos de fabricación.
12. `LiquidacionCostoCiclo` (`liquidaciones_costo_ciclo`): Motor de costeo con cálculo del valor unitario $/Kg y desglose JSONB.
13. `Cliente` (`clientes`): Directorio comercial de compradores.
14. `NotaVenta` (`notas_venta`): Facturación/comprobantes de venta, volumen en Kg, precio, subtotal, margen bruto.
15. `HistoricoClima` (`historico_clima`): Caché meteorológica y alertas provenientes de Open-Meteo REST API.

### 4. Módulos de Backend (NestJS)
- `AuthModule`: Autenticación JWT, Argon2 y guards RBAC.
- `ProductionModule`: Gestión de naves, ciclos y labores agrícolas.
- `InventoryModule`: Insumos, Kardex y registro de mermas.
- `CostLaborModule`: Jornales de trabajadores y costos indirectos.
- `CostingEngineModule`: Servicio de dominio para liquidación de costo $/Kg.
- `SalesModule`: Clientes, notas de venta y cálculo de márgenes comerciales.
- `WeatherModule`: Integración con Open-Meteo y persistencia en `HistoricoClima`.
- `AnalyticsModule`: Cron jobs y proyecciones de cosecha.
