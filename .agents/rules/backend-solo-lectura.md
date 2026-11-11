---
description: Restricción estricta de solo lectura para el backend. Modificaciones prohibidas en backend/.
globs: ["backend/**"]
---

# Política de Backend: Solo Lectura

- **Prohibido:** No editar, modificar, borrar ni crear archivos en la carpeta `backend/`.
- **Permitido:** Solo lectura (`read_file`, inspección de código) para consultar contratos, DTOs, controladores y endpoints para conectar el frontend.
- **Alcance del trabajo:** 100% exclusivo en `frontend/`.
