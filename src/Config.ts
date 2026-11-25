/**
 * @file Config.ts
 * Centralizes all configuration, data structures, and types for the PUCV2 project.
 * Important: This project is container-bound; SHEET_ID is not used.
 */

// --- TYPES & INTERFACES ---

/**
 * Status of an applicant during the selection process.
 * (Pendiente | Seleccionado | Notificado | Acepta | Rechaza | Excluido)
 */

/**
 * Configuration for Sheet names and Column headers.
 */
interface IConfig {
  WEB_APP_URL: string;
  SHEETS: {
    INPUT: string;
    OUTPUT: string;
    DASHBOARD: string;
    CONFIG: string;
    SELECTED: string;
    WAITLIST: string;
    FINAL_LIST: string;
    PLACEMENT: string;
    CONTINUATION: string;
  };
  PLACEMENT_PDF_NAME: string;
  DEFAULT_INSTITUTION_ID: string;
  COLUMNS: Record<string, string>;
}

/**
 * Program specific data like dates and class schedules.
 */
interface IProgramData {
  TIMEZONE: string;
  FECHA_LIMITE: string;
  FECHA_INICIO: string;
  FECHA_TERMINO: string;
  PAYMENT_URL: string;
  DEADLINE_DAYS: number;
  TEST_FECHA: string;
  TEST_INSTRUCCIONES_FECHA: string;
  HORARIOS: Record<string, { catedra: string; ayudantia: string }>;
}

/**
 * Parameters for the automated scoring engine.
 */
interface IScoringParams {
  // Requisitos que también puntúan: 1 punto base por cumplir × peso del perfil (sección Disponibilidad del formulario)
  Disponibilidad: { peso: Record<string, number> };
  Compromiso: { peso: Record<string, number> };
  UsoIngles: {
    Frecuencia: Record<string, number>;
    Actividades: Record<string, number>;
    MaxActividades: number;
    PuntajeProyectosFuturos: number;
    PuntajeTextoPorFamilia: number;
    MaxTexto: number;
    MaxPuntaje: number;
    peso: Record<string, number>;
  };
  Internacionalizacion: {
    PuntajePlan: Record<string, number>; // clave = texto de la opción del formulario (minúsculas, sin tildes)
    PuntajeEtapa: Record<string, number>;
    MaxPlanes: number;
    PuntajeDocumentos: Record<string, number>; // evidencia declarada: cuenta la más fuerte
    PuntajeAdjunto: number;
    MaxDocumentos: number;
    MaxPuntaje: number;
    peso: Record<string, number>;
  };
  CartaRespaldo: {
    peso: Record<string, any>;
  };
}

/**
 * Statistics for the dashboard.
 */
interface IStatistics {
  totalPostulantes: number;
  totalCertificados: number;
  puntajePromedio: number;
  puntajeMaximo: number;
  puntajeMinimo: number;
  statsPorCategoria: Record<string, { suma: number; contador: number }>;
  statsPorSede: Record<string, { suma: number; contador: number }>;
  statsPorNivel: Record<string, { suma: number; contador: number }>;
  statsPorAnio: Record<string, { suma: number; contador: number }>;
  statsCruzados: Record<string, Record<string, { suma: number; contador: number }>>;
}

// --- CONSTANTS ---

/**
 * Encabezados de las hojas que genera el sistema (Evaluación automatizada, Seleccionados, Lista de Espera).
 * Única fuente de los nombres: nunca escribirlos como texto suelto, porque una errata no falla,
 * solo deja la columna sin encontrar. Se usan solo dentro de funciones (no al cargar el archivo).
 */
