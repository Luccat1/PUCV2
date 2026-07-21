# Manual del Usuario: Gestión y Operación del Sistema PUCV2English

Este manual describe el flujo de trabajo operacional y explica detalladamente cómo utilizar las hojas de cálculo generadas por los scripts de **PUCV2English** para administrar exitosamente el programa de admisión e inicio de clases.

---

## 🗺️ Mapa de Hojas de Cálculo y su Propósito

El ecosistema de Google Sheets contiene las siguientes pestañas, cada una con un rol bien definido en la administración:

```
[Respuestas de Formulario 1] ──(Evaluar)──> [Evaluación automatizada] ──(Top 15)──> [Seleccionados]
                                                       │                                    │
                                                       │                              [Pago + Acepta]
                                                       │                                    │
                                                       ├───> [Dashboard]                    ▼
                                                       │                          [Lista Final Curso]
                                                       │
                                                        └──(Sgtes 30)──> [Lista de Espera] ──(Promoción)──> [Seleccionados]

[Continuación (datos año anterior)] ──(Filtrado elegibilidad)──> [Correos de Continuación]
```

1.  **`Respuestas de formulario 1` (Entrada de Datos)**:
    *   **Qué es**: Pestaña vinculada directamente al formulario de Google donde se registran las postulaciones entrantes de forma cronológica.
    *   **Cómo usarla**: No se debe modificar manualmente. Solo se debe asegurar que la última columna sea `"Estado de Procesamiento"`. Aquí el script marcará la marca de tiempo de la evaluación, `"DUPLICADO (Ignorado)"` para segundos envíos de la misma persona, o `"INCOMPLETA (Datos insuficientes)"` si falta información esencial (RUT, nombre o correo).
2.  **`Configuración` (Parámetros del Programa)**:
    *   **Qué es**: Hoja que centraliza los pesos de ponderación, URLs, fechas clave y horarios del curso.
    *   **Cómo usarla**: Puedes modificar las celdas de la columna `Peso/Valor` directamente o usar el menú lateral superior `PUCV2English` > `⚙️ Configurar Pesos`.
3.  **`Evaluación automatizada` (Base de Datos Puntajeada)**:
    *   **Qué es**: El listado completo de todos los postulantes evaluados con sus puntajes detallados columna por columna y el `PUNTAJE TOTAL`.
    *   **Cómo usarla**: Es una hoja de lectura. Se refresca automáticamente al evaluar y tiene formato condicional degradado de color (verde es puntaje alto, rojo bajo) para facilitar auditorías de puntuación.
4.  **`Seleccionados` (Tablero de Control Operativo)**:
    *   **Qué es**: La hoja de gestión principal de admisiones. Contiene el **Top 15 por nivel** (máx 60 postulantes) ordenados por puntaje descendente y marca de tiempo en caso de empates, más los candidatos promovidos manualmente.
    *   **⚠️ Protegida**: Esta hoja **no se sobreescribe** al regenerar la lista de espera. Las promociones manuales y los cambios de estado se preservan.
    *   **Cómo usarla**: El administrador interactúa directamente con las siguientes columnas desplegables:
        *   **`Verificación Certificado`**: Elige `"Válido"` (certificado correcto) o `"Test de nivel"` (requiere examen de nivelación).
        *   **`Nivel Asignado`**: El nivel definitivo acordado tras verificar el certificado o rendir el test.
        *   **`Aceptación`**: Muestra `"Pendiente"` por defecto. Cambiará automáticamente a `"Acepta"` o `"Rechaza"` cuando el alumno responda desde el correo.
        *   **`Pago Matrícula`**: Dropdown con valores `"Pagado"` o `"Pendiente"`. Se inicializa como `"Pendiente"` al promover desde la lista de espera.
        *   **`Comentarios`**: Campo libre para anotaciones del administrador (ej. "Promovido de Lista de Espera").
        *   **`Fecha Notificación`**: Registra la hora exacta en que se le envió el correo al postulante, impidiendo envíos duplicados.
