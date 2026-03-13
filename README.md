# PUCV2English v5.0 — Sistema de Gestión Automatizada

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script-green.svg)](https://developers.google.com/apps-script)

**PUCV2English** es un ecosistema modular desarrollado en **TypeScript** para la gestión profesional de postulaciones al Programa de Inglés PUCV. El sistema automatiza el ciclo completo: desde la evaluación masiva con criterios ponderados, hasta la gestión de matrícula vía dashboard y la comunicación automatizada con los postulantes.

> **Novedad v5.0:** Migración completa de monolito JavaScript (1.6k loc) a arquitectura modular profesional tipado estricto.

---

## ✨ Características Principales

    -   **`1. Evaluar Nuevas Postulaciones`**: Ejecuta el proceso de evaluación manualmente. La interfaz se refrescará sola al terminar.
    -   **`2. Generar Lista Final del Curso`**: Crea la lista definitiva de participantes que han aceptado.
    -   **`3. Enviar Notificaciones`**: Envía los correos de selección a los candidatos.
    -   **Tablas de Gestión:** Revisa los certificados y actualiza el estado de los postulantes directamente desde la web.

---

## 🧩 Lógica de Puntuación

El puntaje total es la suma de varias áreas, con pesos ajustables desde la hoja `Configuración`.

- **Disponibilidad (máx 4 pts):** 1 punto por cada respuesta afirmativa a preguntas de compromiso.
- **Tipo de Postulante (máx 2 pts):** `Académico/Funcionario` (2), `Postgrado` (1.5), `Otro` (1).
- **Uso del Inglés (ponderado):** Lógica diferenciada que premia aspiraciones en pregrado y actividades de investigación/docencia en académicos/postgrado.
- **Internacionalización (ponderado):** Asigna puntaje según la etapa del proceso y análisis de palabras clave.
- **Nivel de Inglés (máx 5 pts):** Mapea certificaciones (C1, B2.2, etc.) a un puntaje.
- **Año de Ingreso (máx 2 pts):** Premia a estudiantes a mitad de carrera y a profesionales con mayor antigüedad.
- **Compromiso (máx 3 pts):** 1 punto por cada declaración de compromiso aceptada.
- **Carta de Respaldo (ponderado):** Evalúa el respaldo de la jefatura y la adjunción de documentos, con menor peso para estudiantes.
  - Disponibilidad, compromiso y veracidad.
  - Tipo de postulante (académico, funcionario, postgrado, etc.).
  - Frecuencia y tipo de uso del inglés en el ámbito profesional.
  - Planes y estado de procesos de internacionalización.
  - Nivel de certificación de inglés y año de ingreso.

### 📈 **Visualización de Datos y Ranking**

- **Dashboard Dinámico:** Genera y actualiza en tiempo real la hoja `Dashboard` con:
  - **Métricas Generales:** Total de postulantes, puntaje promedio, máximo y mínimo.
  - **Desgloses Detallados:** Estadísticas por categoría, sede y año de ingreso.
  - **Análisis Cruzado:** Relación Sede vs. Categoría.
  - **Gráfico Interactivo:** Distribución de postulantes por sede.
- **Ranking de Seleccionados:** Crea y ordena la hoja `Seleccionados` con el **Top 25** de postulantes.
  - **Columnas de Gestión:** Incluye campos para `Verificación Certificado` y `Nivel Asignado`.
  - **Estado Interactivo:** Añade una columna `Aceptación` con menú desplegable (`Acepta`, `Rechaza`, `Pendiente`) y formato condicional que colorea la fila según el estado.

### 🛡️ **Optimización y Robustez**

- **Procesamiento Incremental:** Utiliza una columna `Estado de Procesamiento` para marcar las filas ya evaluadas. Esto evita trabajo redundante y hace que el script sea altamente eficiente, procesando solo las postulaciones nuevas.
- **Manejo de Errores por Fila:** Implementa bloques `try...catch` que aíslan los errores. Si una fila contiene datos incorrectos, la marca con un mensaje de error y continúa con las demás, asegurando que el script nunca se detenga por una sola postulación defectuosa.
- **Control de Concurrencia:** Usa `LockService` para prevenir que ejecuciones simultáneas (ej. si llegan varias postulaciones a la vez) corrompan los datos, garantizando la integridad de la información.

### ✉️ **Flujo de Trabajo Integrado**

- **Notificaciones por Correo:** Incluye una función para enviar correos de notificación a todos los postulantes que aparecen en la hoja `Seleccionados`, con un cuadro de diálogo de confirmación para evitar envíos accidentales.
- **Panel de Control Web:** Proporciona una interfaz de usuario a través de una aplicación web privada para ejecutar manualmente funciones clave como el análisis del ranking y el envío de notificaciones, solucionando problemas de ejecución en entornos con múltiples cuentas de Google.

---

## ⚙️ Arquitectura del Script

    -   El código está estructurado para ser modular, mantenible y robusto.
    -   **`CONFIG` (Objeto Global):** Centraliza todos los nombres de hojas y columnas importantes en un único objeto. Esto facilita enormemente el mantenimiento: si se renombra una hoja, solo hay que cambiarlo en un lugar.

```javascript
    const CONFIG = {
      SHEET_ID: "ID_DE_TU_HOJA",
      SHEETS: {
        INPUT: "Respuestas de formulario 1",
        OUTPUT: "Evaluación automatizada",
        DASHBOARD: "Dashboard",
        SELECTED: "Seleccionados"
      },
      // ...
    };
```

- **`evaluarPostulacionesPUCV2()` (Función Principal):** Orquesta todo el proceso.
    1. **Bloqueo (`LockService`):** Adquiere un bloqueo para garantizar una única ejecución.
    2. **Lectura de Datos:** Obtiene todas las filas de la hoja de respuestas.
    3. **Iteración y Procesamiento:** Recorre cada fila, omitiendo las ya procesadas. Dentro de un bloque `try...catch`:
        - Calcula los puntajes parciales usando funciones auxiliares (`calcularPuntaje...`).
        - Suma los puntajes y almacena el resultado.
        - Marca la fila como procesada con la fecha actual.
    4. **Escritura de Resultados:** Limpia y escribe los datos en la hoja `Evaluación automatizada`.
    5. **Generación de Hojas Derivadas:** Llama a las funciones para crear/actualizar el `Dashboard` y la lista de `Seleccionados`.
    6. **Liberación del Bloqueo:** Libera el bloqueo para permitir futuras ejecuciones.

- **Funciones de Cálculo (`calcularPuntaje...`):** Cada criterio de puntuación (tipo de postulante, uso de inglés, etc.) tiene su propia función. Esto aísla la lógica y facilita su modificación.

- **Funciones del Dashboard (`generarYActualizarDashboard`, `calcularEstadisticas`):** Un conjunto de funciones modulares se encarga de calcular todas las métricas y de construir la hoja del dashboard, incluyendo el gráfico.

- **`doGet()` y Funciones de Web App:** El script implementa una aplicación web simple (`doGet`) que sirve como panel de control para ejecutar manualmente las tareas administrativas.

---

## 🚀 Guía de Instalación y Configuración

Sigue estos pasos para poner en marcha el sistema.

### **Paso 1: Crear un Script Independiente**

1. **Crear Hoja de Cálculo:** Crea un nuevo **Google Sheet**. Este será tu centro de operaciones.
2. **Crear Formulario:** Crea un **Google Form** para recibir las postulaciones.
3. **Vincular Formulario:** Dentro del formulario, ve a la pestaña "Respuestas" y haz clic en el icono de Google Sheets para vincularlo a la hoja que creaste. Las respuestas se guardarán en una nueva pestaña, normalmente llamada `Respuestas de formulario 1`.
4. **Obtener el ID de la Hoja:** Copia el ID de tu hoja de cálculo desde la URL. Lo necesitarás más adelante. La URL tiene el formato: `https://docs.google.com/spreadsheets/d/`**AQUÍ_VA_EL_ID**`/edit`.

### **Paso 2: Configurar la Hoja de Respuestas**

1. En la hoja `Respuestas de formulario 1`, ve a la primera columna vacía a la derecha.
2. Nombra el encabezado de esta nueva columna exactamente: `Estado de Procesamiento`.
    > **Importante:** El nombre debe ser idéntico. El script usará esta columna para saber qué filas ya ha procesado.

### **Paso 3: Instalar el Script**

1. En tu Google Sheet, ve a `Extensiones` > `Apps Script`. Se abrirá el editor de código.
2. Ve a la página de inicio de Google Apps Script: script.google.com.
3. Haz clic en **Nuevo proyecto**.
4. Borra cualquier código de ejemplo que aparezca.
5. Ejecuta `npm run build` en la carpeta raíz del proyecto de manera local. Esto generará la carpeta `dist`.
6. Copia todo el contenido de los archivos JS en la carpeta `dist` y pégalos en nuevos archivos correspondientes dentro de tu nuevo proyecto (asegurando ponerle el mismo nombre). Haz lo mismo con los archivos HTML en la carpeta `src`.
7. **Configura el ID de tu Hoja:** En el archivo `Config.gs` (o `Config.js`), localiza esta línea al inicio del script:

```javascript
    const CONFIG = {
      SHEET_ID: "ID_DE_TU_HOJA",
      // ...
    };
```

    Reemplaza `"ID_DE_TU_HOJA"` con el ID que copiaste en el Paso 1.
8. Guarda el proyecto (icono de disquete 💾).

### **Paso 4: Configurar el Activador (Trigger)**

Para que el script se ejecute automáticamente con cada nueva postulación, necesitas un activador.

1. En el editor de Apps Script, haz clic en el icono de **Activadores** (reloj ⏰) en el panel izquierdo.
2. Haz clic en **+ Añadir activador** en la esquina inferior derecha.
3. Configúralo con las siguientes opciones:
    - **Función que se debe ejecutar:** `evaluarPostulacionesPUCV2`
    - **Implementación que se debe ejecutar:** `Principal`
    - **Selecciona la fuente del evento:** `Desde una hoja de cálculo`
    - **Selecciona el tipo de evento:** `Al enviar un formulario`
4. Haz clic en **Guardar**.
5. **Autorizar Permisos:** Google te pedirá que autorices los permisos para que el script pueda modificar tus hojas de cálculo y ejecutarse automáticamente. Concede los permisos necesarios.

---

### **Paso 5: Implementar el Panel de Control Web**

Para las tareas manuales, usarás una aplicación web privada.

1. En el editor de Apps Script, haz clic en el botón azul **Implementar** y selecciona **Nueva implementación**.
2. Haz clic en el icono de engranaje (⚙️) y selecciona **Aplicación web**.
3. Configura las siguientes opciones:
    - **Descripción:** `Panel de Control de Evaluación PUCV`.
    - **Ejecutar como:** `Yo (tu.correo@electronico.com)`.
    - **Quién tiene acceso:** `Solo yo`.
4. Haz clic en **Implementar**.
5. **Autoriza los permisos** cuando se te solicite.
6. **Copia la URL de la aplicación web** que se te proporciona. Guárdala en tus marcadores. Esta URL es tu panel de control para las tareas manuales.

---

## 🛠️ Modo de Uso

### Ejecución Automática

Una vez configurado el activador, el sistema es **100% autónomo**. Cada vez que un usuario envíe el formulario:

1. El script `evaluarPostulacionesPUCV2` se ejecutará.
2. Procesará **únicamente la nueva fila**.
3. Añadirá el resultado a la hoja `Evaluación automatizada`.
4. Regenerará por completo las hojas `Dashboard` y `Seleccionados`.
5. Marcará la fila en `Respuestas de formulario 1` como procesada.

### Ejecución Manual

Puedes ejecutar análisis o enviar notificaciones desde tu panel de control web.

1. **Abre la URL de la aplicación web** que guardaste durante la implementación.
    > **⚠️ ¡Importante si usas múltiples cuentas de Google!**
    > Debido a un bug conocido de Google, debes abrir esta URL en una **ventana de incógnito** o en un perfil de navegador donde **únicamente** hayas iniciado sesión con la cuenta propietaria del script. De lo contrario, podrías ver un error de "No se puede abrir el archivo".

2. Usa los botones en la página:
    - **`Analizar Equilibrio del Ranking`**: Ejecuta la función de análisis y muestra un reporte detallado directamente en la página.
    - **`Enviar Notificaciones a Seleccionados`**: Ejecuta la función de envío de correos. La página te pedirá una confirmación antes de proceder.

### Gestión de Seleccionados

1. Ve a la hoja **`Seleccionados`**.
2. Revisa el Top 25 de postulantes.
3. Usa las columnas `Verificación Certificado` y `Nivel Asignado` para tus anotaciones.
4. Cuando un postulante confirme, cambia el estado en la columna `Aceptación`. La fila cambiará de color automáticamente para una mejor visualización.

---

## 🧩 Lógica de Puntuación

El puntaje total es la suma de varias áreas. La lógica está centralizada en el objeto `SCORING_PARAMS` y en funciones de cálculo específicas para facilitar su ajuste.

- **Disponibilidad (máx 4 pts):** 1 punto por cada respuesta afirmativa a preguntas de compromiso de tiempo.
- **Tipo de Postulante (máx 2 pts):** `Académico/Funcionario` (2), `Postgrado` (1.5), `Otro` (1).
- **Uso del Inglés (máx 4 pts):** Pondera frecuencia, tipo de actividades y análisis de palabras clave en respuestas abiertas.
- **Internacionalización (máx 5 pts):** Asigna puntaje según la etapa del proceso (ej. "carta de aceptación" otorga más puntos) y análisis de palabras clave sobre sus planes.
- **Nivel de Inglés (máx 5 pts):** Mapea certificaciones (C1, B2.2, etc.) a un puntaje.
- **Año de Ingreso (máx 2 pts):** Da más puntaje a años de ingreso más recientes.
- **Compromiso (máx 3 pts):** 1 punto por cada declaración de compromiso aceptada.
- **Carta de Respaldo (máx 3 pts):** Evalúa el respaldo de la jefatura y la adjunción de documentos.
