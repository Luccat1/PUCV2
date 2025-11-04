# Sistema Automatizado de Evaluación de Postulaciones PUCV

Este proyecto de **Google Apps Script** automatiza integralmente el proceso de evaluación de postulaciones para el Programa de Inglés de la PUCV. El sistema transforma las respuestas de un **Google Form** en un completo sistema de análisis, ranking y gestión.

Lee postulaciones, calcula puntajes ponderados con base en criterios complejos, genera un ranking de seleccionados, crea un dashboard con métricas clave y facilita la comunicación masiva, optimizando drásticamente el flujo de trabajo administrativo.

---

## 📋 Tabla de Contenidos

1.  [✨ Características Principales](#-características-principales)
2.  [⚙️ Arquitectura del Script](#️-arquitectura-del-script)
3.  [🚀 Guía de Instalación y Configuración](#-guía-de-instalación-y-configuración)
4.  [🛠️ Modo de Uso](#️-modo-de-uso)
5.  [🧩 Lógica de Puntuación](#-lógica-de-puntuación)

---

## ✨ Características Principales

### 📊 **Motor de Evaluación y Puntuación**
-   **Evaluación Automatizada:** Procesa cada nueva postulación y calcula un puntaje total ponderado.
-   **Lógica de Puntuación Compleja:** Asigna puntos basados en múltiples criterios, incluyendo:
    -   Disponibilidad, compromiso y veracidad.
    -   Tipo de postulante (académico, funcionario, postgrado, etc.).
    -   Frecuencia y tipo de uso del inglés en el ámbito profesional.
    -   Planes y estado de procesos de internacionalización.
    -   Nivel de certificación de inglés y año de ingreso.

### 📈 **Visualización de Datos y Ranking**
-   **Dashboard Dinámico:** Genera y actualiza en tiempo real la hoja `Dashboard` con:
    -   **Métricas Generales:** Total de postulantes, puntaje promedio, máximo y mínimo.
    -   **Desgloses Detallados:** Estadísticas por categoría, sede y año de ingreso.
    -   **Análisis Cruzado:** Relación Sede vs. Categoría.
    -   **Gráfico Interactivo:** Distribución de postulantes por sede.
-   **Ranking de Seleccionados:** Crea y ordena la hoja `Seleccionados` con el **Top 25** de postulantes.
    -   **Columnas de Gestión:** Incluye campos para `Verificación Certificado` y `Nivel Asignado`.
    -   **Estado Interactivo:** Añade una columna `Aceptación` con menú desplegable (`Acepta`, `Rechaza`, `Pendiente`) y formato condicional que colorea la fila según el estado.

### 🛡️ **Optimización y Robustez**
-   **Procesamiento Incremental:** Utiliza una columna `Estado de Procesamiento` para marcar las filas ya evaluadas. Esto evita trabajo redundante y hace que el script sea altamente eficiente, procesando solo las postulaciones nuevas.
-   **Manejo de Errores por Fila:** Implementa bloques `try...catch` que aíslan los errores. Si una fila contiene datos incorrectos, la marca con un mensaje de error y continúa con las demás, asegurando que el script nunca se detenga por una sola postulación defectuosa.
-   **Control de Concurrencia:** Usa `LockService` para prevenir que ejecuciones simultáneas (ej. si llegan varias postulaciones a la vez) corrompan los datos, garantizando la integridad de la información.

### ✉️ **Flujo de Trabajo Integrado**
-   **Notificaciones por Correo:** Incluye una función para enviar correos de notificación a todos los postulantes que aparecen en la hoja `Seleccionados`, con un cuadro de diálogo de confirmación para evitar envíos accidentales.
-   **Interfaz de Usuario en Google Sheets:** Añade un menú personalizado (`Evaluación PUCV`) para ejecutar manualmente las funciones principales, como la re-evaluación completa o el envío de notificaciones.

---

## ⚙️ Arquitectura del Script

El código está estructurado para ser modular, mantenible y robusto.

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

-   **`evaluarPostulacionesPUCV2()` (Función Principal):** Orquesta todo el proceso.
    1.  **Bloqueo (`LockService`):** Adquiere un bloqueo para garantizar una única ejecución.
    2.  **Lectura de Datos:** Obtiene todas las filas de la hoja de respuestas.
    3.  **Iteración y Procesamiento:** Recorre cada fila, omitiendo las ya procesadas. Dentro de un bloque `try...catch`:
        -   Calcula los puntajes parciales usando funciones auxiliares (`calcularPuntaje...`).
        -   Suma los puntajes y almacena el resultado.
        -   Marca la fila como procesada con la fecha actual.
    4.  **Escritura de Resultados:** Limpia y escribe los datos en la hoja `Evaluación automatizada`.
    5.  **Generación de Hojas Derivadas:** Llama a las funciones para crear/actualizar el `Dashboard` y la lista de `Seleccionados`.
    6.  **Liberación del Bloqueo:** Libera el bloqueo para permitir futuras ejecuciones.

-   **Funciones de Cálculo (`calcularPuntaje...`):** Cada criterio de puntuación (tipo de postulante, uso de inglés, etc.) tiene su propia función. Esto aísla la lógica y facilita su modificación.

-   **Funciones del Dashboard (`generarYActualizarDashboard`, `calcularEstadisticas`):** Un conjunto de funciones modulares se encarga de calcular todas las métricas y de construir la hoja del dashboard, incluyendo el gráfico.

-   **`onOpen()` y `enviarNotificacionesSeleccionados()`:** Funciones que gestionan la interacción con el usuario (menú y envío de correos).

---

## 🚀 Guía de Instalación y Configuración

Sigue estos pasos para poner en marcha el sistema.

### **Paso 1: Preparar Google Sheets y Forms**
1.  **Crear Hoja de Cálculo:** Crea un nuevo **Google Sheet**. Este será tu centro de operaciones.
2.  **Crear Formulario:** Crea un **Google Form** para recibir las postulaciones.
3.  **Vincular Formulario:** Dentro del formulario, ve a la pestaña "Respuestas" y haz clic en el icono de Google Sheets para vincularlo a la hoja que creaste. Las respuestas se guardarán en una nueva pestaña, normalmente llamada `Respuestas de formulario 1`.

### **Paso 2: Configurar la Hoja de Respuestas**
1.  En la hoja `Respuestas de formulario 1`, ve a la primera columna vacía a la derecha.
2.  Nombra el encabezado de esta nueva columna exactamente: `Estado de Procesamiento`.
    > **Importante:** El nombre debe ser idéntico. El script usará esta columna para saber qué filas ya ha procesado.

### **Paso 3: Instalar el Script**
1.  En tu Google Sheet, ve a `Extensiones` > `Apps Script`. Se abrirá el editor de código.
2.  Borra cualquier código de ejemplo que aparezca.
3.  Copia todo el contenido del archivo `PUCV2.js` y pégalo en el editor.
4.  **Configura el ID de tu Hoja:** Localiza esta línea al inicio del script:
    ```javascript
    const SHEET_ID = "1ohh906fh213G8K0MRhMjlxQFlRXctq97rhw3ply7NQ8";
    ```
    Reemplaza el ID de ejemplo con el ID de tu propia hoja de cálculo. Lo puedes obtener de la URL:
    `https://docs.google.com/spreadsheets/d/`**AQUÍ_VA_EL_ID**`/edit`
5.  Guarda el proyecto (icono de disquete 💾).

### **Paso 4: Configurar el Activador (Trigger)**
Para que el script se ejecute automáticamente con cada nueva postulación, necesitas un activador.

1.  En el editor de Apps Script, haz clic en el icono de **Activadores** (reloj ⏰) en el panel izquierdo.
2.  Haz clic en **+ Añadir activador** en la esquina inferior derecha.
3.  Configúralo con las siguientes opciones:
    -   **Función que se debe ejecutar:** `evaluarPostulacionesPUCV2`
    -   **Implementación que se debe ejecutar:** `Principal`
    -   **Selecciona la fuente del evento:** `Desde una hoja de cálculo`
    -   **Selecciona el tipo de evento:** `Al enviar un formulario`
4.  Haz clic en **Guardar**.
5.  **Autorizar Permisos:** Google te pedirá que autorices los permisos para que el script pueda modificar tus hojas de cálculo y ejecutarse automáticamente. Concede los permisos necesarios.

---

## 🛠️ Modo de Uso

### Ejecución Automática
Una vez configurado el activador, el sistema es **100% autónomo**. Cada vez que un usuario envíe el formulario:
1.  El script `evaluarPostulacionesPUCV2` se ejecutará.
2.  Procesará **únicamente la nueva fila**.
3.  Añadirá el resultado a la hoja `Evaluación automatizada`.
4.  Regenerará por completo las hojas `Dashboard` y `Seleccionados`.
5.  Marcará la fila en `Respuestas de formulario 1` como procesada.

### Ejecución Manual
Puedes forzar una re-evaluación o enviar notificaciones desde el menú personalizado.

1.  **Recarga la página** de tu Google Sheet para que aparezca el nuevo menú.
2.  Ve al menú **`Evaluación PUCV`**:
    -   **`Actualizar Evaluación y Dashboard`**: Ejecuta la función principal. Útil si has hecho cambios manuales en las respuestas o para la configuración inicial.
    -   **`Enviar Notificaciones a Seleccionados`**: Ejecuta la función de envío de correos. **Importante:** Pide una confirmación antes de enviar correos masivos.

### Gestión de Seleccionados
1.  Ve a la hoja **`Seleccionados`**.
2.  Revisa el Top 25 de postulantes.
3.  Usa las columnas `Verificación Certificado` y `Nivel Asignado` para tus anotaciones.
4.  Cuando un postulante confirme, cambia el estado en la columna `Aceptación`. La fila cambiará de color automáticamente para una mejor visualización.

---

## 🧩 Lógica de Puntuación

El puntaje total es la suma de varias áreas. La lógica está centralizada en el objeto `SCORING_PARAMS` y en funciones de cálculo específicas para facilitar su ajuste.

-   **Disponibilidad (máx 4 pts):** 1 punto por cada respuesta afirmativa a preguntas de compromiso de tiempo.
-   **Tipo de Postulante (máx 2 pts):** `Académico/Funcionario` (2), `Postgrado` (1.5), `Otro` (1).
-   **Uso del Inglés (máx 4 pts):** Pondera frecuencia, tipo de actividades y análisis de palabras clave en respuestas abiertas.
-   **Internacionalización (máx 5 pts):** Asigna puntaje según la etapa del proceso (ej. "carta de aceptación" otorga más puntos) y análisis de palabras clave sobre sus planes.
-   **Nivel de Inglés (máx 5 pts):** Mapea certificaciones (C1, B2.2, etc.) a un puntaje.
-   **Año de Ingreso (máx 2 pts):** Da más puntaje a años de ingreso más recientes.
-   **Compromiso (máx 3 pts):** 1 punto por cada declaración de compromiso aceptada.
-   **Carta de Respaldo (máx 3 pts):** Evalúa el respaldo de la jefatura y la adjunción de documentos.