5.  **`Lista de Espera` (Candidatos en Espera de Vacante)**:
    *   **Qué es**: Los siguientes **30 candidatos por nivel** (hasta 120 en total) ordenados por puntaje, que no obtuvieron cupo directo pero califican para ser promovidos si se libera una vacante.
    *   **Cómo usarla**:
        *   Para **promover** a alguien: selecciona su fila, luego usa el menú `PUCV2English` > `👤 Promover desde Lista de Espera`. El candidato se moverá a `"Seleccionados"` y se eliminará de la lista de espera automáticamente.
        *   La columna **`Fecha Notificación`** registra cuándo se le avisó que estaba en lista de espera.
        *   La columna **`Fecha Notificación Cierre`** registra cuándo se le avisó que el proceso concluyó sin vacantes.
6.  **`Dashboard` (Estadísticas en Tiempo Real)**:
    *   **Qué es**: Resúmenes estadísticos agregados por nivel, campus, categoría y año de ingreso, junto con un gráfico interactivo.
    *   **Cómo usarla**: Hoja de lectura y reporte gerencial.
7.  **`Lista Final Curso` (Libro de Clases)**:
    *   **Qué es**: Listado definitivo de alumnos listos para iniciar el curso.
    *   **Requisitos de Ingreso**: Solo entran candidatos que cumplan **ambas** condiciones:
        *   `Aceptación` = `"Acepta"`
        *   `Pago Matrícula` = `"Pagado"`
    *   **Cómo usarla**:
        *   La columna `"Pagó (Sí/No)"` se completa automáticamente como `"Sí"` a partir del estado de pago verificado en `"Seleccionados"`.
        *   Registra las salas físicas o virtuales de clases a través del diálogo de inicio de curso.
8.  **`Continuación` (Datos de Estudiantes del Año Anterior)**:
    *   **Qué es**: Hoja para importar los datos del informe de cursos del año anterior. Contiene la información de notas, asistencia y nivel de los estudiantes que podrían continuar al siguiente nivel.
    *   **Columnas del informe** (se pegan directamente): `Name`, `Surname`, `ID`, `Curso`, `Profesor`, `Asistencia`, `Promedio Final`.
    *   **Columnas que se agregan/actualizan**:
        *   `Email`: Se completa con los correos de los estudiantes.
        *   `Fecha Notificación`: Se rellena automáticamente con la marca de tiempo del envío de correo.
        *   `Aceptación`: Se crea y rellena automáticamente con `"Acepta"` o `"Rechaza"` cuando el estudiante hace clic en los botones del correo.
    *   **Criterios de elegibilidad** (filtrados automáticamente por el script):
        *   Asistencia ≥ 80%
        *   Promedio Final ≥ 40 (equivalente a 4.0 en escala 1-7)
        *   Curso con continuación: B1+ → B2.1, B2.1 → B2.2, B2.2 → C1 (C1 se excluye por ser el último nivel)
    *   **Cómo usarla**: Pega los datos del informe, agrega la columna `Email` con los correos, y ejecuta el envío de correos de continuación.

---

## 🔄 Guía Paso a Paso del Ciclo de Admisión

Sigue esta secuencia para operar el programa completo desde el cierre de postulaciones hasta el inicio de las clases:

### Fase 1: Puntuación y Ranking
1.  Una vez cerrado el formulario, ve a la hoja de cálculo.
2.  Si deseas forzar el cálculo de los candidatos que falten por procesar, haz clic en el menú superior **`PUCV2English`** > **`📊 Evaluar Postulaciones`**.
3.  Si detectas inconsistencias históricas o deseas actualizar el ranking tras haber cambiado los pesos de ponderación en la hoja de `Configuración`, haz clic en **`PUCV2English`** > **`🔄 Reevaluar Todo desde Cero`**. Esto limpiará todo el historial de cálculo, eliminará los duplicados y recalculará la lista de seleccionados y el dashboard basándose en las nuevas reglas.

