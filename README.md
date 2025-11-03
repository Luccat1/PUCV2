Sistema de Evaluación de Postulaciones PUCV
Este proyecto es un script de Google Apps Script diseñado para automatizar por completo el proceso de evaluación de postulaciones para el Programa de Inglés de la PUCV. El sistema lee las respuestas de un formulario de Google, calcula un puntaje ponderado para cada postulante basado en múltiples criterios, genera un ranking, crea un dashboard con estadísticas clave y facilita la comunicación con los seleccionados.

✨ Características Principales
Evaluación Automatizada: Procesa cada nueva postulación enviada a través de un formulario de Google y calcula un puntaje total.
Puntuación Ponderada: Asigna puntos basados en criterios complejos como:
Disponibilidad y compromiso.
Tipo de postulante (académico, funcionario, postgrado, etc.).
Frecuencia y tipo de uso del inglés en el ámbito profesional.
Planes y estado de procesos de internacionalización.
Nivel de certificación de inglés.
Año de ingreso a la carrera.
Dashboard Dinámico: Genera y actualiza una hoja "Dashboard" con métricas en tiempo real:
Estadísticas generales (total de postulantes, puntaje promedio, máximo y mínimo).
Desglose de postulantes y puntajes por categoría, sede y año de ingreso.
Análisis cruzado de Sede vs. Categoría.
Gráfico de distribución de postulantes por sede.
Ranking de Seleccionados: Crea una hoja "Seleccionados" con el Top 25 de postulantes, ordenados por puntaje.
Incluye columnas para verificación manual (Verificación Certificado, Nivel Asignado).
Añade una columna Aceptación con un menú desplegable (Acepta, Rechaza, Pendiente) y formato condicional para visualizar el estado fácilmente.
Optimización y Robustez:
Procesamiento Incremental: Solo procesa las postulaciones nuevas, marcando las ya procesadas para evitar trabajo redundante y ser altamente eficiente.
Manejo de Errores: Utiliza bloques try...catch para aislar errores. Si una fila contiene datos incorrectos, la marca con un error y continúa con las demás, evitando que el script se detenga.
Control de Concurrencia: Implementa LockService para prevenir que múltiples ejecuciones simultáneas (ej. si llegan varias postulaciones a la vez) corrompan los datos.
Notificaciones por Correo: Incluye una función para enviar correos de notificación a los postulantes que aparecen en la hoja "Seleccionados".
Interfaz de Usuario Integrada: Añade un menú personalizado ("Evaluación PUCV") directamente en la interfaz de Google Sheets para ejecutar las funciones principales manualmente.
🚀 Configuración Inicial
Para poner en marcha este sistema, sigue estos pasos:

Crear la Hoja de Cálculo:

Crea un nuevo Google Sheet. Este será el centro de operaciones.
Crea un Google Form para recibir las postulaciones y vincúlalo a tu Google Sheet. Las respuestas se guardarán automáticamente en una hoja, que por defecto se llama "Respuestas de formulario 1".
Añadir Columna de Estado:

En la hoja "Respuestas de formulario 1", añade una nueva columna al final y nómbrala exactamente Estado de Procesamiento. El script la usará para marcar las filas que ya ha procesado.
Instalar el Script:

En tu Google Sheet, ve a Extensiones > Apps Script.
Copia todo el contenido del archivo PUCV2.js y pégalo en el editor de código, reemplazando cualquier código de ejemplo.
Importante: En la línea const SHEET_ID = "...", reemplaza el ID de ejemplo con el ID de tu propia hoja de cálculo. Puedes obtenerlo de la URL (ej: https://docs.google.com/spreadsheets/d/AQUI_VA_EL_ID/edit).
Guarda el proyecto (icono de disquete).
Configurar el Activador (Trigger):

Para que el script se ejecute automáticamente con cada nueva postulación, crea un activador:
En el editor de Apps Script, ve al panel izquierdo y haz clic en Activadores (icono de reloj).
Haz clic en + Añadir activador.
Configúralo con las siguientes opciones:
Función que se debe ejecutar: evaluarPostulacionesPUCV2
Implementación que se debe ejecutar: Principal
Selecciona la fuente del evento: Desde una hoja de cálculo
Selecciona el tipo de evento: Al enviar un formulario
Haz clic en Guardar.
Google te pedirá que autorices los permisos necesarios para que el script modifique hojas de cálculo y se ejecute automáticamente. Concede los permisos.
🛠️ Modo de Uso
Ejecución Automática
Una vez configurado el activador, el sistema es 100% autónomo. Cada vez que un usuario envíe el formulario:

El script evaluarPostulacionesPUCV2 se ejecutará.
Procesará únicamente la nueva fila.
Añadirá el resultado a la hoja "Evaluación automatizada".
Regenerará por completo las hojas "Dashboard" y "Seleccionados" para reflejar los datos actualizados.
Marcará la fila en "Respuestas de formulario 1" como procesada.
Ejecución Manual
Puedes forzar una re-evaluación completa o enviar notificaciones desde el menú personalizado en la hoja de cálculo:

Recarga la página de tu Google Sheet para que aparezca el nuevo menú "Evaluación PUCV".
Evaluación PUCV > Actualizar Evaluación y Dashboard: Ejecuta la función principal evaluarPostulacionesPUCV2. Es útil si has hecho cambios manuales o para la configuración inicial.
Evaluación PUCV > Enviar Notificaciones a Seleccionados: Ejecuta la función enviarNotificacionesSeleccionados. Importante: Esta función pide una confirmación antes de enviar correos masivos a todos los postulantes listados en la hoja "Seleccionados".
Gestión de Seleccionados
Ve a la hoja "Seleccionados".
Revisa los postulantes del Top 25.
Utiliza las columnas Verificación Certificado y Nivel Asignado para tus anotaciones manuales.
Cuando un postulante confirme su participación, cambia el estado en la columna Aceptación a "Acepta" o "Rechaza". La fila cambiará de color automáticamente para una mejor visualización.
