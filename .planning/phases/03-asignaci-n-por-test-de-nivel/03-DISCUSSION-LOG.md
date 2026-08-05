# Phase 3: Asignación por Test de Nivel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-05
**Phase:** 03-asignaci-n-por-test-de-nivel
**Areas discussed:** Estructura hoja "Prueba de Nivel", Advertencia al admin, Contenido correo de rechazo, Frase condicional CorreoInicioClases

---

## Estructura de la hoja "Prueba de Nivel"

| Option | Description | Selected |
|--------|-------------|----------|
| Definida en Placement.ts | PLACEMENT_HEADERS y PLACEMENT_COL ya documentan la estructura completa | ✓ |
| Columnas desconocidas | Requeriría inspección manual de la hoja | |

**User's choice:** La estructura ya está en `Placement.ts` — `PLACEMENT_HEADERS` y `PLACEMENT_COL` son la fuente autorizada. El código de placement (sincronización, envío de credenciales) ya opera sobre esa estructura.

**Notes:** Match por email (`PLACEMENT_COL.correo = 4`), nivel resultado en `PLACEMENT_COL.nivel = 6`. Nuevas columnas de estado (`"Nivel Insuficiente"`, `"Correo Rechazo Enviado"`) se agregan al final de `PLACEMENT_HEADERS`/`PLACEMENT_COL` en `Placement.ts`.

---

## Advertencia al Admin (resultados faltantes)

| Option | Description | Selected |
|--------|-------------|----------|
| Parte del string de retorno | Mensaje de texto al final de generarListaFinalCurso() | ✓ |
| Diálogo de GAS | SpreadsheetApp.getUi().alert() | |
| Marca visual en la hoja | Resaltar filas sin resultado | |

**User's choice:** Parte del string de retorno de `generarListaFinalCurso()`.

**Notes:** Sin diálogo adicional ni cambio visual en la hoja. El mensaje indica los correos de estudiantes sin resultado y sugiere ingresar resultados y regenerar la lista.

---

## Contenido del Correo de Rechazo (NIVEL-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Solo notificación de rechazo | Informa que el nivel está bajo el mínimo | |
| Con instrucciones para constancia | Incluye contacto para solicitar constancia + invitación a otros recursos | ✓ |

**User's choice:** Correo incluye información sobre la constancia disponible.

**Notes:** Para solicitar la constancia, el estudiante debe enviar un correo con **copia** a `alexis.ponce@pucv.cl`. El equipo puede generar la constancia. El correo también invita a consultar recursos de idiomas u otros cursos de la PUCV.

---

## Frase Condicional en CorreoInicioClases (NIVEL-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Frase condicional (diferente para test vs certificado) | Requiere variable booleana `esDePrueba` en template | |
| Frase unificada para todos | Misma frase cubre ambos casos | ✓ |

**User's choice:** Frase unificada — no condicional.

**Notes:** Texto exacto decidido: *"De acuerdo con los resultados obtenidos en tu prueba de nivel o al certificado presentado durante el proceso de postulación, fuiste asignado/a al nivel [nivel]."* — Aplica a todos los estudiantes por igual. Simplifica implementación (no requiere nueva variable en `ICorreoInicioClasesVars`).

---

## Claude's Discretion

- Módulo donde colocar `enviarCorreosRechazoPorNivel()` (nuevo `RechazoPorNivel.ts` vs dentro de `InicioClases.ts`)
- Posición exacta de la frase de nivel en el template HTML
- Estructura exacta de las dos nuevas columnas en `PLACEMENT_HEADERS`/`PLACEMENT_COL`

## Deferred Ideas

Ninguna — discusión se mantuvo dentro del alcance de la fase.