### Fase 2: Auditoría de Certificados
1.  Ve a la hoja **`Seleccionados`**.
2.  Para cada uno de los 60 postulantes listados (15 por nivel), haz clic en el link de la columna `"Enlace Certificado"` para visualizar el documento.
3.  Establece el valor en la columna **`Verificación Certificado`**:
    *   Selecciona **`Válido`** si tiene un certificado C1/B2/B1 que concuerde con el nivel postulado.
    *   Selecciona **`Test de nivel`** si no subió certificado o si es necesario re-evaluarlo en un examen presencial/remoto.

### Fase 3: Lanzamiento de Invitaciones

> **💡 Tip — Modo Borrador:** Antes de enviar correos reales, puedes crear borradores en Gmail para revisar el contenido. Al ejecutar cualquier envío de correos, el sistema pregunta si deseas enviar realmente, crear borradores (todos o solo 5 de muestra), o cancelar.

1.  Haz clic en **`PUCV2English`** > **`📧 Enviar Correos`** > **`✅ Seleccionados`**. Esto enviará el correo de preselección a todos los candidatos marcados como `"Válido"` que no tengan fecha de notificación. Cada correo incluye dos botones únicos (*Aceptar* y *Rechazar*) con tokens de un solo uso.
2.  Haz clic en **`📧 Enviar Correos`** > **`🧪 Test de Nivel`**. Esto notificará a los candidatos con `"Test de nivel"` para que se agenden y rindan el test de clasificación.
3.  *(Opcional)* Si hay personas agregadas manualmente fuera de plazo, envíales la invitación con **`📧 Enviar Correos`** > **`💎 Hand Picked`**.

### Fase 4: Monitoreo de Respuestas y Gestión de Pagos
1.  Espera a que los postulantes hagan clic en los correos. Sus filas en **`Seleccionados`** cambiarán automáticamente:
    *   **Acepta** (Fila verde): El alumno aceptó y recibió un correo de confirmación con link de pago y un plazo dinámico de 3 días.
    *   **Rechaza** (Fila roja): El alumno liberó su cupo.
2.  **Registrar Pagos**: A medida que los alumnos paguen su matrícula, actualiza la columna **`Pago Matrícula`** a `"Pagado"` en la hoja `"Seleccionados"`.
3.  **Promover desde Lista de Espera** (si hay cupos liberados):
    *   Ve a la hoja **`Lista de Espera`**.
    *   Selecciona la fila del candidato que deseas promover (el siguiente mejor puntuado).
    *   Haz clic en **`PUCV2English`** > **`👤 Promover desde Lista de Espera`**.
    *   Confirma la promoción. El candidato aparecerá en `"Seleccionados"` como `"Pendiente"` y será eliminado de la lista de espera.
    *   Envíale el correo con **`📧 Enviar Correos`** > **`✅ Seleccionados`** (o **`🧪 Test de Nivel`** si requiere prueba).

### Fase 4b: Cierre de la Lista de Espera
1.  Una vez concluido el período de matrícula, si quedan candidatos en la lista de espera que no pudieron ser promovidos, haz clic en **`📧 Enviar Correos`** > **`⏳ Cierre Lista de Espera (Sin Cupo)`**.
2.  Esto enviará el correo `CorreoEsperaSinCupo` a todos los candidatos de la lista de espera que no hayan recibido previamente esta notificación, y registrará la fecha en la columna `"Fecha Notificación Cierre"`.

### Fase 4c: Continuación de Estudiantes del Año Anterior
1.  Obtener el informe de notas y asistencia del año anterior (proporcionado por los profesores).
2.  Crear la hoja **`"Continuación"`** en el spreadsheet y pegar los datos del informe (columnas: `Name`, `Surname`, `ID`, `Curso`, `Profesor`, `Asistencia`, `Promedio Final`).
3.  Agregar la columna **`Email`** y rellenar manualmente los correos electrónicos de los estudiantes.
4.  Agregar la columna **`Fecha Notificación`** (dejar vacía).
5.  Ejecutar `sendEmailBatch('CONTINUATION')` o desde el panel de control.
6.  El sistema filtrará automáticamente a los elegibles (asistencia ≥ 80%, nota ≥ 40, curso con continuación) y enviará el correo `CorreoContinuacion` con:
    *   Su curso anterior y el siguiente nivel asignado
    *   Horarios del nuevo curso
    *   Botones de Aceptar/Rechazar cupo
