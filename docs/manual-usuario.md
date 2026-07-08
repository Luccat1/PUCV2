# Manual del Usuario: Gestión y Operación del Sistema PUCV2English

Este manual describe el flujo de trabajo operacional y explica detalladamente cómo utilizar las hojas de cálculo generadas por los scripts de **PUCV2English** para administrar exitosamente el programa de admisión e inicio de clases.

---

## 🗺️ Mapa de Hojas de Cálculo y su Propósito

El ecosistema de Google Sheets contiene las siguientes pestañas, cada una con un rol bien definido en la administración:

```
[Respuestas de Formulario 1] ──(Evaluar)──> [Evaluación automatizada] ──(Top 15)──> [Seleccionados] ──(Matriculados)──> [Lista Final Curso]
                                                       │                                    │
                                                       └───────────> [Dashboard] <──────────┘
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
    *   **Qué es**: La hoja de gestión principal de admisiones. Contiene el **Top 15 por nivel** (máx 60 postulantes) ordenados por puntaje descendente y marca de tiempo en caso de empates.
    *   **Cómo usarla**: El administrador interactúa directamente con tres columnas desplegables a la derecha:
        *   **`Verificación Certificado`**: Elige `"Válido"` (si el certificado oficial adjunto en el enlace es correcto) o `"Test de nivel"` (si el postulante no subió un certificado equivalente y requiere examen de nivelación).
        *   **`Nivel Asignado`**: El nivel definitivo acordado tras verificar el certificado o rendir el test.
        *   **`Aceptación`**: Muestra `"Pendiente"` por defecto. Cambiará automáticamente a `"Acepta"` o `"Rechaza"` cuando el alumno pulse la decisión en el correo de invitación. (Las filas se colorean en verde para aceptados y rojo para rechazados).
        *   **`Fecha Notificación`**: Registra la hora exacta en que se le envió el correo al postulante, impidiendo envíos de correos duplicados por error.
5.  **`Dashboard` (Estadísticas en Tiempo Real)**:
    *   **Qué es**: Resúmenes estadísticos agregados por nivel, campus, categoría y año de ingreso, junto con un gráfico interactivo.
    *   **Cómo usarla**: Hoja de lectura y reporte gerencial.
6.  **`Lista Final Curso` (Libro de Clases)**:
    *   **Qué es**: Listado definitivo de alumnos matriculados (`Acepta`) y alumnos convocados a rendir examen (`Test de nivel`).
    *   **Cómo usarla**:
        *   El administrador registra manualmente el pago de la matrícula en la columna `"Pagó (Sí/No)"`.
        *   Registra las salas físicas o virtuales de clases a través del diálogo de inicio de curso.

---

## 🔄 Guía Paso a Paso del Ciclo de Admisión

Sigue esta secuencia para operar el programa completo desde el cierre de postulaciones hasta el inicio de las clases:

### Fase 1: Puntuación y Ranking
1.  Una vez cerrado el formulario, ve a la hoja de cálculo.
2.  Si deseas forzar el cálculo de los candidatos que falten por procesar, haz clic en el menú superior **`PUCV2English`** > **`📊 Evaluar Postulaciones`**.
3.  Si detectas inconsistencias históricas o deseas actualizar el ranking tras haber cambiado los pesos de ponderación en la hoja de `Configuración`, haz clic en **`PUCV2English`** > **`🔄 Reevaluar Todo desde Cero`**. Esto limpiará todo el historial de cálculo, eliminará los duplicados y recalculará la lista de seleccionados y el dashboard basándose en las nuevas reglas.

### Fase 2: Auditoría de Certificados
1.  Ve a la hoja **`Seleccionados`**.
2.  Para cada uno de los 60 postulantes listados, haz clic en el link de la columna `"Enlace Certificado"` para visualizar el documento.
3.  Establece el valor en la columna **`Verificación Certificado`**:
    *   Selecciona **`Válido`** si tiene un certificado C1/B2/B1 que concuerde con el nivel postulado.
    *   Selecciona **`Test de nivel`** si no subió certificado o si es necesario re-evaluarlo en un examen presencial/remoto.

### Fase 3: Lanzamiento de Invitaciones
1.  Haz clic en el menú **`PUCV2English`** > **`📧 Enviar Correos`** > **`✅ Seleccionados`**. Esto enviará automáticamente el correo de preselección a todos los candidatos marcados como `"Válido"`. Cada correo incluye dos botones únicos (*Aceptar* y *Rechazar*).
2.  Haz clic en **`PUCV2English`** > **`📧 Enviar Correos`** > **`🧪 Test de Nivel`**. Esto notificará a los candidatos sin certificado para que se agenden y rindan el test de clasificación.
3.  *(Opcional)* Si hay personas agregadas manualmente fuera de plazo, selecciónalas en la hoja y haz clic en **`📧 Enviar Correos`** > **`💎 Hand Picked`**.

### Fase 4: Monitoreo de Respuestas y Lista de Espera
1.  Espera a que los postulantes hagan clic en los correos. Sus filas en la hoja **`Seleccionados`** cambiarán de estado automáticamente:
    *   **Acepta** (Fila verde): El alumno aceptó el cupo y el sistema le envió un correo de confirmación con el link de pago y un plazo de matrícula.
    *   **Rechaza** (Fila roja): El alumno liberó su cupo.
2.  **Cómo promover la lista de espera**:
    *   Si tienes cupos liberados (filas en rojo o alumnos que excedieron el plazo de pago sin pagar), puedes promover al siguiente candidato mejor puntuado.
    *   Ve al menú **`PUCV2English`** > **`📧 Enviar Correos`** > **`⏳ Lista de Espera`** (o a través de la Web App).
    *   El script buscará automáticamente al siguiente postulante no seleccionado de mayor puntaje para el nivel respectivo en la hoja `"Evaluación automatizada"`, lo insertará al final de `"Seleccionados"` como `"Pendiente"`, y le enviará instantáneamente su correo de invitación con un token de confirmación de un solo uso.

### Fase 5: Cierre de Matrículas e Inicio de Clases
1.  Al finalizar el período de admisión, haz clic en **`PUCV2English`** > **`📋 Generar Lista Final`**.
2.  Se creará la hoja **`Lista Final Curso`**, que agrupa a todos los alumnos confirmados (`Acepta`) y pendientes de test (`Test de nivel`) ordenados por grupos y nivel.
3.  Marca con `"Sí"` o `"No"` la columna de pago de matrícula según verifiques los abonos en tu cuenta bancaria o portal de pagos.
4.  Haz clic en **`PUCV2English`** > **`📧 Enviar Correos`** > **`🏫 Inicio de Clases`**.
5.  Se abrirá una ventana de diálogo. Ingresa la **sala física (ej. Sala 3-1, Casa Central)** o el **enlace virtual (ej. link de Zoom/Teams)** para cada nivel.
6.  Valida la vista previa y haz clic en **Confirmar Envíos**. Esto enviará a todos los alumnos confirmados su correo de bienvenida con los horarios correspondientes, salas y fecha de inicio de clases.

---

## ⚠️ Resolución de Problemas Frecuentes

### 1. Mensaje de error al abrir el Panel de Control Web: "No se puede abrir el archivo"
*   **Causa**: Tienes varias cuentas de Google iniciadas sesión en el mismo navegador (conflicto de cookies de multilogin de Google).
*   **Solución**: Abre la aplicación web en una **ventana de incógnito** o utiliza un perfil de navegador exclusivo donde solo tengas iniciada la cuenta de Google institucional/organizacional asociada al script.

### 2. Candidatos procesados no reciben correos de invitación
*   **Causa**: La celda correspondiente en la columna `Fecha Notificación` ya contiene una fecha. El script utiliza esto como marca de idempotencia para no duplicar correos por accidente.
*   **Solución**: Si necesitas reenviar el correo a un postulante específico, limpia la celda de su columna `Fecha Notificación` en la hoja `Seleccionados` y vuelve a lanzar el envío de correos desde el menú.

### 3. Exceso de límite de cuota diaria de correos
*   **Causa**: Google Apps Script limita los envíos diarios (normalmente 100 correos para cuentas gratuitas, 1500 para cuentas de Google Workspace).
*   **Solución**: El script verifica esta cuota antes del envío masivo y se detendrá si es insuficiente. Si esto ocurre, espera 24 horas a que Google resetee tu cuota diaria y vuelve a ejecutar el envío; el script retomará el proceso desde el postulante pendiente.
