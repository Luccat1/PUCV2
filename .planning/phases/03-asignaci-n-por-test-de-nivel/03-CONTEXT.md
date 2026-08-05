# Phase 3: Asignación por Test de Nivel - Context

**Gathered:** 2026-08-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Al generar Lista Final Curso, resolver automáticamente el nivel real de los estudiantes con "Verificación Certificado === Test de nivel" leyendo los resultados de la hoja "Prueba de Nivel". Excluir a quienes obtuvieron nivel insuficiente (A1/A2/B1.1), marcarlos en la hoja, y enviarles un correo de rechazo específico desde el menú. Actualizar el template de inicio de clases con frase unificada de asignación de nivel.

</domain>

<decisions>
## Implementation Decisions

### Resolución de Nivel (NIVEL-01, NIVEL-02, NIVEL-03)

- **D-01:** La lógica se integra directamente dentro de `generarListaFinalCurso()` en `ListaFinal.ts`. Al detectar un estudiante con `Verificación Certificado === "Test de nivel"`, se busca su resultado en la hoja "Prueba de Nivel" por email antes de agruparlo.
- **D-02:** Niveles válidos (incluibles): `B1+`, `B2.1`, `B2.2`, `C1`. Niveles insuficientes (excluibles): `A1`, `A2`, `B1.1` (cualquier valor no presente en la lista de niveles válidos se trata como insuficiente).
- **D-03:** Los estudiantes con nivel insuficiente son marcados en la hoja "Prueba de Nivel" — columna nueva `"Nivel Insuficiente"` con valor `"Sí"` — y NO se agregan a ningún grupo en la Lista Final.
- **D-04:** Los estudiantes con nivel válido quedan bajo su nivel real (ej: `B2.1`) en la Lista Final, reemplazando el grupo `"PRUEBA DE NIVEL"`.

### Advertencia al Admin (NIVEL-04)

- **D-05:** Los estudiantes sin resultado aún ingresado (columna `Nivel` vacía en "Prueba de Nivel") permanecen agrupados bajo `"PRUEBA DE NIVEL"` en la Lista Final.
- **D-06:** La advertencia se muestra como parte del string de retorno de `generarListaFinalCurso()`. No requiere diálogo adicional ni cambio visual en la hoja. Ejemplo de mensaje: `"Lista final generada. X estudiante(s) aún sin resultado en Prueba de Nivel: [emails]. Ingresar resultados y regenerar para incluirlos en su nivel."`.

### Template Inicio de Clases (NIVEL-05)

- **D-07:** La frase de asignación de nivel es **unificada para todos los estudiantes** (certificado Y test de nivel). No se necesita variable condicional en el template.
- **D-08:** Frase exacta a incorporar en `CorreoInicioClases.html`: *"De acuerdo con los resultados obtenidos en tu prueba de nivel o al certificado presentado durante el proceso de postulación, fuiste asignado/a al nivel [nivel]."* — Se agrega como párrafo en el bloque `.content` antes o después del highlight box, o integrado al highlight.

### Correo de Rechazo por Nivel Insuficiente (NIVEL-06)

- **D-09:** Template nuevo: `CorreoRechazoPorNivel.html`. Mismo estilo visual que los otros templates (Roboto, logo PUCV, container max-width 600px, highlight box azul).
- **D-10:** Contenido del correo:
  - Informar que su nivel obtenido en la prueba está por debajo del mínimo requerido para los cursos ofrecidos.
  - Informar que pueden solicitar una **constancia del nivel alcanzado** enviando un correo con copia a `alexis.ponce@pucv.cl`. El equipo puede generar dicha constancia.
  - Invitar a consultar recursos de idiomas u otros cursos disponibles en la PUCV.
- **D-11:** Idempotencia: nueva columna en "Prueba de Nivel" — `"Correo Rechazo Enviado"` — con la fecha de envío. Re-ejecución omite estudiantes con esta columna ya completada.

### Menú (NIVEL-07)

- **D-12:** Nueva opción bajo el submenú `"📧 Enviar Correos"`, después del separador que precede a `"🏫 Inicio de Clases"`: `"❌ Rechazo por Nivel Insuficiente"` → llama a función `enviarCorreosRechazoPorNivel()`.

### Claude's Discretion