7.  Los estudiantes que acepten tendrán su estado registrado como `"Acepta"` en la columna `Aceptación` de la hoja `"Continuación"`, y al generar la Lista Final se incorporarán directamente a sus nuevos cursos con estado `"Exento (Continuación)"`.

### Fase 5: Cierre de Matrículas e Inicio de Clases
1.  Al finalizar el período de admisión, haz clic en **`PUCV2English`** > **`📋 Generar Lista Final`**.
2.  Se creará la hoja **`Lista Final Curso`**, que incluye **únicamente** a los alumnos que cumplan ambos requisitos: `Acepta` + `Pagado`.
3.  Haz clic en **`📧 Enviar Correos`** > **`🏫 Inicio de Clases`**.
4.  Se abrirá una ventana de diálogo. Ingresa la **sala física o enlace virtual** para cada nivel.
5.  Valida la vista previa y haz clic en **Confirmar Envíos**. Esto enviará a todos los alumnos su correo de bienvenida con horarios, salas y fecha de inicio/término.

---

## ⚠️ Resolución de Problemas Frecuentes

### 1. Mensaje de error al abrir el Panel de Control Web: "No se puede abrir el archivo"
*   **Causa**: Tienes varias cuentas de Google iniciadas sesión en el mismo navegador (conflicto de cookies de multilogin de Google).
*   **Solución**: Abre la aplicación web en una **ventana de incógnito** o utiliza un perfil de navegador exclusivo donde solo tengas iniciada la cuenta de Google asociada al script.

### 2. Candidatos procesados no reciben correos de invitación
*   **Causa**: La celda correspondiente en la columna `Fecha Notificación` ya contiene una fecha. El script utiliza esto como marca de idempotencia para no duplicar correos.
*   **Solución**: Si necesitas reenviar el correo a un postulante específico, limpia su celda de `Fecha Notificación` en la hoja `Seleccionados` y vuelve a lanzar el envío.

### 3. Candidato promovido no aparece en el envío de "Seleccionados"
*   **Causa**: El candidato tiene `Verificación Certificado = "Test de nivel"`, por lo que califica para el lote **`TEST_LEVEL_ONLY`**, no para `SELECTED`.
*   **Solución**: Envíale el correo desde `📧 Enviar Correos` > `🧪 Test de Nivel`. Alternativamente, cambia su verificación a `"Válido"` si ya no necesita rendir el test.

### 4. Exceso de límite de cuota diaria de correos
*   **Causa**: Google Apps Script limita los envíos diarios (100 para cuentas gratuitas, 1500 para Google Workspace).
*   **Solución**: El script verifica esta cuota antes del envío masivo. Si es insuficiente, espera 24 horas y reintenta; el script retomará desde el postulante pendiente.

### 5. Error de columnas al restaurar seleccionados
*   **Causa**: La cantidad de columnas de los datos de restauración no coincide con la hoja destino.
*   **Solución**: Asegúrate de que la hoja `"Seleccionados"` esté completamente vacía (o eliminada) antes de ejecutar la restauración.

### 6. Estudiantes de C1 aparecen como elegibles para continuación
*   **Causa**: El nombre del curso en la columna `Curso` no comienza con el prefijo esperado (`B1+`, `B2.1`, `B2.2` o `C1`).
*   **Solución**: Verifica que los nombres de curso en la hoja `"Continuación"` sigan el formato estándar (ej: `B1+ PIIE 2096 - 01`). El regex extrae el nivel del inicio del texto.

### 7. La asistencia con coma no se parsea correctamente
*   **Causa**: El sistema espera números con punto decimal, pero los informes usan coma (ej: `88,8`).
*   **Solución**: Esto se maneja automáticamente desde v5.2.0. Si persiste, verifica que la columna `Asistencia` no contenga caracteres extraños (espacios, símbolos de porcentaje).
