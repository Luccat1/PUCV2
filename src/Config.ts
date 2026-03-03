/**
 * @file Config.ts
 * Centralizes all configuration, data structures, and types for the PUCV2 project.
 * Important: This project is container-bound; SHEET_ID is not used.
 */

// --- TYPES & INTERFACES ---

/**
 * Status of an applicant during the selection process.
 */
type ApplicantStatus = 'Pendiente' | 'Seleccionado' | 'Notificado' | 'Acepta' | 'Rechaza' | 'Excluido';

/**
 * Configuration for Sheet names and Column headers.
 */
interface IConfig {
  SHEETS: {
    INPUT: string;
    OUTPUT: string;
    DASHBOARD: string;
    CONFIG: string;
    SELECTED: string;
    FINAL_LIST: string;
  };
  COLUMNS: Record<string, string>;
}

/**
 * Program specific data like dates and class schedules.
 */
interface IProgramData {
  FECHA_LIMITE: string;
  FECHA_INICIO: string;
  FECHA_TERMINO: string;
  HORARIOS: Record<string, { catedra: string; ayudantia: string }>;
}

/**
 * Parameters for the automated scoring engine.
 */
interface IScoringParams {
  UsoIngles: {
    Frecuencia: Record<string, number>;
    Actividades: Record<string, number>;
    PalabrasClaveContribucion: string[];
    PuntajePorPalabraClave: number;
    MaxPuntaje: number;
    peso: Record<string, number>;
  };
  Internacionalizacion: {
    PalabrasClavePlan: string[];
    PuntajePorPalabraClave: number;
    MaxPuntaje: number;
    peso: Record<string, number>;
  };
  CartaRespaldo: {
    peso: Record<string, any>;
  };
}

/**
 * Metadata for a processed applicant.
 */
interface IApplicantResult {
  apellido: string;
  nombre: string;
  correo: string;
  rut: string;
  fecha: string;
  categoria: string;
  sede: string;
  puntajes: {
    disponibilidad: number;
    tipo: number;
    usoIngles: number;
    intl: number;
    nivelIngles: number;
    anioIngreso: number;
    compromiso: number;
    carta: number;
    total: number;
  };
  enlaceCertificado: string;
}

/**
 * Statistics for the dashboard.
 */
interface IStatistics {
  totalPostulantes: number;
  puntajePromedio: number;
  puntajeMaximo: number;
  puntajeMinimo: number;
  statsPorCategoria: Record<string, { suma: number; contador: number }>;
  statsPorSede: Record<string, { suma: number; contador: number }>;
  statsPorAnio: Record<string, { suma: number; contador: number }>;
  statsCruzados: Record<string, Record<string, { suma: number; contador: number }>>;
}

// --- CONSTANTS ---

