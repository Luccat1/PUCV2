# PUCV2 / PUCV2English v2.5.0 — Sistema de Gestión Automatizada

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script-green.svg)](https://developers.google.com/apps-script)

**PUCV2English** es un ecosistema modular desarrollado en **TypeScript** para la gestión profesional de postulaciones al Programa de Inglés PUCV. El sistema automatiza el ciclo completo: desde la evaluación masiva con criterios ponderados, hasta la gestión de matrícula, lista de espera, control de pagos y comunicación automatizada con los postulantes.

> **Novedades v2.5.0 (Julio 2026):**
> * **Módulo Prueba de Nivel (CEPT)** — Sistema completo para gestionar el Cambridge English Placement Test: sincronización de candidatos, envío de credenciales iniciales, recordatorios y nuevos códigos.
> * **Hoja `"Prueba de Nivel"`** — Hoja automática con credenciales CEPT y control de envíos por checkbox.
> * **Sub-menú `🧪 Prueba de Nivel (CEPT)`** — 4 nuevas opciones de gestión del placement test en el menú.
>
> **Novedades v2.4.0 (Julio 2026):**
> * **Lista de Espera Ampliada**: Hoja física `"Lista de Espera"` con capacidad de hasta 30 candidatos por nivel (120 total).
> * **Control de Pagos**: Columna `"Pago Matrícula"` con dropdown interactivo en `"Seleccionados"`. La Lista Final exige `Acepta` + `Pagado`.
> * **Promoción desde Lista de Espera**: Función de un clic para promover al siguiente candidato de la lista de espera a seleccionados.
> * **Correo de Cierre de Espera**: Nueva plantilla `CorreoEsperaSinCupo` para notificar a la lista de espera cuando el proceso concluye sin vacantes.
> * **Modo Borrador Gmail**: Opción de crear correos como borradores antes de enviarlos realmente para revisión previa.
> * **Seleccionados Protegidos**: La hoja `"Seleccionados"` ya no se sobreescribe al regenerar; las promociones manuales se preservan.
> * **Exclusión Segura**: Los correos de rechazo excluyen automáticamente a seleccionados y lista de espera.
> * **Soporte Bilingüe**: Templates y lógica para ambos programas — PUCV2 (español) y PUCV2English (inglés).
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
- **Ranking de Seleccionados**: Top 15 por nivel (B1+, B2.1, B2.2, C1) con empates resueltos por antigüedad de postulación.
- **Formato Condicional**: Filas coloreadas automáticamente según estado (verde = Acepta, rojo = Rechaza).

### 📋 Gestión de Seleccionados y Lista de Espera
- **Columnas de Gestión Interactivas**: Dropdowns para `Verificación Certificado`, `Nivel Asignado`, `Aceptación` y `Pago Matrícula`.
- **Lista de Espera Física**: Hoja `"Lista de Espera"` con hasta 30 candidatos por nivel, preservando fechas de notificación.
- **Promoción Manual**: Botón para promover al siguiente candidato de la lista de espera a seleccionados con un clic.
- **Protección de Datos**: La hoja `"Seleccionados"` está congelada — las regeneraciones automáticas solo actualizan la lista de espera.
- **Restauración de Emergencia**: Función `restaurarHojaSeleccionadosPerdida` para recuperar datos en caso de pérdida accidental.

### ✉️ Sistema de Correos Automatizados
El sistema soporta **6 tipos de envío masivo** y **2 correos de confirmación automática**:

| Tipo de Lote | Plantilla HTML | Descripción |
|---|---|---|
| `SELECTED` | `CorreoSeleccionado` | Invitación a seleccionados con certificado válido |
| `TEST_LEVEL_ONLY` | `CorreoTestNivel` | Convocatoria a test de nivel para candidatos sin certificado |
| `HAND_PICKED` | `CorreoHandPicked` | Invitación a candidatos seleccionados manualmente fuera de plazo |
| `WAITLIST` | `CorreoListaEspera` | Aviso de ingreso a la lista de espera |
| `WAITLIST_REJECTED` | `CorreoEsperaSinCupo` | Cierre del proceso — sin vacantes disponibles |
| `NO_SELECTED` | `CorreoNoSeleccionado` | Rechazo (excluye automáticamente a seleccionados y lista de espera) |

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

```
src/
├── Config.ts              # Configuración global, tipos e interfaces
├── Evaluacion.ts          # Motor de evaluación y cálculo de puntajes
├── Seleccionados.ts       # Gestión de seleccionados, lista de espera y promoción
├── Correos.ts             # Motor de envío de correos masivos y unitarios
├── ListaFinal.ts          # Generación de la lista final del curso
├── InicioClases.ts        # Notificaciones de inicio de clases
├── Placement.ts           # Cambridge English Placement Test (CEPT) workflow
├── WebApp.ts              # Panel de control web y endpoints de confirmación
├── Dashboard.ts           # Generación del dashboard estadístico
├── Menu.ts                # Menú personalizado de Google Sheets
├── Utils.ts               # Funciones de soporte transversales
├── TestInicioClases.ts    # Tests para inicio de clases
├── CorreoSeleccionado.html
├── CorreoTestNivel.html
├── CorreoHandPicked.html
├── CorreoListaEspera.html
├── CorreoEsperaSinCupo.html
├── CorreoNoSeleccionado.html
├── CorreoConfirmacionAcepta.html
├── CorreoConfirmacionRechaza.html
├── CorreoInicioClases.html
├── CorreoPlacementTest.html   # Correo de credenciales CEPT
├── DialogPlacementConfig.html # Diálogo de configuración del placement test
├── DialogSalas.html
├── DialogConfirmEval.html
├── SidebarConfig.html
├── SidebarRevision.html
├── index.html             # Interfaz del panel de control web
├── appsscript.json
└── tsconfig.json
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
    CONFIG: "Configuración"
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
2. Copia los archivos compilados y las plantillas HTML a la carpeta de producción:
   ```bash
   # Los archivos .js se copian desde dist/ a PUCV2English/
   # Los archivos .html se copian desde src/ a PUCV2English/
   ```

### **Paso 4: Subir a Google Apps Script**

1. En tu Google Sheet, ve a `Extensiones` > `Apps Script`.
2. Crea un archivo nuevo por cada archivo `.js` y `.html` de la carpeta `PUCV2English/`.
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
2. Configura: Ejecutar como `Yo`, Acceso `Solo yo`.
3. Copia la URL generada — este es tu panel de control para tareas manuales.
    > ⚠️ Si usas múltiples cuentas de Google, abre la URL en una ventana de incógnito.

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
|---|---|
| 📊 Evaluar Postulaciones | Ejecuta la evaluación manual de postulaciones pendientes |
| 🔄 Reevaluar Todo desde Cero | Limpia y recalcula todos los puntajes |
| 📋 Generar Lista Final | Crea la hoja `"Lista Final Curso"` |
| 🔄 Regenerar Lista de Espera | Regenera la lista de espera sin afectar seleccionados |
| 👤 Promover desde Lista de Espera | Mueve al candidato seleccionado de la lista de espera a seleccionados |
| ⚠️ Restaurar Hoja Seleccionados | Recupera los datos de seleccionados en caso de pérdida |
| ⚙️ Configurar Pesos | Abre el sidebar para ajustar los parámetros de ponderación |
| 👁️ Revisar Postulaciones | Abre el sidebar de revisión de certificados |
| 📈 Ver Dashboard | Abre el panel de control web |

**Submenú 📧 Enviar Correos:**

| Opción | Descripción |
|---|---|
| ✅ Seleccionados | Envía invitaciones a candidatos con certificado válido |
| 🧪 Test de Nivel | Notifica a candidatos que deben rendir prueba de nivelación |
| 💎 Hand Picked | Invita a candidatos seleccionados manualmente |
| ⏳ Lista de Espera | Notifica ingreso a la lista de espera |
| ⏳ Cierre Lista de Espera (Sin Cupo) | Notifica cierre definitivo del proceso a la lista de espera |
| ❌ No Seleccionados | Envía correos de rechazo (excluye seleccionados y lista de espera) |
| 👁️ Vista Previa Siguiente | Muestra el próximo candidato de la lista de espera |
| ✉️ Enviar Correo de Prueba | Envía un correo de prueba a una dirección específica |
| 🏫 Inicio de Clases | Abre el diálogo de asignación de salas y envío de bienvenida |

**Submenú 🧪 Prueba de Nivel (CEPT):**

| Opción | Descripción |
|---|---|
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

- **Disponibilidad (máx 4 pts):** 1 punto por cada respuesta afirmativa a preguntas de compromiso de tiempo.
- **Tipo de Postulante (máx 2 pts):** `Académico/Funcionario` (2), `Postgrado` (1.5), `Otro` (1).
- **Uso del Inglés (máx 4 pts):** Pondera frecuencia, tipo de actividades y análisis de palabras clave.
- **Internacionalización (máx 5 pts):** Asigna puntaje según la etapa del proceso y análisis de palabras clave.
- **Nivel de Inglés (máx 5 pts):** Mapea certificaciones (C1, B2.2, etc.) a un puntaje.
- **Año de Ingreso (máx 2 pts):** Da más puntaje a años de ingreso más recientes.
- **Compromiso (máx 3 pts):** 1 punto por cada declaración de compromiso aceptada.
- **Carta de Respaldo (máx 3 pts):** Evalúa el respaldo de la jefatura y la adjunción de documentos.
