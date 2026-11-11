# Reglas y Directrices de Desarrollo - Proyecto PredIA

## 🚫 Restricción Estricta de Backend (Solo Lectura)

> [!CAUTION]
> **PROHIBIDO MODIFICAR EL BACKEND:**
> El agente tiene **estrictamente prohibido modificar, editar, agregar o alterar** cualquier archivo dentro del directorio `backend/`.
> 
> * **Permitido:**
>   - **Inspección y solo lectura:** Leer y consultar controladores, servicios, DTOs y esquemas de Prisma dentro de `backend/` para entender las rutas, formatos de payload, parámetros de consulta y tipos de respuesta.
>   - **Trabajo en Frontend:** Crear, modificar y mantener el código en `frontend/` para realizar las conexiones HTTP con la API según la documentación y contratos definidos.
> * **No permitido:**
>   - Ningún cambio en controladores, servicios, módulos, DTOs, tests, dependencias ni configuraciones de `backend/`.
>   - Ninguna modificación a la base de datos o migraciones desde el agente.

---

## 🎨 Frontend y Conexión de API
- Toda la integración se realiza exclusivamente desde el lado del cliente (`frontend/`).
- Consumir los endpoints expuestos por la API (`/api/...`) tal cual están implementados por el equipo de backend.
- Mantener las validaciones de negocio en el frontend acordes a las respuestas y contratos del backend.