const HEADERS = {
  RANKING: "Ranking",
  LAST_NAME: "Apellido(s)",
  FIRST_NAME: "Nombre(s)",
  EMAIL: "Correo Electrónico",
  APPLICATION_DATE: "Fecha de Postulación",
  CATEGORY: "Categoría Postulante",
  TOTAL_SCORE: "PUNTAJE TOTAL",
  CERTIFICATE_LINK: "Enlace Certificado",
  LEVEL_APPLIED: "Nivel Postulado",
  OBSERVATIONS: "Observaciones",
  CERT_VERIFICATION: "Verificación Certificado",
  LEVEL_ASSIGNED: "Nivel Asignado",
  ACCEPTANCE: "Aceptación",
  PAYMENT: "Pago Matrícula",
  COMMENTS: "Comentarios",
  NOTIFICATION_DATE: "Fecha Notificación",
  REJECTION_NOTIFICATION_DATE: "Fecha Notificación Rechazo",
  CLOSURE_NOTIFICATION_DATE: "Fecha Notificación Cierre"
};

const CONFIG: IConfig = {
  // Pega aquí la URL publicada de tu Web App (terminada en /exec) si los links de correo fallan con "No se puede abrir el archivo"
  WEB_APP_URL: "",
  SHEETS: {
    INPUT: "Respuestas de formulario 1",
    OUTPUT: "Evaluación automatizada",
    DASHBOARD: "Dashboard",
    CONFIG: "Configuración",
    SELECTED: "Seleccionados",
    WAITLIST: "Lista de Espera",
    FINAL_LIST: "Lista Final Curso",
    PLACEMENT: "Prueba de Nivel",
    CONTINUATION: "Continuación"
  },
  PLACEMENT_PDF_NAME: "Instrucciones Placement.pdf",
  DEFAULT_INSTITUTION_ID: "CL304",
  COLUMNS: {
    PROCESSING_STATUS: "Estado de Procesamiento",
    TIMESTAMP: "Marca temporal",
    EMAIL: "Dirección de correo electrónico",
    FIRST_NAME: "Primer nombre",
    SECOND_NAME: "Segundo nombre",
    LAST_NAME_P: "Apellido paterno",
    LAST_NAME_M: "Apellido materno",
    RUT: "RUT",
    APPLICANT_TYPE: "¿Cuál es tu vínculo actual con la PUCV?",
    CAMPUS: "¿En qué sede realizas la mayoría de tus actividades académicas o profesionales?",
    AVAILABILITY_SESSIONS: "¿Tienes disponibilidad para asistir durante todo el semestre los lunes, miércoles y jueves, de 17:45 a 18:55?",
    AVAILABILITY_CONFLICTS: "¿Tienes compromisos académicos o laborales que te impedirían asistir en ese horario?",
    AVAILABILITY_ASSISTANCE: "¿Puedes comprometerte a asistir al menos al 80 % del total de sesiones, considerando cátedras y ayudantías?",
    AVAILABILITY_STUDY: "¿Estás en conocimiento de que el programa considera una dedicación orientativa de cuatro horas semanales de estudio autónomo, además de las clases?",
    ENGLISH_USE_FREQUENCY: "¿Con qué frecuencia requieres utilizar el idioma inglés en tus funciones actuales?",
    ENGLISH_USE_ACTIVITIES: "Seleccione las actividades que realizas en inglés como parte de tus funciones:",
    ENGLISH_USE_FUTURE_PROJECTS: "Proyectos futuros que requieren inglés",
    ENGLISH_USE_CONTRIBUTION: "¿Cómo contribuiría el mejoramiento de tu nivel de inglés a tu desempeño profesional?",
    INTL_STAGE: "¿En qué etapa se encuentra tu proceso de internacionalización?",
    INTL_PLAN: "¿Cómo has planeado internacionalizar tu carrera?",
    INTL_SUPPORT_DOCS: "Adjunta los documentos de respaldo",
    CERTIFICATE_ATTACHMENT: "Adjunta la certificación que permita verificar tu nivel de inglés más alto (certificado oficial).",
    CERTIFICATE_LEVEL: "¿Cuentas con un certificado Cambridge B1 o B2 vigente para acreditar tu nivel?",
    ENTRY_YEAR: "¿En qué año ingresaste a tu carrera actual?",
    ENDORSEMENT_APPROVAL: "¿Tu jefatura directa está en conocimiento de tu postulación y respalda tu participación en el horario establecido?",
    ENDORSEMENT_LETTER: "Adjunta la carta de respaldo de tu jefatura (opcional)",
    NOTIFICATION_DATE: HEADERS.NOTIFICATION_DATE,
    REJECTION_NOTIFICATION_DATE: HEADERS.REJECTION_NOTIFICATION_DATE,
    CLOSURE_NOTIFICATION_DATE: HEADERS.CLOSURE_NOTIFICATION_DATE,
    INICIO_NOTIFICATION_DATE: "Notificado Inicio",
    SALA: "Sala",
    LEVEL_APPLIED: "Nivel al que solicitas ingresar",
    SCORE: HEADERS.TOTAL_SCORE,
    PHONE: "Número de teléfono de contacto",
    CARGO_ACTUAL: "¿Cuál es tu cargo actual en la PUCV?",
    ANTIGUEDAD_CARGO: "¿Cuánto tiempo llevas en tu cargo actual?",
    SITUACIONES_INGLES: "Describe brevemente las situaciones específicas en las que requieres usar inglés en tu trabajo:",
    PROYECTOS_FUTUROS_DESC: "Descripción de proyectos y participación",
    DOCUMENTOS_RESPALDO_SITUACION: "¿Tienes algún documento que respalde este proceso?",
    NUCLEO: "¿Eres parte del programa Núcleo?",
    PREV_COURSES: "¿Cuántos cursos PUCV2English has completado anteriormente?",
    PREV_C1: "¿Has cursado anteriormente el nivel C1 en PUCV2English?",
    PREV_FAILED: "¿Has reprobado algún curso PUCV2English?",
    PREV_WITHDREW: "¿Has renunciado a una beca PUCV2English después de la primera semana de clases?",
    ENROLLED: "¿Tienes matrícula vigente en la PUCV?",
    PILE_STATUS: "Respecto de los cursos obligatorios de inglés del PILE correspondientes a tu carrera, ¿cuál es tu situación?"
    // Note: The "Seleccionados" sheet also includes: "Ranking", "Verificación Certificado", "Nivel Asignado", "Aceptación", "Comentarios"
  }
};

