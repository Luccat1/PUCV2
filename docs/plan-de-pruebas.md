# Plan de Pruebas Extremo a Extremo (PUCV2English)

Este documento detalla el plan de pruebas paso a paso para verificar la correcta integración y funcionamiento de todo el ecosistema de scripts de **PUCV2English** desde la postulación inicial hasta el correo de inicio de clases.

---

## 🏗️ Fase 1: Configuración del Entorno de Pruebas

Antes de iniciar la simulación, debemos asegurar que las bases de datos de prueba y la Web App estén preparadas.

- [ ] **1.1. Duplicar Hojas de Producción (Sandbox)**
  *   Crea copias de prueba de las hojas en tu Google Sheet para no alterar datos reales.
  *   Asegúrate de que existan las 6 hojas parametrizadas en `CONFIG.SHEETS`:
      1. `"Respuestas de formulario 1"` (con la columna `"Estado de Procesamiento"` agregada al final).
      2. `"Evaluación automatizada"`.
      3. `"Dashboard"`.
      4. `"Configuración"`.
      5. `"Seleccionados"`.
      6. `"Lista Final Curso"`.

- [ ] **1.2. Inicializar la Configuración en la Hoja**
  *   Ejecuta la función `resetConfiguracion()` o ingresa al menú `PUCV2English` > `⚙️ Configurar Pesos` para verificar que se cree y rellene la pestaña `"Configuración"` con los valores predeterminados de ponderaciones y fechas.