- Nombre exacto de la función de envío del correo de rechazo: `enviarCorreosRechazoPorNivel()` — implementar en nuevo módulo `RechazoPorNivel.ts` o dentro de `InicioClases.ts` (Claude decide según cohesión).
- Posición exacta de la frase de nivel en `CorreoInicioClases.html` (antes o después del highlight box).
- Estructura de columnas nuevas en "Prueba de Nivel" (agregar al final de `PLACEMENT_HEADERS` y `PLACEMENT_COL` en Placement.ts).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Lógica de la hoja "Prueba de Nivel"
- `src/Placement.ts` — Define `PLACEMENT_HEADERS` (línea 22), `PLACEMENT_COL` (línea 36), y toda la lógica de sincronización. La estructura exacta de columnas de la hoja vive aquí. El match por email usa `PLACEMENT_COL.correo = 4` y el nivel resultado está en `PLACEMENT_COL.nivel = 6`.

### Generación de lista final
- `src/ListaFinal.ts` — Función `generarListaFinalCurso()` a modificar. El bloque actual de agrupación "PRUEBA DE NIVEL" (líneas 41-43) es el punto de intervención de NIVEL-01 a NIVEL-04.

### Template de inicio de clases
- `src/CorreoInicioClases.html` — Template a modificar para NIVEL-05. Variables actuales: `nombre`, `nivel`, `catedra`, `ayudantia`, `sala`, `fechaInicio`, `fechaTermino`.
- `src/InicioClases.ts` — Render function `renderCorreoInicioClases()` y patrón de envío idempotente para reutilizar en el correo de rechazo.

### Menú
- `src/Menu.ts` — Submenú `"📧 Enviar Correos"` línea 23. La nueva opción va antes o después del separador antes de `"🏫 Inicio de Clases"` (línea 35).

### Config
- `src/Config.ts` — `CONFIG.SHEETS.PLACEMENT = "Prueba de Nivel"` (línea 127). Nuevas constantes de columna deben agregarse a `PLACEMENT_COL` en `Placement.ts`, no en `CONFIG.COLUMNS` (patrón existente del módulo Placement).

### Requirements
- `.planning/REQUIREMENTS.md` — NIVEL-01 a NIVEL-07 (líneas 44-50).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `InicioClases.ts:enviarCorreosInicioClases()` — Patrón completo de envío batch idempotente con quota check, error logging, y escritura de fecha en columna de estado. Reutilizar para `enviarCorreosRechazoPorNivel()`.
- `InicioClases.ts:renderCorreoInicioClases()` — Patrón de render de template HTML con `HtmlService.createTemplateFromFile`. Replicar para `CorreoRechazoPorNivel.html`.
- `Placement.ts:PLACEMENT_HEADERS / PLACEMENT_COL` — Definición autorizada de las columnas de "Prueba de Nivel". Las columnas nuevas (`"Nivel Insuficiente"`, `"Correo Rechazo Enviado"`) deben agregarse aquí.

### Established Patterns
- **Idempotencia por columna de fecha**: escribir `new Date()` en una columna de estado tras envío exitoso; omitir filas donde esa columna ya tiene valor (ver `InicioClases.ts:129, 216-217`).
- **Quota check**: `MailApp.getRemainingDailyQuota()` antes de enviar batch (ver `InicioClases.ts:175-178`).
- **Template HTML**: `HtmlService.createTemplateFromFile('NombreArchivo')` + asignación de propiedades + `.evaluate().getContent()`.
- **Match por email en Prueba de Nivel**: `sincronizarPlacement()` ya hace match normalizado con `.toLowerCase()`. Replicar para la búsqueda de nivel.

### Integration Points
- `ListaFinal.ts:generarListaFinalCurso()` — punto de entrada para NIVEL-01 a NIVEL-04. La lógica de resolución de nivel del test debe ejecutarse justo antes de la agrupación por nivel (línea ~39).
- `CorreoInicioClases.html` — agregar la frase de nivel unificada (D-08).
- `Placement.ts:PLACEMENT_HEADERS` y `PLACEMENT_COL` — agregar dos columnas nuevas al final.
- `Menu.ts:onOpen()` — agregar item al submenú "Enviar Correos".

</code_context>

<specifics>
## Specific Ideas

- Email de contacto para solicitud de constancia: `alexis.ponce@pucv.cl` (con copia, no destinatario principal — el admin o coordinación es el destinatario principal implícito).
- Frase exacta para nivel en `CorreoInicioClases.html` (D-08): *"De acuerdo con los resultados obtenidos en tu prueba de nivel o al certificado presentado durante el proceso de postulación, fuiste asignado/a al nivel [nivel]."*
- Niveles válidos hardcodeados: `["B1+", "B2.1", "B2.2", "C1"]` — cualquier otro valor (incluyendo vacío) se trata como insuficiente o sin resultado.

</specifics>

<deferred>
## Deferred Ideas

Ninguna — la discusión se mantuvo dentro del alcance de la fase.

</deferred>

---

*Phase: 03-asignaci-n-por-test-de-nivel*
*Context gathered: 2026-08-05*