/**
 * Cupos de la convocatoria abierta por nivel (bases 2027, n.º 3). Los cupos de continuidad
 * (10 en B2.1, B2.2 y C1) se gestionan por invitación, fuera de esta pauta.
 */
const CUPOS_CONVOCATORIA_ABIERTA: Record<string, number> = { "B1+": 25, "B2.1": 15, "B2.2": 15, "C1": 15 };

/**
 * Declaraciones del formulario que deben estar aceptadas para postular (bases n.º 5.1 e).
 */
const DECLARACIONES_REQUERIDAS: string[] = [
  "1. Conocimiento de las bases y el reglamento",
  "2. Compromiso de participación y aprobación",
  "3. Veracidad de la información",
  "4. Acreditación y asignación del nivel",
  "5. Matrícula y devolución",
  "6. Renuncia y consecuencias por incumplimiento",
  "7. Comunicaciones y tratamiento de datos"
];

/**
 * These parameters can be modified by the 'cargarConfiguracionDesdeHoja_' function.
 */
const DEFAULT_SCORING_PARAMS: IScoringParams = {
  // Comprometerse pesa más fuera del pregrado (más carga laboral/académica que conciliar con el horario)
  Disponibilidad: { peso: { estudiante: 1, postgrado: 1.5, funcionario: 2, academico: 2 } },
  Compromiso: { peso: { estudiante: 1, postgrado: 1.5, funcionario: 2, academico: 2 } },
  UsoIngles: {
    Frecuencia: { "diariamente": 1.5, "semanalmente": 1, "mensualmente": 0.5 },
    // Claves = texto de las opciones del formulario (sección Labor profesional), en minúsculas
    Actividades: { "visitantes internacionales": 1, "instituciones extranjeras": 1, "eventos internacionales": 0.75, "documentos internacionales": 0.5, "traduccion": 0.5, "investigacion y docencia": 0.5, "correos": 0.25, "telefonica": 0.25, "otro": 0.25 },
    // Reparto del máximo (4): frecuencia 1.5 + actividades 1 + proyectos futuros 0.5 + descripciones abiertas 1
    MaxActividades: 1,
    PuntajeProyectosFuturos: 0.5,
    PuntajeTextoPorFamilia: 0.2,
    MaxTexto: 1,
    MaxPuntaje: 4,
    peso: {
      estudiante: 0.75,
      funcionario: 0.75, // su máximo (Tipo 2 + Uso 3 + Carta 3 + certificado 3) iguala al resto (11); academico = punto base fijo
      academico: 1
    }
  },
  Internacionalizacion: {
    // Cada opción del formulario suma lo suyo (jerarquía: postgrado > doble titulación/intercambio > pasantía > práctica/proyecto > curso > congreso)
    PuntajePlan: { "postgrado": 1, "doble titulacion": 0.8, "intercambio": 0.8, "pasantia": 0.6, "practica profesional": 0.5, "proyecto de investigacion": 0.5, "especializado": 0.4, "congreso": 0.3, "otro": 0.2 },
    // Etapas correlativas, de mayor a menor
    PuntajeEtapa: { "ya aceptado": 3.5, "en proceso de postulacion": 2.5, "con plan concreto": 1.75, "etapa de planificacion": 1, "interes general": 0 },
    MaxPlanes: 1.5,
    PuntajeDocumentos: { "aceptacion": 1, "postulacion": 0.75, "invitacion": 0.75, "contactos": 0.5, "programa": 0.25 },
    PuntajeAdjunto: 0.25,
    MaxDocumentos: 1,
    MaxPuntaje: 5,
    peso: {
      estudiante: 1,
      postgrado: 1.3, // sin año de ingreso: Tipo 1.5 + Intl 6.5 + certificado 3 = 11 (igual al resto)
      funcionario: 1,
      academico: 1
    }
  },
  CartaRespaldo: {
    // Máx. de la carta para no estudiantes = 2 (respaldo + carta) x 1.5 = 3
    peso: {
      estudiante: 0.5,
      funcionario: 1.5,
      academico: 1.5,
      _perfil: {
        estudiante: "perfil",
      }
    }
  }
};