- [ ] **1.3. Desplegar y Configurar la Web App**
  *   Despliega el script en Apps Script (`Implementar > Nueva Implementación > Aplicación Web`).
  *   **Configuración obligatoria**: Ejecutar como: `Yo`, Quién tiene acceso: `Cualquiera`.
  *   Copia la URL provista (terminada en `/exec`) y pégala en el campo `WEB_APP_URL` de [Config.ts](file:///c:/Users/Usuario/Documents/code\pucv\PUCV2\src\Config.ts) (o de manera equivalente en `Config.js` en tu Apps Script). *Esto es crítico para que los enlaces de confirmación generen URLs válidas.*

---

## 📝 Fase 2: Admisión, Cálculo de Puntajes y Dashboard

Probaremos que el motor de evaluación procese las filas nuevas, calcule correctamente los puntajes parciales según el tipo de postulante y evite procesar duplicados.

- [ ] **2.1. Simular Postulaciones Válidas (Estudiante y Funcionario)**
  *   Inserta manualmente en `"Respuestas de formulario 1"` dos filas de prueba:
      *   **Fila A (Estudiante)**: Nombre: "Juan Estudiante", Correo: "juan.estud@test.com", Categoría: "Estudiante de Pregrado", Año Ingreso: 2024, Certificación de Inglés: "B2.1", Disponibilidad: Contesta "Sí" a compromiso y tiempo.
      *   **Fila B (Funcionario)**: Nombre: "Ana Funcionaria", Correo: "ana.func@test.com", Categoría: "Funcionario/Administrativo", Año Ingreso: 2012, Certificación de Inglés: "C1", Disponibilidad: Contesta "Sí" a todo.
  *   Verifica que la columna `"Estado de Procesamiento"` de ambas filas esté **vacía**.

- [ ] **2.2. Ejecutar la Evaluación**
  *   Ejecuta la función `evaluarPostulacionesPUCV2()` desde el editor de Apps Script o desde el menú de la hoja `PUCV2English` > `📊 Evaluar Postulaciones`.
  *   **Verificación esperada**:
      *   En `"Respuestas de formulario 1"`, la columna `"Estado de Procesamiento"` debe llenarse con la fecha y hora actual en las dos filas creadas.
      *   En `"Evaluación automatizada"`, deben aparecer las dos personas con sus respectivos desglose de puntajes y el `"PUNTAJE TOTAL"` calculado.
      *   En `"Seleccionados"`, deben aparecer ambos postulantes en estado `"Pendiente"` e incluidos en sus respectivos rankings por nivel.
      *   En `"Dashboard"`, las métricas y el gráfico deben actualizarse reflejando los nuevos datos.

- [ ] **2.3. Probar Detección de Duplicados**
  *   Agrega una nueva fila idéntica a la **Fila A** (mismo correo "juan.estud@test.com"), dejando `"Estado de Procesamiento"` vacío.
  *   Ejecuta de nuevo la evaluación.
  *   **Verificación esperada**: La columna `"Estado de Procesamiento"` de la nueva fila duplicada debe actualizarse a `"DUPLICADO (Ignorado)"`. No debe agregarse una nueva fila en `"Evaluación automatizada"` ni en `"Seleccionados"`.

---

## 👁️ Fase 3: Gestión y Revisión de Certificados (Admin)

Verificaremos la asignación y cambio de estados desde la perspectiva del administrador del curso.

- [ ] **3.1. Simular Certificado Válido**
  *   En la hoja `"Seleccionados"`, busca la fila de "Juan Estudiante".
  *   Cambia manualmente (o mediante la sidebar `👁️ Revisar Postulaciones`) la columna `Verificación Certificado` a `"Válido"`.
  *   Asegúrate de que `Nivel Asignado` tenga un valor (ej: `"B2.1"`).

- [ ] **3.2. Simular Requisito de Examen (Test de Nivel)**
  *   En la misma hoja, busca la fila de "Ana Funcionaria".
  *   Cambia la columna `Verificación Certificado` a `"Test de nivel"`.
  *   Deja `Aceptación` en `"Pendiente"`.

---

## 📧 Fase 4: Notificación por Lotes e Idempotencia

Probaremos que el sistema envíe los correos correspondientes a cada lote de verificación y no repita envíos.

- [ ] **4.1. Envío de Selección**
  *   Ejecuta `PUCV2English` > `📧 Enviar Correos` > `✅ Seleccionados`.
  *   **Verificación esperada**:
      *   Debe enviarse un correo a "Juan Estudiante" (puedes configurar tu propio correo para la prueba) con la plantilla de seleccionado.
      *   El correo debe incluir botones o enlaces dinámicos con la URL de la Web App + parámetros `action=accept` / `reject` y un token único.
      *   La columna `Fecha Notificación` en la fila de Juan debe actualizarse con la marca de tiempo de envío.
      *   "Ana Funcionaria" **no** debe recibir correo en este lote (tiene estado "Test de nivel").

- [ ] **4.2. Envío de Test de Nivel**
  *   Ejecuta `PUCV2English` > `📧 Enviar Correos` > `🧪 Test de Nivel`.
  *   **Verificación esperada**:
      *   Debe enviarse un correo de citación de test a "Ana Funcionaria".
      *   Su columna `Fecha Notificación` debe actualizarse con la marca de tiempo.

- [ ] **4.3. Prueba de Idempotencia (Doble Envío)**
  *   Ejecuta nuevamente `PUCV2English` > `📧 Enviar Correos` > `✅ Seleccionados`.
  *   **Verificación esperada**: El sistema debe alertar: `"No hay destinatarios pendientes para enviar 'SELECTED'"` (o `"Se enviaron 0 correos"`). Ningún correo debe duplicarse ya que las marcas temporales en la hoja previenen el reenvío.

---

## 🌐 Fase 5: Respuestas de Postulantes (Prueba de Web App)

Validaremos el flujo de confirmación a través de la Web App que interactúa con los postulantes.

- [ ] **5.1. Prueba de Aceptación (Aceptar Cupo)**
  *   Copia el enlace de aceptación (`action=accept&token=...`) que se generó para Juan Estudiante en el paso 4.1 (puedes obtenerlo inspeccionando el enlace o creando un token de prueba).
  *   Abre el enlace en el navegador.
  *   **Verificación esperada**:
      *   El navegador debe cargar la página de confirmación con el logo de la PUCV y un botón azul: `💳 Proceder al Pago de Matrícula`.
      *   La columna `Aceptación` en la hoja `"Seleccionados"` para Juan Estudiante debe cambiar automáticamente a `"Acepta"`. La fila completa en Google Sheets debe colorearse de **verde** por formato condicional.
      *   Juan debe recibir automáticamente un correo de confirmación de aceptación (`CorreoConfirmacionAcepta`) detallando las instrucciones y plazos de pago.
      *   Si intentas recargar o usar el mismo enlace por segunda vez, la página debe indicar que el token ya ha sido procesado o ya no es válido (destrucción del token de un solo uso).

- [ ] **5.2. Prueba de Rechazo (Liberar Cupo)**
  *   Crea un nuevo postulante ficticio en `"Seleccionados"` ("Pedro Rechazo", correo de prueba), cámbiale la verificación a `"Válido"`, ejecútale el envío de correos para generar su token.
  *   Abre su enlace de rechazo (`action=reject&token=...`) en el navegador.
  *   **Verificación esperada**:
      *   El navegador debe indicar que el cupo ha sido liberado exitosamente.
      *   La columna `Aceptación` de Pedro debe cambiar a `"Rechaza"` y la fila colorearse de **rojo**.
      *   Pedro debe recibir un correo de confirmación de cupo liberado (`CorreoConfirmacionRechaza`).

---

## ⏳ Fase 6: Promoción y Gestión de Lista de Espera

Verificaremos que al liberarse una vacante, el sistema pueda promover ordenadamente al siguiente postulante de la lista de espera.

- [ ] **6.1. Simular Rechazo y Promoción de Lista de Espera**
  *   Asegúrate de tener candidatos evaluados en `"Evaluación automatizada"` que no entraron en el Top 15 de `"Seleccionados"` (estos actúan como lista de espera).
  *   Desde el Panel de Control Web o ejecutando `promoverSiguienteEsperaAPI(nivel)` (por ejemplo, para nivel `"B2.1"`), gatilla la promoción.
  *   **Verificación esperada**:
      *   El candidato mejor puntuado de ese nivel (que no estuviese en Seleccionados) debe ser copiado y anexado al final de la hoja `"Seleccionados"`.
      *   Su columna de `Comentarios` debe indicar: `"Promovido desde lista de espera para nivel B2.1"`.
      *   Su columna de `Aceptación` debe registrarse como `"Pendiente"`.
      *   El script debe enviarle automáticamente el correo de selección (`CorreoSeleccionado`) con sus respectivos links de Aceptar/Rechazar.
      *   La columna `Fecha Notificación` del nuevo promovido debe quedar estampada.

---

## 📋 Fase 7: Consolidación y Generación de Lista Final

Probaremos la recopilación de alumnos confirmados para crear el libro de clases final.

- [ ] **7.1. Generar Lista Final del Curso**
  *   Ejecuta `PUCV2English` > `📋 Generar Lista Final` desde la hoja.
  *   **Verificación esperada**:
      *   La hoja `"Lista Final Curso"` debe crearse/sobrescribirse.
      *   Deben aparecer agrupados por sección todos los postulantes de `"Seleccionados"` que tengan:
          *   `Aceptación` = `"Acepta"` (con su nivel asignado).
          *   **O** `Verificación Certificado` = `"Test de nivel"` (estos se agrupan en la categoría `"PRUEBA DE NIVEL"`).
      *   La hoja debe estar formateada con títulos de categorías en negrita y color azul claro (`#cfe2f3`).
      *   Las columnas `Sala` y `Notificado Inicio` deben estar vacías al crearse.

---

## 🏫 Fase 8: Coordinación de Salas e Inicio de Clases

Fase final donde el administrador coordina la infraestructura e informa a los alumnos matriculados.

- [ ] **8.1. Abrir Modal de Salas**
  *   Selecciona `PUCV2English` > `📧 Enviar Correos` > `🏫 Inicio de Clases`.
  *   **Verificación esperada**: Se abre el modal `"Configurar Salas — Inicio de Clases"`. El modal debe cargar la lista de niveles activos que tienen alumnos sin notificar.

- [ ] **8.2. Validar Campos Vacíos**
  *   Intenta presionar el botón `Continuar` dejando una o más salas vacías.
  *   **Verificación esperada**: El sistema debe lanzar una alerta de validación indicando que se debe ingresar una sala para todos los niveles activos.

- [ ] **8.3. Visualizar Vista Previa de Envío**
  *   Completa todas las salas con nombres de salas ficticios (ej: "Sala 204", "Laboratorio Multimedios").
  *   Haz clic en `Continuar`.
  *   **Verificación esperada**: El modal cambia a la pestaña de vista previa mostrando el resumen de salas asignadas por nivel y el conteo de estudiantes destinatarios.

- [ ] **8.4. Confirmar Envío Masivo**
  *   Haz clic en `Enviar correos` en el modal.
  *   **Verificación esperada**:
      *   Los destinatarios listados en `"Lista Final Curso"` reciben el correo `CorreoInicioClases` con su nombre completo, nivel, horarios y la sala ingresada.
      *   En la hoja `"Lista Final Curso"`, la columna `Sala` de cada alumno se actualiza con la sala asignada a su nivel.
      *   La columna `Notificado Inicio` se rellena con la fecha y hora de la notificación.
      *   El modal se cierra mostrando un mensaje de éxito.
