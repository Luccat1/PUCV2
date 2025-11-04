import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const CourseScheduler = () => {
  const [courseData, setCourseData] = useState({
    courseName: '',
    teacherName: '',
    startDate: '',
    sessionsPerWeek: 2,
    classDays: ['monday', 'wednesday'],
    totalHours: 40,
    hourType: 'dgai', // pedagogical, chronological, o dgai
    startTime: '18:00', // Hora de inicio de la clase
    endTime: '20:00',   // Hora de fin de la clase
    hoursPerSession: 2, 
    recoverySessionsCount: 0, // número de sesiones de recuperación
    customExcludedDates: []
  });

  const [newExcludedDate, setNewExcludedDate] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [courseEndDate, setCourseEndDate] = useState('');

  // Feriados chilenos 2025
  const chileanHolidays2025 = [
    { date: '2025-01-01', name: 'Año Nuevo' },
    { date: '2025-04-18', name: 'Viernes Santo' },
    { date: '2025-04-19', name: 'Sábado Santo' },
    { date: '2025-05-01', name: 'Día del Trabajador' },
    { date: '2025-05-21', name: 'Día de las Glorias Navales' },
    { date: '2025-06-29', name: 'San Pedro y San Pablo' },
    { date: '2025-07-16', name: 'Día de la Virgen del Carmen' },
    { date: '2025-08-15', name: 'Asunción de la Virgen' },
    { date: '2025-09-18', name: 'Independencia Nacional' },
    { date: '2025-09-19', name: 'Glorias del Ejército' },
    { date: '2025-09-20', name: 'Feriado Puente Fiestas Patrias' },
    { date: '2025-10-12', name: 'Día de la Raza' },
    { date: '2025-10-31', name: 'Día de las Iglesias Evangélicas' },
    { date: '2025-11-01', name: 'Día de Todos los Santos' },
    { date: '2025-12-08', name: 'Inmaculada Concepción' },
    { date: '2025-12-25', name: 'Navidad' }
  ];

  const dayNames = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  const handleInputChange = (field, value) => {
    setCourseData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayToggle = (day) => {
    setCourseData(prev => ({
      ...prev,
      classDays: prev.classDays.includes(day)
        ? prev.classDays.filter(d => d !== day)
        : [...prev.classDays, day]
    }));
  };

  const addExcludedDate = () => {
    if (newExcludedDate && !courseData.customExcludedDates.includes(newExcludedDate)) {
      setCourseData(prev => ({
        ...prev,
        customExcludedDates: [...prev.customExcludedDates, newExcludedDate]
      }));
      setNewExcludedDate('');
    }
  };

  const removeExcludedDate = (dateToRemove) => {
    setCourseData(prev => ({
      ...prev,
      customExcludedDates: prev.customExcludedDates.filter(date => date !== dateToRemove)
    }));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getHolidayName = (dateStr) => {
    const holiday = chileanHolidays2025.find(h => h.date === dateStr);
    return holiday ? holiday.name : null;
  };

  const exportToExcel = () => {
    if (schedule.length === 0) {
      alert('No hay cronograma para exportar. Complete la configuración del curso.');
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    // Hoja 1: Resumen del curso
    const summaryData = [
      ['CRONOGRAMA DE CLASES'],
      [],
      ['Nombre del Curso:', courseData.courseName || 'Curso sin nombre'],
      ['Horario:', `${courseData.startTime} - ${courseData.endTime}`],
      ['Nombre del Profesor(a):', courseData.teacherName || 'No especificado'],
      ['Fecha de Inicio:', formatDate(courseData.startDate)],
      ['Fecha de Término:', formatDate(courseEndDate)],
      ['Total de Horas:', `${courseData.totalHours} horas ${
        courseData.hourType === 'pedagogical' ? 'pedagógicas' : 
        courseData.hourType === 'dgai' ? 'DGAI' : 'cronológicas'
      }`],
      ['Total de Sesiones:', `${schedule.length} sesiones`],
      ['Sesiones de Recuperación:', `${courseData.recoverySessionsCount} primeras sesiones con +0.5h cronológicas cada una`],
      ['Duración por Sesión Normal:', `${courseData.hoursPerSession} horas cronológicas`],
      ['Duración por Sesión Recuperación:', `${courseData.hoursPerSession + 0.5} horas cronológicas`],
      ['Días de Clase:', courseData.classDays.map(day => dayNames[day]).join(', ')],
      [],
      ['CALENDARIO DE SESIONES'],
      ['Sesión', 'Fecha', 'Día', 'Horas Cronológicas', 'Horas del Curso', 'Tipo', 'Horas Acumuladas', 'Observaciones']
    ]

    schedule.forEach(session => {
      const holidayName = getHolidayName(session.dateStr);
      let observations = [];
      if (holidayName) observations.push(`Cerca de feriado: ${holidayName}`);
      if (session.isMidCourse) observations.push('🎯 MITAD DEL CURSO');
      
      summaryData.push([
        `Sesión ${session.session}`,
        session.date.toLocaleDateString('es-CL'),
        session.dayName,
        `${courseData.startTime} - ${courseData.endTime}`,
        session.chronologicalHours,
        courseData.hourType !== 'chronological' ? session.effectiveHours.toFixed(1) : session.chronologicalHours,
        session.isRecovery ? 'RECUPERACIÓN' : 'Normal',
        session.accumulatedHours.toFixed(1),
        observations.join(' | ')
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Ajustar ancho de columnas
    summarySheet['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 35 }
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Cronograma');

    // Hoja 2: Calendario mensual
    const monthlyData = [['VISTA MENSUAL DEL CURSO'], []];
    
    if (schedule.length > 0) {
      const months = {};
      schedule.forEach(session => {
        const month = session.date.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' });
        if (!months[month]) months[month] = [];
        months[month].push(session);
      });

      Object.keys(months).forEach(month => {
        monthlyData.push([month.toUpperCase()], ['Fecha', 'Día', 'Sesión', 'Horas', 'Tipo', 'Notas']);

        months[month].forEach(session => {
          let notes = [];
          if (session.isMidCourse) notes.push('🎯 Mitad del curso');
          if (session.isRecovery) notes.push('Recuperación');

          monthlyData.push([
            session.date.toLocaleDateString('es-CL'),
            session.dayName,
            `Sesión ${session.session}`,
            `${session.chronologicalHours}h`,
            session.isRecovery ? 'Recuperación' : 'Normal',
            notes.join(' | ')
          ]);
        });
        monthlyData.push([]);
      });
    }

    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData)
    monthlySheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Vista Mensual');

    // Exportar archivo
    const filename = `${courseData.courseName || 'Cronograma_Curso'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const exportToPDF = () => {
    if (schedule.length === 0) {
      alert('No hay cronograma para exportar. Complete la configuración del curso.');
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>

      <html>
      <head>
        <title>Cronograma - ${courseData.courseName || 'Curso'}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;

          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .course-title {

            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #1e40af;
          }
          .course-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
          }
          .info-label {
            font-weight: bold;
          }
          .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .schedule-table th,
          .schedule-table td {
            border: 1px solid #ddd;
            padding: 12px 8px;
            text-align: left;
          }
          .schedule-table th {
            background-color: #1e40af;
            color: white;
            font-weight: bold;
          }
          .schedule-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .session-number {
            font-weight: bold;
            color: #1e40af;
          }

          .holiday-note {
            color: #dc2626;
            font-size: 12px;
          }
          .recovery-session {
            background-color: #eff6ff; /* Azul claro */
            font-weight: bold;
          }
          .midcourse-session {
            background-color: #f3e8ff;
            font-weight: bold;
          }
          .recovery-badge {
            background-color: #3b82f6; /* Azul */
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
          }
          .midcourse-badge {
            background-color: #8b5cf6;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .print-btn {
            background-color: #1e40af;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir / Exportar PDF</button>
        
        <div class="header">
          <div class="course-title">${courseData.courseName || 'CRONOGRAMA DE CLASES'}</div>
          ${courseData.teacherName ? `<div class="course-teacher">Profesor(a): ${courseData.teacherName}</div>` : ''}
          <div class="course-schedule">Horario: ${courseData.startTime} - ${courseData.endTime}</div>
          <div>Planificación de Curso de Formación Continua</div>
        </div>

        <div class="course-info">
          <div class="info-item">
            <span class="info-label">Fecha de Inicio:</span>
            <span>${formatDate(courseData.startDate)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Fecha de Término:</span>
            <span>${formatDate(courseEndDate)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total de Horas:</span>
            <span>${courseData.totalHours} horas ${
              courseData.hourType === 'pedagogical' ? 'pedagógicas' : 
              courseData.hourType === 'dgai' ? 'DGAI' : 'cronológicas'
            }</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total de Sesiones:</span>
            <span>${schedule.length} sesiones (${courseData.recoverySessionsCount} de recuperación)</span>
          </div>
          <div class="info-item">
            <span class="info-label">Profesor(a):</span>
            <span>${courseData.teacherName || 'No especificado'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Duración por Sesión:</span>
            <span>${courseData.hoursPerSession}h cronológicas / ${courseData.hoursPerSession + 0.5}h en recuperación</span>
          </div>
          <div class="info-item">
            <span class="info-label">Días de Clase:</span>
            <span>${courseData.classDays.map(day => dayNames[day]).join(', ')}</span>
          </div>
        </div>

        <table class="schedule-table">
          <thead>
            <tr>
              <th>Sesión</th>
              <th>Fecha</th>
              <th>Día</th>
              <th>Horario</th>
              <th>Horas Cronológicas</th>
              ${courseData.hourType !== 'chronological' ? `<th>Horas ${courseData.hourType === 'pedagogical' ? 'Pedagógicas' : 'DGAI'}</th>` : ''}
              <th>Tipo</th>
              <th>Horas Acumuladas</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${schedule.map(session => {
              const holidayName = getHolidayName(session.dateStr);
              let rowClass = '';
              if (session.isRecovery) rowClass = 'recovery-session';
              else if (session.isMidCourse) rowClass = 'midcourse-session';
              
              return `
                <tr ${rowClass ? `class="${rowClass}"` : ''}>
                  <td class="session-number">Sesión ${session.session}</td>
                  <td>${session.date.toLocaleDateString('es-CL')}</td>
                  <td>${session.dayName}</td>
                  <td>${courseData.startTime} - ${courseData.endTime}</td>
                  <td>${session.chronologicalHours}h</td>
                  ${courseData.hourType !== 'chronological' ? `<td>${session.effectiveHours.toFixed(1)}h</td>` : ''}
                  <td>
                    ${session.isRecovery ? '<span class="recovery-badge">RECUPERACIÓN</span>' : 'Normal'}
                    ${session.isMidCourse ? '<br><span class="midcourse-badge">MITAD DEL CURSO</span>' : ''}
                  </td>
                  <td>${session.accumulatedHours.toFixed(1)}h</td>
                  <td>${holidayName ? `<div class="holiday-note">Cerca de: ${holidayName}</div>` : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleDateString('es-CL')} • Calculadora de Fechas para Cursos</p>
          <p>Este cronograma considera feriados nacionales chilenos y fechas personalizadas excluidas</p>
          ${courseData.recoverySessionsCount > 0 ? `<p><strong>Sesiones de recuperación:</strong> Las primeras ${courseData.recoverySessionsCount} sesiones tienen 30 minutos adicionales para acelerar el curso.</p>` : ''}
          ${schedule.some(s => s.isMidCourse) ? `<p><strong>Mitad del curso:</strong> Se alcanza en la sesión ${schedule.find(s => s.isMidCourse)?.session} (${courseData.totalHours/2} horas completadas)</p>` : ''}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const isDateExcluded = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    
    // Verificar si es domingo (los sábados son hábiles para cursos de formación continua)
    if (dayOfWeek === 0) return true;
    
    // Verificar feriados nacionales
    if (chileanHolidays2025.some(holiday => holiday.date === dateStr)) return true;
    
    // Verificar fechas personalizadas excluidas
    if (courseData.customExcludedDates.includes(dateStr)) return true;
    
    return false;
  };

  const getDayOfWeekNumber = (dayName) => {
    const mapping = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };
    return mapping[dayName];
  };

  const calculateSchedule = () => {
    if (!courseData.startDate || courseData.classDays.length === 0) return;

    const startDate = new Date(courseData.startDate);
    
    // Calcular cuántas horas (del tipo especificado) se cubren en cada sesión normal
    const getEffectiveHours = (chronologicalHours, hourType) => {
      if (hourType === 'pedagogical') {
        return (chronologicalHours * 60) / 45; // minutos de sesión / 45 min por hora pedagógica
      } else if (hourType === 'dgai') {
        return (chronologicalHours * 60) / 35; // minutos de sesión / 35 min por hora DGAI
      } else {
        return chronologicalHours; // cronológicas es 1:1
      }
    };

    const effectiveHoursPerNormalSession = getEffectiveHours(courseData.hoursPerSession, courseData.hourType);
    const effectiveHoursPerRecoverySession = getEffectiveHours(courseData.hoursPerSession + 0.5, courseData.hourType);

    // Calcular horas totales que se cubrirán con sesiones de recuperación
    const recoveryHours = courseData.recoverySessionsCount * (effectiveHoursPerRecoverySession - effectiveHoursPerNormalSession);
    
    // Horas restantes que deben cubrirse con sesiones normales
    const remainingHours = courseData.totalHours - recoveryHours;
    const normalSessionsNeeded = Math.max(0, Math.ceil(remainingHours / effectiveHoursPerNormalSession));
    
    const totalSessions = normalSessionsNeeded + courseData.recoverySessionsCount;
    const sessionSchedule = [];
    
    let currentDate = new Date(startDate);
    let sessionsCompleted = 0;
    let weeksChecked = 0;
    const maxWeeks = 104; // Límite de seguridad (2 años)
    
    // Determinar cuáles sesiones serán de recuperación (las primeras N sesiones)
    const recoverySessionNumbers = [];
    if (courseData.recoverySessionsCount > 0) {
      for (let i = 1; i <= courseData.recoverySessionsCount; i++) {
        recoverySessionNumbers.push(i);
      }
    }
    
    // Variables para calcular la mitad del curso
    let accumulatedHours = 0;
    const halfCourseHours = courseData.totalHours / 2;
    let midCourseSessionFound = false;
    
    while (sessionsCompleted < totalSessions && weeksChecked < maxWeeks) {
      // Buscar el próximo día de clase válido
      const targetDays = courseData.classDays.map(getDayOfWeekNumber);
      const currentDayNum = currentDate.getDay();
      
      if (targetDays.includes(currentDayNum) && !isDateExcluded(currentDate)) {
        sessionsCompleted++;
        const isRecoverySession = recoverySessionNumbers.includes(sessionsCompleted);
        const sessionEffectiveHours = isRecoverySession ? effectiveHoursPerRecoverySession : effectiveHoursPerNormalSession;
        
        // Determinar si esta sesión marca la mitad del curso
        const previousAccumulatedHours = accumulatedHours;
        accumulatedHours += sessionEffectiveHours;
        const isMidCourse = !midCourseSessionFound && previousAccumulatedHours < halfCourseHours && accumulatedHours >= halfCourseHours;
        
        if (isMidCourse) {
          midCourseSessionFound = true;
        }
        
        sessionSchedule.push({
          session: sessionsCompleted,
          date: new Date(currentDate),
          dateStr: currentDate.toISOString().split('T')[0],
          dayName: dayNames[Object.keys(dayNames)[currentDayNum - 1]] || 'Domingo',
          effectiveHours: sessionEffectiveHours,
          isRecovery: isRecoverySession,
          chronologicalHours: isRecoverySession ? courseData.hoursPerSession + 0.5 : courseData.hoursPerSession,
          isMidCourse: isMidCourse,
          accumulatedHours: accumulatedHours
        });
      }
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Contar semanas para evitar bucles infinitos
      if (currentDate.getDay() === 1) { // Si es lunes
        weeksChecked++;
      }
    }
    
    setSchedule(sessionSchedule);
    if (sessionSchedule.length > 0) {
      setCourseEndDate(sessionSchedule[sessionSchedule.length - 1].dateStr);
    }
  };

  useEffect(() => {
    calculateSchedule();
  }, [courseData]);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="flex items-center mb-6">
          <BookOpen className="text-blue-600 mr-3" size={32} />
          <h1 className="text-3xl font-bold text-gray-800">Calculadora de Fechas para Cursos</h1>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Panel de Configuración */}
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="mr-2 text-blue-600" size={20} />
                Configuración del Curso
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Curso
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Curso de Administración de Empresas"
                    value={courseData.courseName}
                    onChange={(e) => handleInputChange('courseName', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Profesor(a)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Ana González"
                    value={courseData.teacherName}
                    onChange={(e) => handleInputChange('teacherName', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Botones de Exportación */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
                    <BookOpen className="mr-2" size={16} />
                    Exportar Cronograma
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={exportToExcel}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      📊 Excel
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      📄 PDF
                    </button>
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    Genera calendarios profesionales para estudiantes y profesores con sesiones de recuperación y marcadores de progreso
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={courseData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sesiones por Semana
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={courseData.sessionsPerWeek}
                      onChange={(e) => handleInputChange('sessionsPerWeek', parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de Inicio
                    </label>
                    <input
                      type="time"
                      value={courseData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de Fin
                    </label>
                    <input
                      type="time"
                      value={courseData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duración de Cada Sesión (horas cronológicas)
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={courseData.hoursPerSession}
                      onChange={(e) => handleInputChange('hoursPerSession', parseFloat(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total de Horas del Curso
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={courseData.totalHours}
                      onChange={(e) => handleInputChange('totalHours', parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sesiones de Recuperación (+0.5h cronológicas)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={courseData.recoverySessionsCount}
                      onChange={(e) => handleInputChange('recoverySessionsCount', parseInt(e.target.value) || 0)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">

                      Las primeras N sesiones durarán más tiempo
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Horas
                  </label>
                  <div className="flex flex-col space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hourType"
                        value="pedagogical"
                        checked={courseData.hourType === 'pedagogical'}
                        onChange={(e) => handleInputChange('hourType', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">Pedagógicas (45 min)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hourType"
                        value="chronological"
                        checked={courseData.hourType === 'chronological'}
                        onChange={(e) => handleInputChange('hourType', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">Cronológicas (60 min)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hourType"
                        value="dgai"
                        checked={courseData.hourType === 'dgai'}
                        onChange={(e) => handleInputChange('hourType', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">DGAI (35 min)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Días de Clases
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(dayNames).map(([key, name]) => (
                      <label key={key} className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={courseData.classDays.includes(key)}
                          onChange={() => handleDayToggle(key)}
                          className="mr-2"
                        />
                        <span className="text-sm">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fechas a Excluir (Personalizadas)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="date"
                      value={newExcludedDate}
                      onChange={(e) => setNewExcludedDate(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addExcludedDate}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Agregar
                    </button>
                  </div>
                  
                  {courseData.customExcludedDates.length > 0 && (
                    <div className="space-y-1">
                      {courseData.customExcludedDates.map(date => (
                        <div key={date} className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span className="text-sm">{formatDate(date)}</span>
                          <button
                            onClick={() => removeExcludedDate(date)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Resultados */}
          <div className="space-y-6">
            {schedule.length > 0 && (
              <>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <CheckCircle className="mr-2 text-green-600" size={20} />
                    Resumen del Curso
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Fecha de Inicio:</span>
                      <p className="text-gray-900">{formatDate(courseData.startDate)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Fecha de Término:</span>
                      <p className="text-gray-900">{formatDate(courseEndDate)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total de Sesiones:</span>
                      <p className="text-gray-900">
                        {schedule.length} sesiones
                        {courseData.recoverySessionsCount > 0 && (
                          <span className="text-blue-600 text-xs ml-1">
                            ({courseData.recoverySessionsCount} de recuperación)
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Duración:</span>
                      <p className="text-gray-900">{Math.ceil((new Date(courseEndDate) - new Date(courseData.startDate)) / (1000 * 60 * 60 * 24 * 7))} semanas aprox.</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700">Por sesión:</span>
                      <p className="text-gray-900">
                        {courseData.hoursPerSession}h cronológicas normales
                        {courseData.recoverySessionsCount > 0 && (
                          <span className="text-blue-600">
                            {' + '}
                            {courseData.hoursPerSession + 0.5}h en recuperación
                          </span>
                        )}
                        {courseData.hourType !== 'chronological' && schedule.length > 0 && (
                          <div className="text-blue-600 text-sm">
                            = {schedule.find(s => !s.isRecovery)?.effectiveHours.toFixed(1)}h {courseData.hourType === 'pedagogical' ? 'pedagógicas' : 'DGAI'} normales
                            {courseData.recoverySessionsCount > 0 && schedule.find(s => s.isRecovery) && (
                              <span> / {schedule.find(s => s.isRecovery)?.effectiveHours.toFixed(1)}h {courseData.hourType === 'pedagogical' ? 'pedagógicas' : 'DGAI'} en recuperación</span>
                            )}
                          </div>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Clock className="mr-2 text-blue-600" size={20} />
                    Cronograma de Clases
                  </h2>
                  
                  <div className="space-y-2">
                    {schedule.map((session) => {
                      const holidayName = getHolidayName(session.dateStr);
                      return (
                        <div key={session.session} className={`flex justify-between items-center p-3 rounded border ${                          session.isRecovery ? 'bg-blue-50 border-blue-200' : 
                          session.isMidCourse ? 'bg-purple-50 border-purple-300' : 'bg-white'
                        }`}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-blue-600">Sesión {session.session}</span>
                              {session.isRecovery && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                                  RECUPERACIÓN
                                </span>
                              )}
                              {session.isMidCourse && (
                                <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">
                                  MITAD DEL CURSO
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {session.date.toLocaleDateString('es-CL', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                              })}
                            </p>

                            {holidayName && (
                              <p className="text-xs text-red-600 flex items-center">
                                <AlertCircle size={12} className="mr-1" />
                                Cerca de: {holidayName}
                              </p>
                            )}
                            {session.isMidCourse && (
                              <p className="text-xs text-purple-600 font-medium">
                                Se completan {session.accumulatedHours.toFixed(1)} horas ({(session.accumulatedHours / courseData.totalHours * 100).toFixed(1)}% del curso)
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div className="font-medium">
                              {session.chronologicalHours}h cronológicas

                            </div>
                            {courseData.hourType !== 'chronological' && (
                              <div className="text-xs text-blue-600">
                                ({session.effectiveHours.toFixed(1)}h {courseData.hourType === 'pedagogical' ? 'pedagógicas' : 'DGAI'})
                              </div>
                            )}
                            {session.isRecovery && (
                              <div className="text-xs text-blue-600 font-medium">
                                +30 min extra
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
                    <AlertCircle className="mr-2" size={16} />
                    Feriados Nacionales Considerados (2025)
                  </h3>
                  <div className="text-xs text-yellow-700 grid grid-cols-1 gap-1">
                    {chileanHolidays2025.slice(0, 6).map(holiday => (
                      <span key={holiday.date}>{holiday.name} ({new Date(holiday.date + 'T00:00:00').toLocaleDateString('es-CL')})</span>
                    ))}
                    <span className="italic">+ {chileanHolidays2025.length - 6} feriados más...</span>
                  </div>
                </div>

                {courseData.recoverySessionsCount > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                      <Clock className="mr-2" size={16} />
                      Sesiones de Recuperación
                    </h3>
                    <div className="text-xs text-blue-700">
                      <p>Las primeras {courseData.recoverySessionsCount} sesiones del curso tendrán 30 minutos cronológicos adicionales cada una.</p>
                      <p>Las sesiones 1 a la {courseData.recoverySessionsCount} durarán {courseData.hoursPerSession + 0.5}h cronológicas en lugar de {courseData.hoursPerSession}h normales.</p>
                      <p>Esto permite acelerar el avance inicial del curso y terminarlo con menos sesiones totales.</p>
                    </div>
                  </div>
                )}

                {schedule.some(s => s.isMidCourse) && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-800 mb-2 flex items-center">
                      <BookOpen className="mr-2" size={16} />
                      Mitad del Curso
                    </h3>
                    <div className="text-xs text-purple-700">
                      <p>El curso de {courseData.totalHours} horas llega a su mitad ({courseData.totalHours/2} horas) en la sesión {schedule.find(s => s.isMidCourse)?.session}.</p>
                      <p>Esta marca es útil para evaluar el progreso y planificar evaluaciones de medio término.</p>
                      <p>Fecha estimada: {schedule.find(s => s.isMidCourse) ? formatDate(schedule.find(s => s.isMidCourse)?.dateStr) : 'N/A'}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {schedule.length === 0 && courseData.startDate && (
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <AlertCircle className="mx-auto text-gray-400 mb-2" size={48} />
                <p className="text-gray-600">Configura todos los campos para ver el cronograma</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default CourseScheduler;