/**
 * These parameters can be modified by the 'cargarConfiguracionDesdeHoja_' function.
 */
let SCORING_PARAMS: IScoringParams = JSON.parse(JSON.stringify(DEFAULT_SCORING_PARAMS));

const DEFAULT_PAYMENT_URL = "https://www.mercadopago.cl/link-pago-matricula";

/**
 * Default program specific data (fallback).
 */
const DEFAULT_PROGRAM_DATA: IProgramData = {
  TIMEZONE: "America/Santiago",
  FECHA_LIMITE: "viernes 11 de diciembre",
  FECHA_INICIO: "22 de marzo de 2027",
  FECHA_TERMINO: "1 de julio de 2027",
  PAYMENT_URL: DEFAULT_PAYMENT_URL,
  DEADLINE_DAYS: 3,
  TEST_FECHA: "",
  TEST_INSTRUCCIONES_FECHA: "",
  HORARIOS: {
    "B1+": { catedra: "Lunes y Miércoles 17:45-18:55", ayudantia: "Jueves 17:45-18:55" },
    "B2.1": { catedra: "Lunes y Miércoles 17:45-18:55", ayudantia: "Jueves 17:45-18:55" },
    "B2.2": { catedra: "Lunes y Miércoles 17:45-18:55", ayudantia: "Jueves 17:45-18:55" },
    "C1": { catedra: "Lunes y Miércoles 17:45-18:55", ayudantia: "Jueves 17:45-18:55" },
    "Default": { catedra: "[Horario por confirmar]", ayudantia: "[Horario por confirmar]" }
  }
};

/**
 * These parameters can be modified by the 'cargarDatosPrograma_' function.
 */
let PROGRAM_DATA: IProgramData = JSON.parse(JSON.stringify(DEFAULT_PROGRAM_DATA));

/**
 * Continuation parameters for students progressing from previous year.
 */
const CONTINUATION_MAP: Record<string, string> = {
  "B1+": "B2.1",
  "B2.1": "B2.2",
  "B2.2": "C1"
};
const CONTINUATION_MIN_ATTENDANCE = 80;
const CONTINUATION_MIN_GRADE = 40;

