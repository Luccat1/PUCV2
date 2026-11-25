# PUCV2 / PUCV2English v2.6.0 — Sistema de Gestión Automatizada

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script-green.svg)](https://developers.google.com/apps-script)

**PUCV2English** es un ecosistema modular desarrollado en **TypeScript** para la gestión profesional de postulaciones al Programa de Inglés PUCV. El sistema automatiza el ciclo completo: desde la evaluación masiva con criterios ponderados, hasta la gestión de matrícula, lista de espera, control de pagos y comunicación automatizada con los postulantes.

> **Novedades v2.6.0 (Noviembre 2026) — Sexta convocatoria, 1.er semestre 2027:**
>
> - **Evaluación alineada con las bases**: todas las postulaciones se evalúan y puntúan. Quien incumple un requisito o impedimento (n.º 4, 5.1 y 5.2) queda con `NO ELEGIBLE: <motivos>` en la columna `Observaciones` y no entra a los cupos ni a la lista de espera, para que siempre se sepa por qué. La pauta contiene los criterios del n.º 7.2.
> - **Formulario 2026 soportado**: `CONFIG.COLUMNS` coincide con los encabezados vigentes. Antes varias columnas no se encontraban y todos quedaban en nivel B1+, con 1 punto de certificado.
> - **Uso del inglés y respaldo de jefatura** puntúan a funcionarios (los académicos, que no ven esa sección, reciben 1 punto base en Uso del Inglés); **año de ingreso** solo a pregrado (prioridad desde el 3.er año). **Disponibilidad y compromiso** puntúan con 1 punto base × peso del perfil.
> - **Alumni**: el formulario no les pregunta nada más allá de sus datos personales, así que puntúan 0, quedan con `Observaciones` y solo acceden a cupo si no quedan elegibles de la comunidad activa.
> - **Cupos de convocatoria abierta**: 25 en B1+ y 15 en B2.1, B2.2 y C1 (el resto son de continuidad).
> - **Desempate** según n.º 7.5: académicos y postgrado, funcionarios, pregrado, y luego quien postuló primero.
> - **Internacionalización**: etapas correlativas (Ya aceptado 3,5 … Interés general 0), planes con puntaje jerárquico y documentos de respaldo; el texto libre ("Otro:") se interpreta con familias léxicas. **Fecha de postulación** se guarda como fecha (`dd/MM/yyyy HH:mm`).
> - **Despliegue con `clasp`** (`bash deploy.sh && clasp push -f`) y pruebas automáticas del texto libre (`node tests/texto-libre.test.js`).
>
> **Novedades v2.5.0 (Julio 2026):**
>
> - **Módulo Prueba de Nivel (CEPT)** — Sistema completo para gestionar el Cambridge English Placement Test: sincronización de candidatos, envío de credenciales iniciales, recordatorios y nuevos códigos.
> - **Hoja `"Prueba de Nivel"`** — Hoja automática con credenciales CEPT y control de envíos por checkbox.
> - **Sub-menú `🧪 Prueba de Nivel (CEPT)`** — 4 nuevas opciones de gestión del placement test en el menú.
>
> **Novedades v2.4.0 (Julio 2026):**
>
> - **Lista de Espera Ampliada**: Hoja física `"Lista de Espera"` con capacidad de hasta 30 candidatos por nivel (120 total).
> - **Control de Pagos**: Columna `"Pago Matrícula"` con dropdown interactivo en `"Seleccionados"`. La Lista Final exige `Acepta` + `Pagado`.
> - **Promoción desde Lista de Espera**: Función de un clic para promover al siguiente candidato de la lista de espera a seleccionados.
> - **Correo de Cierre de Espera**: Nueva plantilla `CorreoEsperaSinCupo` para notificar a la lista de espera cuando el proceso concluye sin vacantes.
> - **Modo Borrador Gmail**: Opción de crear correos como borradores antes de enviarlos realmente para revisión previa.
> - **Seleccionados Protegidos**: La hoja `"Seleccionados"` ya no se sobreescribe al regenerar; las promociones manuales se preservan.
> - **Exclusión Segura**: Los correos de rechazo excluyen automáticamente a seleccionados y lista de espera.
> - **Soporte Bilingüe**: Templates y lógica para ambos programas — PUCV2 (español) y PUCV2English (inglés).
>
> Ver historial completo en [CHANGELOG.md](CHANGELOG.md).

---

## ✨ Características Principales

### 📊 Evaluación Automatizada

- **Procesamiento Incremental**: Evalúa solo postulaciones nuevas usando la columna `"Estado de Procesamiento"`.
- **Deduplicación**: Detecta y descarta automáticamente postulaciones duplicadas por correo electrónico.
- **Filtro de Incompletos**: Marca y omite postulaciones sin datos esenciales (correo, RUT o nombre).
- **Pesos Configurables**: Todos los criterios de puntuación son ajustables desde la hoja `"Configuración"` o el sidebar lateral.

### 📈 Dashboard y Ranking

- **Dashboard Dinámico**: Métricas en tiempo real por categoría, sede, año de ingreso y distribución por nivel.
- **Ranking de Seleccionados**: cupos de convocatoria abierta por nivel (B1+ 25; B2.1, B2.2 y C1 15) con empates resueltos según las bases (n.º 7.5).
- **Formato Condicional**: Filas coloreadas automáticamente según estado (verde = Acepta, rojo = Rechaza).

### 📋 Gestión de Seleccionados y Lista de Espera

- **Columnas de Gestión Interactivas**: Dropdowns para `Verificación Certificado`, `Nivel Asignado`, `Aceptación` y `Pago Matrícula`.
- **Lista de Espera Física**: Hoja `"Lista de Espera"` con hasta 30 candidatos por nivel, preservando fechas de notificación.
- **Promoción Manual**: Botón para promover al siguiente candidato de la lista de espera a seleccionados con un clic.
- **Protección de Datos**: La hoja `"Seleccionados"` está congelada — las regeneraciones automáticas solo actualizan la lista de espera.
- **Restauración de Emergencia**: Función `restaurarHojaSeleccionadosPerdida` para recuperar datos en caso de pérdida accidental.

### ✉️ Sistema de Correos Automatizados

El sistema soporta **7 tipos de envío masivo** y **2 correos de confirmación automática**:

| Tipo de Lote | Plantilla HTML | Descripción |
| --- | --- | --- |
| `SELECTED` | `CorreoSeleccionado` | Invitación a seleccionados con certificado válido |
| `TEST_LEVEL_ONLY` | `CorreoTestNivel` | Convocatoria a test de nivel para candidatos sin certificado |
| `HAND_PICKED` | `CorreoHandPicked` | Invitación a candidatos seleccionados manualmente fuera de plazo |
| `WAITLIST` | `CorreoListaEspera` | Aviso de ingreso a la lista de espera |
| `WAITLIST_REJECTED` | `CorreoEsperaSinCupo` | Cierre del proceso — sin vacantes disponibles |
| `NO_SELECTED` | `CorreoNoSeleccionado` | Rechazo (excluye automáticamente a seleccionados y lista de espera) |
| `CONTINUATION` | `CorreoContinuacion` | Acceso preferencial para estudiantes de continuación (sin matrícula) |

**Correos Automáticos de Confirmación:**

- `CorreoConfirmacionAcepta`: Se envía al aceptar, incluye link de pago y plazo dinámico de 3 días.
- `CorreoConfirmacionRechaza`: Se envía al rechazar el cupo.

**Funcionalidades Adicionales:**

- **Modo Borrador**: Crear correos como borradores de Gmail antes de enviar (con opción de limitar a 5 muestras).
- **Tokens UUID**: Cada postulante recibe enlaces únicos de aceptar/rechazar de un solo uso.
- **Fecha Límite Dinámica**: El plazo se calcula automáticamente desde la fecha de envío del correo.
- **Idempotencia**: Los correos no se duplican gracias a columnas de control de fecha de notificación.
- **Verificación de Cuota Gmail**: Se valida la cuota disponible antes de cada envío masivo.

### 📋 Lista Final e Inicio de Clases

- **Filtro Estricto**: Solo candidatos con `Aceptación = "Acepta"` **y** `Pago Matrícula = "Pagado"` entran a la lista final.
- **Inicio de Clases**: Diálogo interactivo para asignar salas por nivel y enviar correos de bienvenida con horarios y fechas.

### 🛡️ Robustez y Seguridad

- **Control de Concurrencia**: `LockService` previene ejecuciones simultáneas.
- **Manejo de Errores por Fila**: Bloques `try...catch` aíslan errores sin detener el procesamiento completo.
- **Sandbox de Pruebas**: Tokens de confirmación inválidos operan en modo seguro sin afectar datos reales.

---

## ⚙️ Arquitectura del Sistema

El código está organizado de forma modular en TypeScript con compilación a JavaScript para Google Apps Script.

```text
src/
├── Config.ts              # Configuración global, tipos e interfaces
├── Evaluacion.ts          # Motor de evaluación y cálculo de puntajes
├── Seleccionados.ts       # Gestión de seleccionados, lista de espera y promoción
├── Correos.ts             # Tipos de correo (tabla CORREOS), destinatarios y correos de prueba
├── EnvioLote.ts           # Envío por lote compartido: cuota, borrador, sello de fecha
├── ListaFinal.ts          # Generación de la lista final del curso
├── InicioClases.ts        # Notificaciones de inicio de clases
├── Placement.ts           # Cambridge English Placement Test (CEPT) workflow
├── WebApp.ts              # Panel de control web y endpoints de confirmación
├── Dashboard.ts           # Generación del dashboard estadístico
├── Menu.ts                # Menú personalizado de Google Sheets
├── Utils.ts               # Funciones de soporte transversales
├── RechazoPorNivel.ts     # Correos de rechazo por nivel insuficiente
├── TestInicioClases.ts    # Tests para inicio de clases
├── TestRechazoPorNivel.ts # Tests de rechazo por nivel
├── TestCriticalPaths.ts   # Tests de rutas críticas
├── CorreoSeleccionado.html
├── CorreoTestNivel.html
├── CorreoHandPicked.html
├── CorreoListaEspera.html
├── CorreoEsperaSinCupo.html
├── CorreoNoSeleccionado.html
├── CorreoConfirmacionAcepta.html
├── CorreoConfirmacionRechaza.html
├── CorreoContinuacion.html
├── CorreoInicioClases.html
├── CorreoBase_Estilos.html    # Estilos comunes de los correos (fragmento compartido)
├── CorreoBase_Cabecera.html   # Logo y apertura del contenido (fragmento compartido)
├── CorreoBase_Pie.html        # Pie institucional (fragmento compartido)
├── CorreoPlacementTest.html   # Correo de credenciales CEPT (diseño propio)
├── DialogPlacementConfig.html # Diálogo de configuración del placement test
├── DialogSalas.html
├── DialogConfirmEval.html
├── SidebarConfig.html
├── SidebarRevision.html
├── index.html             # Interfaz del panel de control web
├── appsscript.json
└── tsconfig.json

tests/
└── texto-libre.test.js    # Pruebas del análisis de texto libre (node, sobre dist/)

deploy.sh                  # Compila y prepara PUCV2English/ (luego: clasp push -f)
```

### Objeto CONFIG

```javascript
const CONFIG = {
  WEB_APP_URL: "https://script.google.com/.../exec",
  SHEETS: {
    INPUT: "Respuestas de formulario 1",
    OUTPUT: "Evaluación automatizada",
    DASHBOARD: "Dashboard",
    SELECTED: "Seleccionados",
    WAITLIST: "Lista de Espera",
    FINAL_LIST: "Lista Final Curso",
    CONFIG: "Configuración",
    CONTINUATION: "Continuación"
  },
  COLUMNS: {
    NOTIFICATION_DATE: "Fecha Notificación",
    PROCESSING_STATUS: "Estado de Procesamiento",
    // ... más columnas
  }
};
```

---

## 🚀 Guía de Instalación y Configuración

### **Paso 1: Crear un Script Independiente**

1. **Crear Hoja de Cálculo:** Crea un nuevo **Google Sheet**. Este será tu centro de operaciones.
2. **Crear Formulario:** Crea un **Google Form** para recibir las postulaciones.
3. **Vincular Formulario:** Dentro del formulario, ve a la pestaña "Respuestas" y haz clic en el icono de Google Sheets para vincularlo. Las respuestas se guardarán en la pestaña `Respuestas de formulario 1`.

### **Paso 2: Configurar la Hoja de Respuestas**

1. En la hoja `Respuestas de formulario 1`, ve a la primera columna vacía a la derecha.
2. Nombra el encabezado exactamente: `Estado de Procesamiento`.
    > **Importante:** El nombre debe ser idéntico. El script usará esta columna para saber qué filas ya ha procesado.

### **Paso 3: Compilar y Preparar los Archivos**

1. Asegúrate de tener Node.js instalado. Ejecuta en la raíz del proyecto:

   ```bash
   npm install
   npm run build
   ```

2. Prepara la carpeta de producción (compila y copia `.js` desde `dist/` y `.html` desde `src/` a `PUCV2English/`):

   ```bash
   bash deploy.sh
   ```

### **Paso 4: Subir a Google Apps Script**

**Recomendado: `clasp`** (sube todos los archivos de una vez y evita proyectos con archivos desactualizados; `clasp push` reemplaza todo el proyecto remoto).

1. Una sola vez: instala `clasp` global (`npm i -g @google/clasp`), inicia sesión con `clasp login` y crea `.clasp.json` en la raíz con `{"scriptId":"<ID del script>","rootDir":"PUCV2English"}` (el ID está en Configuración del proyecto de Apps Script). Si `PUCV2English/` no tiene `appsscript.json`, cópialo desde `src/`.
2. Cada vez que cambies código: `bash deploy.sh && clasp push -f`.

**Alternativa manual:**

1. En tu Google Sheet, ve a `Extensiones` > `Apps Script`.
2. Crea un archivo nuevo por cada archivo `.js` y `.html` de la carpeta `PUCV2English/` (todos: los módulos se llaman entre sí y un archivo desactualizado produce `ReferenceError`).
3. Copia y pega el contenido de cada archivo con el mismo nombre (sin extensión).
4. En `Config.js`, actualiza la propiedad `WEB_APP_URL` con la URL de tu Web App publicada.
5. Guarda el proyecto.

### **Paso 5: Configurar el Activador (Trigger)**

1. En el editor de Apps Script, haz clic en **Activadores** (⏰).
2. Haz clic en **+ Añadir activador**:
   - **Función:** `evaluarPostulacionesPUCV2`
   - **Fuente del evento:** `Desde una hoja de cálculo`
   - **Tipo de evento:** `Al enviar un formulario`
3. Guarda y autoriza los permisos.

### **Paso 6: Implementar el Panel de Control Web**

1. Haz clic en **Implementar** > **Nueva implementación** > **Aplicación web**.
2. Configura: Ejecutar como `Yo`, Acceso `Cualquiera` (los postulantes confirman su cupo desde el correo sin iniciar sesión).
3. Copia la URL generada y pégala en `WEB_APP_URL` (`Config.ts`): los enlaces de Aceptar/Rechazar de los correos se arman con ella.
    > La URL pública solo atiende confirmaciones (`action` + `token`); sin esos parámetros muestra un aviso y no entrega datos. El panel de control administrativo se abre desde el menú de la planilla (`📈 Ver Dashboard`).
    > ⚠️ Si usas múltiples cuentas de Google, abre los enlaces en una ventana de incógnito.

---

## 🛠️ Modo de Uso

### Ejecución Automática

Una vez configurado el activador, el sistema es **100% autónomo**:

1. El script `evaluarPostulacionesPUCV2` se ejecuta con cada formulario enviado.
2. Procesa únicamente la nueva fila.
3. Actualiza `"Evaluación automatizada"`, `"Dashboard"` y `"Lista de Espera"`.
4. La hoja `"Seleccionados"` se preserva sin cambios automáticos.

### Menú de Google Sheets

El menú superior `PUCV2English` ofrece las siguientes opciones:

| Opción | Descripción |
| --- | --- |
| 📊 Evaluar Postulaciones | Ejecuta la evaluación manual de postulaciones pendientes |
| 🔄 Reevaluar Todo desde Cero | **Borra** evaluaciones y selecciones y recalcula todo desde cero (hazlo antes de registrar aceptaciones o pagos) |
| 📋 Generar Lista Final | Crea la hoja `"Lista Final Curso"` |
| 🔄 Regenerar Lista de Espera | Regenera la lista de espera sin afectar seleccionados |
| 👤 Promover desde Lista de Espera | Mueve al candidato seleccionado de la lista de espera a seleccionados |
| ⚠️ Restaurar Hoja Seleccionados | Recupera los datos de seleccionados en caso de pérdida |
| ⚙️ Configurar Pesos | Abre el sidebar para ajustar los parámetros de ponderación |
| 👁️ Revisar Postulaciones | Abre el sidebar de revisión de certificados |
| 👤 Promover Candidato Activo | Desde `Evaluación automatizada`, promueve a Seleccionados a la persona de la fila activa (también a un `NO ELEGIBLE`, dejando sus observaciones en `Comentarios`) |
| 📈 Ver Dashboard | Abre el panel de control web |
| 📉 Ver Análisis de Equilibrio | Muestra el reparto de seleccionados por categoría |
| ⚙️ Forzar Autorización | Solicita los permisos de Apps Script |

**Submenú 📧 Enviar Correos:**

| Opción | Descripción |
| --- | --- |
| ✅ Seleccionados | Envía invitaciones a candidatos con certificado válido |
| 🧪 Test de Nivel | Notifica a candidatos que deben rendir prueba de nivelación |
| 💎 Hand Picked | Invita a candidatos seleccionados manualmente |
| ⏳ Lista de Espera | Notifica ingreso a la lista de espera |
| ⏳ Cierre Lista de Espera (Sin Cupo) | Notifica cierre definitivo del proceso a la lista de espera |
| ❌ No Seleccionados | Envía correos de rechazo (excluye seleccionados y lista de espera) |
| 🔄 Continuación (Año Anterior) | Invita a estudiantes del año anterior elegibles para continuar |
| ❌ Rechazo por Nivel Insuficiente | Notifica a quienes no alcanzan el nivel mínimo |
| 👁️ Vista Previa Siguiente | Muestra el próximo candidato de la lista de espera |
| ✉️ Enviar Correo de Prueba | Envía un correo de prueba a una dirección específica |
| 🏫 Inicio de Clases | Abre el diálogo de asignación de salas y envío de bienvenida |

**Submenú 🧪 Prueba de Nivel (CEPT):**

| Opción | Descripción |
| --- | --- |
| 🔄 Sincronizar Candidatos a Test | Copia candidatos elegibles (`Test de nivel` + `Acepta` + `Pagado`) a la hoja `"Prueba de Nivel"` |
| 📧 Enviar Credenciales Iniciales | Abre diálogo para configurar URL del CEPT y enviar credenciales por primera vez |
| 🔔 Enviar Recordatorios | Envía recordatorio a candidatos que aún no han completado el test |
| ✉️ Enviar Nuevos Códigos | Reenvía credenciales actualizadas a candidatos que lo solicitan |

### Gestión de Seleccionados

1. Ve a la hoja **`Seleccionados`**.
2. Revisa y verifica los certificados usando la columna `Verificación Certificado`.
3. Ajusta el `Nivel Asignado` si corresponde.
4. Monitorea la columna `Aceptación` (se actualiza automáticamente al responder el correo).
5. Registra el estado de pago en la columna `Pago Matrícula` (`Pagado`/`Pendiente`).

### Promoción desde Lista de Espera

1. Ve a la hoja **`Lista de Espera`**.
2. Selecciona la fila del candidato que deseas promover.
3. Haz clic en `PUCV2English` > `👤 Promover desde Lista de Espera`.
4. Confirma la promoción. El candidato se moverá a `"Seleccionados"` y se eliminará de la lista de espera.

---

## 🧩 Lógica de Puntuación

El puntaje total es la suma de varias áreas, con pesos ajustables desde la hoja `Configuración`:

Siguiendo las bases de la convocatoria, la evaluación tiene dos partes: un filtro de elegibilidad y una pauta de puntaje.

**1. Elegibilidad (n.º 4, 5.1 y 5.2).** Nadie se excluye de la evaluación: quien incumple se evalúa y puntúa igual, pero queda con `NO ELEGIBLE: <todos los motivos>` en `Observaciones` (hoja `Evaluación automatizada`) y en `Estado de Procesamiento` (hoja de respuestas), y no entra a `Seleccionados` ni a la lista de espera. La coordinación decide caso a caso. Se exige:

- Disponibilidad para todo el horario (lunes, miércoles y jueves 17:45–18:55) y sin compromisos que lo impidan.
- Compromiso de asistir al menos al 80 % de las sesiones.
- Las 7 declaraciones del formulario aceptadas (`DECLARACIONES_REQUERIDAS` en `Config.ts`).
- Ningún impedimento: no haber reprobado un curso PUCV2English, no haber renunciado a la beca después de la primera semana, no haber cursado C1 ni completado dos cursos del programa.
- Estudiantes: matrícula vigente y, en pregrado, sin cursos obligatorios de inglés del PILE pendientes (si la carrera no tiene cursos de inglés, se evalúa igual y el nivel se verifica en la prueba).
- Con más de una postulación del mismo correo se considera la primera enviada.

**Ramificación del formulario (según el vínculo con la PUCV).** El vínculo (sección 3) decide qué secciones responde cada persona; lo que no se pregunta queda vacío y no puntúa:

| Vínculo | Secciones que responde |
|---|---|
| Pregrado | 1-3, **4 (año de ingreso, matrícula, PILE)**, **6 (internacionalización)**, 7, 8 |
| Postgrado y académico | 1-3, **6 (internacionalización)**, 7, 8 |
| Funcionario | 1-3, **5 (labor profesional)**, 7, 8 (no responde internacionalización) |
| Alumni | 1-3 y termina: no responde año de ingreso, labor, internacionalización, nivel ni declaraciones |

Consecuencias: el *año de ingreso* solo puntúa en pregrado; el *uso del inglés* y el *respaldo de la jefatura* solo puntúan a funcionarios (los académicos no ven la sección 5); la *internacionalización* no puntúa a funcionarios. Los alumni quedan con `Observaciones` indicando que el formulario no los evalúa, sin nivel postulado y sin cupo automático (la coordinación los gestiona aparte, n.º 4).

**Texto libre.** Puntúan cuatro preguntas con texto escrito: el "Otro:" de *planes de internacionalización*, el de *documentos que respaldan el proceso*, el de *actividades en inglés* (funcionarios) y las *descripciones abiertas* de funcionarios (situaciones, proyectos y contribución del inglés). El análisis normaliza el texto (minúsculas, sin tildes), separa las opciones oficiales de lo escrito, descarta respuestas negadas ("no", "ninguno", "sin…", "aún no…") y reconoce cada categoría por familias léxicas (por ejemplo, doctorado, magíster, máster y posgrado cuentan como postgrado). Un "Otro:" que no encaja en ninguna categoría suma el puntaje de "otro" solo si menciona algo internacional o formativo. Cada categoría suma una sola vez. En las descripciones abiertas cada una de 5 familias de evidencia (uso oral, escrito, colaboración internacional, proyectos, contexto académico) suma 0,2 hasta 1 punto: escribir más largo o repetir no suma más. Documentos de respaldo: gana la evidencia más fuerte (carta de aceptación 1, postulación enviada o carta de invitación 0,75, contactos 0,5, programa identificado 0,25; máx. 1 con un bono de 0,25 por adjuntar archivo). Las familias están en `Evaluacion.ts` y se prueban con `node tests/texto-libre.test.js` después de `npm run build`. La puntuación léxica no reemplaza la revisión humana: favorece, en parte, a quien redacta con más detalle, por eso su peso es acotado.

**Máximo equivalente por vínculo.** Cada vínculo responde preguntas distintas, pero todos pueden llegar al mismo máximo de **11 puntos** antes de Disponibilidad y Compromiso, que suman 2 × su peso (pregrado +2, postgrado +3, funcionario y académico +4): pregrado (Tipo 1 + Internacionalización 5 + Año 2 + Nivel 3), postgrado (Tipo 1.5 + Internacionalización 5 × 1.3 + Nivel 3), académico (Tipo 2 + base 1 + Internacionalización 5 + Nivel 3) y funcionario (Tipo 2 + Uso 4 × 0.75 + Carta 3 + Nivel 3). Año de ingreso "Antes del 2020" puntúa 0 a propósito.

**2. Pauta de puntaje (n.º 7.2).** Los criterios y su peso relativo:

- **Proyección internacional (importancia alta, máx 5 pts):** etapa + planes + respaldo. *Etapa* (de mayor a menor): `Ya aceptado/a` 3.5, `En proceso de postulación` 2.5, `Con plan concreto para próximo año` 1.75, `En etapa de planificación` 1, `Interés general` 0. *Planes* (suman cada uno, tope 1.5): postgrado 1, doble titulación e intercambio 0.8, pasantía 0.6, práctica profesional y proyecto de investigación 0.5, curso corto 0.4, congreso 0.3, otro 0.2. *Respaldo* (gana la evidencia más fuerte, tope 1): carta de aceptación 1, postulación enviada y carta de invitación 0.75, contactos 0.5, programa identificado 0.25, más 0.25 por adjuntar archivo. Pregrado con etapa, plan o respaldo reconocibles: +0.5. Tope total 5; luego se multiplica por el peso del perfil (postgrado 1.3).
- **Vínculo y etapa (media):** tipo de vínculo (máx 2: `Académico/Funcionario` 2, `Postgrado` 1.5, otros 1) y, solo en pregrado, año de ingreso (máx 2): desde el 3.er año de la carrera 2 pts, 2.º año 0.5, 1.er año 0. El año del programa sale de `FECHA_INICIO`.
- **Nivel de inglés (media, máx 3 pts):** certificado Cambridge declarado: B2 = 3, B1 = 2. Sin certificado Cambridge pero con un documento adjunto = 1 (puntaje base; la coordinación lo verifica y puede quitarlo). Sin certificado ni adjunto = 0.
- **Uso del inglés en las funciones (media-alta, máx 4 pts):** solo funcionarios, ×0.75: frecuencia (máx 1.5) + actividades (máx 1) + proyectos futuros "Sí" (0.5) + descripciones abiertas (máx 1). Los académicos no ven esta sección y reciben 1 punto base fijo.
- **Respaldo de la jefatura (máx 3 pts):** solo funcionarios: respaldo (1) + carta adjunta (1), multiplicado por el peso 1.5.

**Disponibilidad y compromiso puntúan con un punto base × peso del perfil** (comprometerse cuesta más fuera del pregrado): pregrado 1, postgrado 1.5, funcionario y académico 2, para cada una de las dos columnas. `Puntaje Disponibilidad` = horario disponible y sin compromisos que lo impidan. `Puntaje Compromiso` = 80 % de asistencia, conocimiento de las 4 horas de estudio autónomo y declaración n.º 2 aceptada. Quien no cumple obtiene 0 en esa columna, y si además incumple un requisito igual se evalúa, pero queda con `NO ELEGIBLE: <motivos>` en `Observaciones` y no entra a los cupos de Seleccionados ni a la lista de espera. Los pesos están en `Config.ts` (`Disponibilidad`, `Compromiso`).

**3. Prioridades y desempate.**

- **Alumni** (n.º 4): puntaje 0; solo acceden a un cupo si no quedan elegibles de la comunidad activa pendientes.
- **Empate** (n.º 7.5): académicos y estudiantes de postgrado, luego funcionarios, luego pregrado, y por último quien postuló primero.
- **Cupos de convocatoria abierta** (n.º 3): B1+ 25; B2.1, B2.2 y C1 15 cada uno. Los otros 10 cupos de esos niveles son de continuidad, por invitación, y no los asigna esta pauta.

> La pauta ordena; la selección la hace la coordinación al revisar cada caso (n.º 7.1). El nivel del formulario es una solicitud: el nivel de ingreso lo asigna la coordinación según el n.º 6.
> Preguntas que no puntúan: fecha de nacimiento, teléfono, carrera, unidad, cargo, antigüedad, y nivel y semestre cursados antes. Las descripciones abiertas solo puntúan en funcionarios (ver *Texto libre*).
> Los encabezados de la hoja de respuestas deben coincidir exactamente con `CONFIG.COLUMNS` (`src/Config.ts`). Una columna no encontrada puntúa como vacía sin avisar.
> La hoja `Configuración` se crea sola con los valores por defecto la primera vez que se abre `⚙️ Configurar Pesos`; "Restaurar" la borra y la vuelve a crear. El sidebar edita pesos por perfil, topes y fechas; los puntajes de planes, etapas, respaldos y actividades se editan en `Config.ts`. Si la hoja `Configuración` ya existe, sus valores pisan los de código. Para esta convocatoria revisa ahí que `FECHA_INICIO` sea 22 de marzo de 2027 (de ella sale el año del programa), `FECHA_TERMINO`, `FECHA_LIMITE`, `TEST_FECHA` y que el peso de Carta de Respaldo para Funcionario y Académico sea 1.5.