const CONFIG: IConfig = {
  SHEETS: {
    INPUT: "Respuestas de formulario 1",
    OUTPUT: "Evaluación automatizada",
    DASHBOARD: "Dashboard",
    CONFIG: "Configuración",
    SELECTED: "Seleccionados",
    FINAL_LIST: "Lista Final Curso"
  },
  COLUMNS: {
    PROCESSING_STATUS: "Estado de Procesamiento",
    TIMESTAMP: "Marca temporal",
    EMAIL: "Dirección de correo electrónico",
    FIRST_NAME: "Primer nombre",
    SECOND_NAME: "Segundo nombre",
    LAST_NAME_P: "Apellido paterno",
    LAST_NAME_M: "Apellido materno",
    RUT: "RUT",
    APPLICANT_TYPE: "Indica si eres funcionario, alumno, profesor, académico, etc.",
    CAMPUS: "¿En qué sede realizas la mayoría de tus actividades académicas o profesionales?",
    AVAILABILITY_SESSIONS: "¿Tienes disponibilidad para dedicar 3 sesiones semanales?",
    AVAILABILITY_CONFLICTS: "¿Tienes compromisos académicos/laborales que podrían impedir cumplir con la asistencia obligatoria?",
    AVAILABILITY_ASSISTANCE: "¿Estás en condiciones de asistir al menos al 80 % de las clases?",
    AVAILABILITY_STUDY: "¿Puedes comprometerse a dedicar 4 horas semanales de estudio autónomo además de las clases?",
    ENGLISH_USE_FREQUENCY: "¿Con qué frecuencia requieres utilizar el idioma inglés en tus funciones actuales?",
    ENGLISH_USE_ACTIVITIES: "Seleccione las actividades que realizas en inglés como parte de tus funciones:",
    ENGLISH_USE_FUTURE_PROJECTS: "¿Tu unidad tiene proyectos futuros que requerirán mayor uso del inglés?",
    ENGLISH_USE_CONTRIBUTION: "¿Cómo contribuiría el mejoramiento de tu nivel de inglés a tu desempeño profesional?",
    INTL_STAGE: "¿En qué etapa se encuentra tu proceso de internacionalización?",
    INTL_PLAN: "¿Cómo has planeado internacionalizar tu carrera?",
    INTL_SUPPORT_DOCS: "Adjunta los documentos de respaldo",
    CERTIFICATE_CHECKBOX: "En caso de que no tengas certificación de inglés, marca esta casilla:",
    CERTIFICATE_ATTACHMENT: "Adjunta la certificación que permita verificar tu nivel de inglés más alto (certificado oficial, captura con aprobación y nota final de la asignatura u otros).",
    CERTIFICATE_LEVEL: "Certificación de inglés",
    ENTRY_YEAR: "¿En qué año ingresaste a tu carrera actual?",
    COMMITMENT_PROGRAM: "Compromiso con el programa ",
    COMMITMENT_VERACITY: "Veracidad de la información",
    COMMITMENT_BREACH: "Consecuencias por incumplimiento",
    ENDORSEMENT_APPROVAL: "¿Cuentas con el respaldo de tu jefatura directa para participar en este programa?",
    ENDORSEMENT_LETTER: "Si la respuesta anterior fue \"Sí\", por favor, adjunta una carta de respaldo de tu jefatura?\" [Nota: Opcional, pero otorga puntaje adicional]",
    ENDORSEMENT_SCHEDULE: "¿Tu jefatura está en conocimiento y aprueba tu participación en el horario establecido?"
  }
};

/**
 * These parameters can be modified by the 'cargarConfiguracionDesdeHoja' function.
 */
let SCORING_PARAMS: IScoringParams = {
  UsoIngles: {
    Frecuencia: { "diariamente": 1.5, "semanalmente": 1, "mensualmente": 0.5 },
    Actividades: { "visitas internacionales": 1, "presentaciones": 1, "reuniones": 0.75, "clases": 0.5, "papers": 0.5, "correos": 0.25, "leer documentación": 0.25 },
    PalabrasClaveContribucion: ["proyección", "internacional", "colaborar", "crecimiento", "oportunidades", "movilidad", "publicar", "desarrollo"],
    PuntajePorPalabraClave: 0.25,
    MaxPuntaje: 4,
    peso: {
      estudiante: 0.75,
      funcionario: 1,
      academico: 1
    }
  },
  Internacionalizacion: {
    PalabrasClavePlan: ["pasantía", "postdoctorado", "doctorado", "magíster", "investigación", "colaboración", "congreso", "publicar"],
    PuntajePorPalabraClave: 0.5,
    MaxPuntaje: 5,
    peso: {
      estudiante: 1,
      funcionario: 0.75,
      academico: 1
    }
  },
  CartaRespaldo: {
    peso: {
      estudiante: 0.5,
      funcionario: 1,
      academico: 1,
      _perfil: {
        estudiante: "perfil",
      }
    }
  }
};

const PROGRAM_DATA: IProgramData = {
  FECHA_LIMITE: "jueves 11 de diciembre",
  FECHA_INICIO: "23 de marzo de 2026",
  FECHA_TERMINO: "2 de julio de 2026",
  HORARIOS: {
    "B1+": { catedra: "Lunes y Miércoles 17:45-18:55", ayudantia: "Jueves 17:45-18:55" },
    "B2.1": { catedra: "Lunes y Miércoles 17:45-18:55", ayudantia: "Jueves 17:45-18:55" },
    "B2.2": { catedra: "Lunes y Miércoles 17:45-18:55", ayudantia: "Jueves 17:45-18:55" },
    "C1": { catedra: "Lunes y Miércoles 17:45-18:55", ayudantia: "Jueves 17:45-18:55" },
    "Default": { catedra: "[Horario por confirmar]", ayudantia: "[Horario por confirmar]" }
  }
};
