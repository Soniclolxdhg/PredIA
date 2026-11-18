# Backlog de Mejoras Evolutivas Externas al Informe EV2 (RFC)

Este documento registra todas las **mejoras funcionales, técnicas y de base de datos** implementadas fuera del alcance estricto del diccionario de datos original definido en el informe `Proyecto_PredIA_EV2.docx`, siguiendo el proceso de **Solicitud de Cambio (RFC - Request for Change)** descrito en la Sección 6.3 (*Plan de Mantención*) del informe oficial.

---

## Registro de Mejoras Implementadas

| ID | Título | Módulo Afectado | Impacto en BD | Estado | Fecha |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MEJ-01 (RFC-01)** | Catálogo Maestro de Variedades Hortícolas | Catálogos (`CatalogsModule`) | Nueva tabla `catalogo_variedades` | ✅ Implementado | 2026-11-17 |
| **MEJ-02 (RFC-02)** | Gestión y Edición de Usuarios del Sistema | Auth (`AuthModule`) | Sin cambios de esquema | ✅ Implementado | 2026-11-17 |
| **MEJ-03 (RFC-03)** | Auto-sincronización Agroclimática al Arranque | Clima (`WeatherModule`) | Sin cambios de esquema | ✅ Implementado | 2026-11-17 |

---

## Detalle de Mejoras

### MEJ-01 (RFC-01): Catálogo Maestro de Variedades Hortícolas
* **Origen / Necesidad:** En el informe EV2 (Tabla 6: `CICLO_CULTIVO`), el atributo `variedad` fue definido como texto libre `VARCHAR(50)`. Durante la integración con el frontend se identificó la necesidad de contar con un catálogo administrable de variedades para alimentar selectores dinámicos al abrir ciclos de cultivo.
* **Beneficio Operativo:**
  - Contribuye directamente al **KPI 2 (Tasa de errores en registros < 2%)**, evitando errores de digitación (ej. `"Tomate Cherry"` vs `"tomate chery"`).
  - Garantiza agrupación exacta en el gráfico ejecutivo *"Ventas y Margen Bruto por Variedad"* de Chart.js (HU11).
* **Cambio en Base de Datos:**
  - Nueva tabla: `catalogo_variedades` (`id_variedad`, `nombre` único, `especie`, `descripcion`, `activo`, `fecha_creacion`).
  - Migración Prisma: `backend/prisma/migrations/20261117235500_add_catalogo_variedades/migration.sql`.
  - Compatibilidad: `ciclos_cultivo.variedad` se mantiene intacto como `VARCHAR(50)` para preservar 100% de compatibilidad con el modelo oficial EV2.
* **Endpoints Habilitados:**
  - `POST /api/catalogos/variedades` — Crear variedad (unicidad insensible a mayúsculas/minúsculas).
  - `GET /api/catalogos/variedades` — Listar variedades (`?soloActivas=true&busqueda=...`).
  - `GET /api/catalogos/variedades/:id` — Detalle de variedad.
  - `PATCH` / `PUT /api/catalogos/variedades/:id` — Editar variedad.
  - `DELETE /api/catalogos/variedades/:id` — Eliminación física si no tiene uso, o baja lógica (`activo = false`) si existen ciclos históricos asociados.
  - `POST /api/catalogos/variedades/sembrar` — Carga inicial de variedades base de Santa Laura Ltda. (*Tomate Larga Vida, Tomate Cherry, Tomate Limachino, Pimiento*).

---

### MEJ-02 (RFC-02): Edición Administrativa de Usuarios
* **Origen / Necesidad:** El informe contemplaba el registro y autenticación de usuarios, pero en la administración práctica del predio se requiere modificar roles, corregir correos electrónicos o desactivar cuentas existentes.
* **Endpoints Habilitados:**
  - `GET /api/auth/usuarios/:id`
  - `PUT` / `PATCH /api/auth/usuarios/:id` (con validación de unicidad de email/RUT y re-cifrado Argon2id si cambia la contraseña).

---

### MEJ-03 (RFC-03): Auto-sincronización Climática en Arranque (`OnApplicationBootstrap`)
* **Origen / Necesidad:** En despliegues cloud (Render) la tabla `historico_clima` podía iniciar vacía hasta que se cumpliera el horario del Cron Job (06:00 / 18:00) o alguien consultara el módulo por primera vez.
* **Solución:** Al arrancar la aplicación, `WeatherService` verifica si existen menos de 7 registros en `historico_clima` y sincroniza automáticamente con Open-Meteo para Olmué, Chile (`-33.00`, `-71.19`).

---

## Ideas Futuras (Pendientes de Evaluación)
* **MEJ-04:** Exportación de reportes de costos y notas de venta en formato PDF / Excel.
* **MEJ-05:** Notificaciones proactivas por correo electrónico o WhatsApp cuando se detecte alerta de helada ($< 2^\circ\text{C}$) o quiebre de stock crítico.
