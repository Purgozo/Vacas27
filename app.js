/**
 * Vacas27 — app.js
 * Lógica pura + render + persistencia + eventos
 * Año fijo: 2027
 */

// ========================================
// CONSTANTES & CONFIG
// ========================================
const YEAR = 2027;
const COLORS = ['#f06292', '#81c784', '#64b5f6']; // Color 0=rosa, 1=verde, 2=azul (evita conflicto con festivos)
const STORAGE_KEY = 'vacas27-state-v1';

// Semana 1 = lunes 4 ene 2027
const WEEK1_MONDAY = new Date(YEAR, 0, 4); // 2027-01-04

// Grupo 1..6 -> día de libranza semana 1 (0=lun, 1=mar, ..., 5=sáb, 6=dom)
// G1:mar(1), G2:mié(2), G3:jue(3), G4:vie(4), G5:sáb(5), G6:lun(0)
const GRUPO_BASE_DAY = [1, 2, 3, 4, 5, 0]; // índice 0 = Grupo 1

// ----- Festivos 2027 -----
const FIXED_HOLIDAYS = {
  '2027-01-01': 'Año Nuevo',
  '2027-01-06': 'Epifanía',
  '2027-02-10': 'Carnaval',
  '2027-03-01': 'Día de Baleares',
  '2027-03-26': 'Viernes Santo',
  '2027-05-01': 'Día del Trabajo',
  '2027-09-08': 'Día de Asturias',
  '2027-10-12': 'Fiesta Nacional',
  '2027-11-01': 'Todos los Santos',
  '2027-12-06': 'Constitución',
  '2027-12-08': 'Inmaculada',
  '2027-12-25': 'Navidad',
};

const WORKING_HOLIDAYS = {
  '2027-03-25': 'Anunciación',
  '2027-08-16': 'San Roque',
};

// ----- Festivos locales (configurables, por defecto 10 feb y 8 sep) -----
const LOCAL_HOLIDAYS_DEFAULT = {
  '2027-02-10': 'Festivo local 1',
  '2027-09-08': 'Festivo local 2',
};

const LOCAL_HOLIDAYS_KEY = 'vacas27-local-holidays';

/**
 * Muestra un mensaje al usuario (toast notification)
 * @param {string} message - Mensaje a mostrar
 * @param {boolean} isError - Si es un mensaje de error
 */
function showMessage(message, isError = false) {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = 'notification' + (isError ? ' error' : '');
  notification.textContent = message;
  
  // Estilos inline para la notificación
  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    background: isError ? '#ffebee' : '#e8f5e9',
    color: isError ? '#c62828' : '#2e7d32',
    fontSize: '0.9rem',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '10000',
    animation: 'slideIn 0.3s ease-out',
    maxWidth: '90vw'
  });
  
  document.body.appendChild(notification);
  
  // Auto-eliminar después de 3 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function loadLocalHolidays() {
  // En Node.js (tests), localStorage no existe
  if (typeof localStorage === 'undefined') {
    return { ...LOCAL_HOLIDAYS_DEFAULT };
  }
  try {
    const raw = localStorage.getItem(LOCAL_HOLIDAYS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error cargando festivos locales:', e);
  }
  // Primera vez: guardar por defecto
  localStorage.setItem(LOCAL_HOLIDAYS_KEY, JSON.stringify(LOCAL_HOLIDAYS_DEFAULT));
  return { ...LOCAL_HOLIDAYS_DEFAULT };
}

const LOCAL_HOLIDAYS = loadLocalHolidays();

/**
 * Guarda los festivos locales en localStorage
 * @param {Object} holidays - Objeto con festivos locales { 'YYYY-MM-DD': 'nombre' }
 * @returns {boolean} true si se guardó correctamente
 */
function saveLocalHolidays(holidays) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(LOCAL_HOLIDAYS_KEY, JSON.stringify(holidays));
    return true;
  } catch (e) {
    console.error('Error guardando festivos locales:', e);
    return false;
  }
}

/**
 * Limpia los días pintados que coincidan con festivos locales
 * Se llama cuando se añaden nuevos festivos locales
 * @param {Object} newHolidays - Nuevos festivos locales añadidos { 'YYYY-MM-DD': 'nombre' }
 */
function cleanLocalHolidaysPaintedDays(newHolidays) {
  if (typeof localStorage === 'undefined') return;
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    
    const state = JSON.parse(raw);
    let modified = false;
    
    for (const date of Object.keys(newHolidays)) {
      if (state.paintedDays && date in state.paintedDays) {
        delete state.paintedDays[date];
        modified = true;
      }
    }
    
    if (modified) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.warn('Error limpiando días pintados por festivos locales:', e);
  }
}

/**
 * Verifica si una fecha es festivo (no laborable o laborable)
 */
function isHoliday(date) {
  const key = toKey(date);
  if (key in FIXED_HOLIDAYS) return true;
  if (key in WORKING_HOLIDAYS) return true;
  if (key in LOCAL_HOLIDAYS) return true;
  // Domingos = festivo no laborable, excepto 26 jun - 29 ago
  if (getWeekday(date) === 6) {
    const d = date.getDate();
    const m = date.getMonth(); // 0-indexed
    // Excepción: domingos 26 jun – 29 ago = laborables
    if ((m === 5 && d >= 26) || m === 6 || (m === 7 && d <= 29)) {
      return true; // sigue siendo festivo pero laborable
    }
    return true; // domingo normal = festivo no laborable
  }
  return false;
}

/**
 * Verifica si un festivo es laborable (se trabaja)
 */
function isWorkingHoliday(date) {
  const key = toKey(date);
  if (key in WORKING_HOLIDAYS) return true;
  // Domingos 26 jun – 29 ago
  if (getWeekday(date) === 6) {
    const d = date.getDate();
    const m = date.getMonth();
    if ((m === 5 && d >= 26) || m === 6 || (m === 7 && d <= 29)) return true;
  }
  return false;
}

/**
 * Verifica si un festivo BLOQUEA la pintura (se salta en rangos)
 * Solo los 14 festivos fijos + festivos locales: 12 no laborables + 2 laborables (25 mar, 16 ago) + locales
 * Los domingos NO bloquean (se pintan normal)
 */
function isBlockingHoliday(date) {
  const key = toKey(date);
  return key in FIXED_HOLIDAYS || key in WORKING_HOLIDAYS || key in LOCAL_HOLIDAYS;
}

/**
 * Cuenta domingos que están pintados (en vacaciones)
 * Se recalcula cada vez, no se persiste
 */
function countSundaysInVacation(paintedDays) {
  let count = 0;
  for (const key of Object.keys(paintedDays)) {
    const date = fromKey(key);
    if (getWeekday(date) === 6) { // domingo
      count++;
    }
  }
  return count;
}

/**
 * Cuenta días de descanso (libranza) que caen en días pintados (vacaciones)
 * EXCLUYE domingos (ya contados en "Domingos en vacaciones")
 * Se recalcula cada vez, no se persiste
 */
function countRestDaysInVacation(paintedDays, grupo) {
  let count = 0;
  for (const key of Object.keys(paintedDays)) {
    const date = fromKey(key);
    if (isLibranza(date, grupo)) {
      count++;
    }
  }
  // Restar domingos (ya contados en "Domingos en vacaciones")
  return count - countSundaysInVacation(paintedDays);
}

/**
 * Cuenta festivos fijos (incluye laborables y locales) que caen en día de libranza del grupo
 * EXCLUYE domingos
 * Se recalcula cada vez, no se persiste
 */
function countHolidaysOnRestDays(grupo) {
  let count = 0;
  const allHolidays = { ...FIXED_HOLIDAYS, ...WORKING_HOLIDAYS, ...LOCAL_HOLIDAYS };
  
  for (const [key, name] of Object.entries(allHolidays)) {
    const date = fromKey(key);
    // Excluir domingos
    if (getWeekday(date) === 6) continue;
    // Verificar si es día de libranza para el grupo
    if (isLibranza(date, grupo)) count++;
  }
  return count;
}

/**
 * Devuelve la lista de festivos locales para mostrar en la UI
 * @returns {Object} { 'YYYY-MM-DD': 'nombre' }
 */
function getLocalHolidays() {
  return { ...LOCAL_HOLIDAYS };
}

// ========================================
// LÓGICA PURA (sin DOM, testeable)
// ========================================

/**
 * Devuelve el día de la semana (0=lun..6=dom) para una fecha
 */
function getWeekday(date) {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1; // JS: 0=dom -> nuestro 6=dom
}

/**
 * Devuelve el número de semana ISO-ish (semana 1 = lunes 4 ene)
 * Lunes = inicio de semana
 * Usa componentes locales para evitar problemas con DST (horario de verano)
 */
function getWeekNumber(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const dateNoon = new Date(y, m, d, 12, 0, 0); // mediodía local
  const diff = dateNoon.getTime() - WEEK1_MONDAY.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 0) return 0; // antes de semana 1
  return Math.floor(days / 7) + 1;
}

/**
 * Turno para una semana dada (1-indexed)
 * @param {number} weekNum - número de semana (1 = primera semana)
 * @param {string} turno - 'M' | 'T' | 'A' | 'B'
 * @returns {'M'|'T'}
 */
function getTurnoForWeek(weekNum, turno) {
  switch (turno) {
    case 'M': return 'M';
    case 'T': return 'T';
    case 'A': return (weekNum % 2 === 1) ? 'T' : 'M'; // semana 1 = T
    case 'B': return (weekNum % 2 === 1) ? 'M' : 'T'; // semana 1 = M
    default: return 'M';
  }
}

/**
 * Día de libranza (0=lun..6=dom) para un grupo y semana
 * @param {number} grupo - 1..6
 * @param {number} weekNum - número de semana (1-indexed)
 * @returns {number} 0..6
 */
function getLibranzaDay(grupo, weekNum) {
  const base = GRUPO_BASE_DAY[grupo - 1];
  // Cada semana avanza 1 día, ciclo de 6 días (lun-sáb), domingo siempre libre
  const offset = (weekNum - 1) % 6;
  let day = (base + offset) % 6; // 0..5 (lun-sáb)
  return day;
}

/**
 * Verifica si una fecha es día de libranza para el grupo
 */
function isLibranza(date, grupo) {
  const wd = getWeekday(date);
  if (wd === 6) return true; // domingo siempre
  const weekNum = getWeekNumber(date);
  if (weekNum < 1) return false;
  return wd === getLibranzaDay(grupo, weekNum);
}

/**
 * Genera todas las fechas del año 2027 organizadas por semanas completas (lun-dom)
 * Devuelve array de semanas, cada semana = array de 7 Date objects (lun..dom)
 */
function generateYearWeeks() {
  const weeks = [];
  let current = new Date(YEAR, 0, 1); // 1 ene 2027

  // Retroceder al lunes de la semana del 1 ene
  const wd = getWeekday(current);
  current.setDate(current.getDate() - wd);

  // Iterar mientras la semana tenga días en 2027
  // La semana tiene días en 2027 si el lunes <= 31 dic 2027 Y el domingo >= 1 ene 2027
  const endOfYear = new Date(YEAR, 11, 31);
  const startOfYear = new Date(YEAR, 0, 1);

  while (current <= endOfYear) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      week.push(d);
    }
    weeks.push(week);
    current.setDate(current.getDate() + 7);
    if (weeks.length > 55) break; // seguridad
  }
  return weeks;
}

/**
 * Agrupa semanas por mes visual según regla:
 * - Cada mes empieza en su primer lunes
 * - Las semanas se asignan al mes cuyo primer lunes <= lunes de la semana < primer lunes del mes siguiente
 * - Semanas antes del primer lunes de enero se asignan a enero
 * Devuelve: { month: 0-11, weeks: Week[] }[]
 */
function groupWeeksByVisualMonth(weeks) {
  // Calcular primer lunes de cada mes 2027
  const firstMondays = [];
  for (let m = 0; m < 12; m++) {
    let d = new Date(YEAR, m, 1);
    const wd = getWeekday(d);
    // Si el 1 no es lunes, avanzar al siguiente lunes
    if (wd !== 0) {
      d.setDate(d.getDate() + (7 - wd));
    }
    firstMondays.push(d);
  }

  const months = [];
  let currentMonth = 0;
  let currentMonthWeeks = [];

  for (const week of weeks) {
    const monday = week[0];
    // Determinar mes visual: el último primer lunes <= este lunes
    let visualMonth = 0;
    for (let m = 11; m >= 0; m--) {
      if (monday >= firstMondays[m]) {
        visualMonth = m;
        break;
      }
    }

    if (visualMonth !== currentMonth) {
      if (currentMonthWeeks.length > 0) {
        months.push({ month: currentMonth, weeks: currentMonthWeeks });
      }
      currentMonth = visualMonth;
      currentMonthWeeks = [];
    }
    currentMonthWeeks.push(week);
  }
  if (currentMonthWeeks.length > 0) {
    months.push({ month: currentMonth, weeks: currentMonthWeeks });
  }
  return months;
}

/**
 * Cuenta fines de semana largos: sábado + domingo + lunes siguiente SIN ningún color
 * Fin de semana largo = sábado (libranza del grupo) + domingo (siempre libranza) + lunes siguiente (libranza del grupo)
 * @param {Object} paintedDays - { 'YYYY-MM-DD': colorIndex }
 * @param {number} grupo
 * @param {string} turno
 * @returns {number}
 */
function countLongWeekends(paintedDays, grupo, turno) {
  let count = 0;
  const weeks = generateYearWeeks();

  for (let i = 0; i < weeks.length - 1; i++) {
    const sat = weeks[i][5]; // sábado
    const sun = weeks[i][6]; // domingo
    const mon = weeks[i + 1][0]; // lunes siguiente

    // Verificar que los 3 días SON libranza para el grupo
    // Sábado y lunes deben ser libranza del grupo, domingo siempre lo es
    if (!isLibranza(sat, grupo)) continue;
    if (!isLibranza(mon, grupo)) continue;

    // Regla: fin de semana largo = sáb + dom + lun siguiente, NINGUNO pintado
    const satKey = toKey(sat);
    const sunKey = toKey(sun);
    const monKey = toKey(mon);

    // Usar 'in' operator para evitar bug de truthiness (color 0 es falsy)
    if (!(satKey in paintedDays) && !(sunKey in paintedDays) && !(monKey in paintedDays)) {
      count++;
    }
  }
  return count;
}

/**
 * Convierte Date a key 'YYYY-MM-DD' usando hora LOCAL (evita problemas de zona horaria)
 */
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse key 'YYYY-MM-DD' a Date (mediodía LOCAL para evitar problemas de zona horaria)
 */
function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Verifica si hay días pintados en un rango (inclusive)
 * Ignora festivos bloqueantes (no cuentan como "pintados en medio")
 */
function hasPaintedInRange(paintedDays, startKey, endKey) {
  const start = fromKey(startKey);
  const end = fromKey(endKey);
  if (start > end) return hasPaintedInRange(paintedDays, endKey, startKey);

  let current = new Date(start);
  while (current <= end) {
    const key = toKey(current);
    // Saltar festivos bloqueantes
    if (isBlockingHoliday(current)) {
      current.setDate(current.getDate() + 1);
      continue;
    }
    if (key in paintedDays) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
}

/**
 * Pinta un rango de días (inclusive) con un color
 * Salta festivos bloqueantes (no pinta, pero continua el rango)
 * @returns nuevo objeto paintedDays
 */
function paintRange(paintedDays, startKey, endKey, colorIndex) {
  const result = { ...paintedDays };
  const start = fromKey(startKey);
  const end = fromKey(endKey);
  if (start > end) return paintRange(paintedDays, endKey, startKey, colorIndex);

  let current = new Date(start);
  while (current <= end) {
    const key = toKey(current);
    // Saltar festivos bloqueantes (no se pintan, pero el rango continua)
    if (isBlockingHoliday(current)) {
      current.setDate(current.getDate() + 1);
      continue;
    }
    if (!(key in result)) { // solo pinta si no hay color (usa 'in' para detectar color 0)
      result[key] = colorIndex;
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}

/**
 * Borra días pintados en un rango (inclusive)
 * @returns nuevo objeto paintedDays
 */
function eraseRange(paintedDays, startKey, endKey) {
  const result = { ...paintedDays };
  const start = fromKey(startKey);
  const end = fromKey(endKey);
  if (start > end) return eraseRange(paintedDays, endKey, startKey);

  let current = new Date(start);
  while (current <= end) {
    delete result[toKey(current)];
    current.setDate(current.getDate() + 1);
  }
  return result;
}

/**
 * Calcula estadísticas
 */
function computeStats(paintedDays, grupo, turno) {
  const counts = [0, 0, 0];
  for (const colorIdx of Object.values(paintedDays)) {
    if (colorIdx >= 0 && colorIdx <= 2) counts[colorIdx]++;
  }
  const total = counts.reduce((a, b) => a + b, 0);
  const longWeekends = countLongWeekends(paintedDays, grupo, turno);
  const sundaysInVacation = countSundaysInVacation(paintedDays);
  const restDaysInVacation = countRestDaysInVacation(paintedDays, grupo);
  const holidaysOnRestDays = countHolidaysOnRestDays(grupo);
  return { counts, total, longWeekends, sundaysInVacation, restDaysInVacation, holidaysOnRestDays };
}

// ========================================
// ESTADO & PERSISTENCIA
// ========================================

const defaultState = {
  turno: 'A',
  grupo: 1,
  paintedDays: {}, // 'YYYY-MM-DD' -> 0|1|2
  history: null,   // snapshot anterior para deshacer: { paintedDays, turno, grupo }
  lastAction: null // 'paint' | 'erase' | null
};

let state = { ...defaultState };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = {
        ...defaultState,
        ...parsed,
        paintedDays: parsed.paintedDays || {},
        history: parsed.history || null
      };
    }
  } catch (e) {
    console.warn('Error cargando estado:', e);
    state = { ...defaultState };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      turno: state.turno,
      grupo: state.grupo,
      paintedDays: state.paintedDays,
      history: state.history
    }));
  } catch (e) {
    console.warn('Error guardando estado:', e);
  }
}

function pushHistory() {
  state.history = {
    paintedDays: { ...state.paintedDays },
    turno: state.turno,
    grupo: state.grupo
  };
}

function undo() {
  if (!state.history) return false;
  state.paintedDays = { ...state.history.paintedDays };
  state.turno = state.history.turno;
  state.grupo = state.history.grupo;
  state.history = null;
  state.lastAction = null;
  saveState();
  return true;
}

// ========================================
// RENDER
// ========================================

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['L','M','X','J','V','S','D'];

let currentTool = 'color-0'; // 'color-0'|'color-1'|'color-2'|'erase'
let firstClickKey = null; // para rango clic-clic

// DOM elements (inicializados en init())
let calendarEl, turnoSelect, grupoSelect, legendToolsLeft, legendToolsRight, undoBtn, statEls;

function getDOMElements() {
  calendarEl = document.getElementById('calendar');
  turnoSelect = document.getElementById('turno-select');
  grupoSelect = document.getElementById('grupo-select');
  // Ambos contenedores de herramientas
  legendToolsLeft = document.getElementById('legend-tools-left');
  legendToolsRight = document.getElementById('legend-tools-right');
  undoBtn = document.getElementById('undo-btn');
  statEls = {
    color0: document.getElementById('stat-color-0'),
    color1: document.getElementById('stat-color-1'),
    color2: document.getElementById('stat-color-2'),
    total: document.getElementById('stat-total'),
    longWeekends: document.getElementById('stat-long-weekends'),
    sundaysInVacation: document.getElementById('stat-sundays-in-vacation'),
    restDaysInVacation: document.getElementById('stat-rest-days-in-vacation'),
    holidaysOnRestDays: document.getElementById('stat-holidays-on-rest')
  };
}

function render() {
  renderCalendar();
  renderStats();
  updateUndoButton();
  updateToolSelection();
}

function renderCalendar() {
  const allWeeks = generateYearWeeks();
  // Filtrar semana 0 (antes del 4 ene 2027)
  const weeks = allWeeks.filter(w => getWeekNumber(w[0]) >= 1);
  const monthGroups = groupWeeksByVisualMonth(weeks);

  calendarEl.innerHTML = '';

  for (const { month, weeks: monthWeeks } of monthGroups) {
    const monthEl = document.createElement('div');
    monthEl.className = 'month';

    const header = document.createElement('div');
    header.className = 'month-header';
    header.textContent = MONTH_NAMES[month];
    monthEl.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'month-grid';

    // Cabecera días de semana (solo visible en desktop via CSS)
    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'weekday-row';
    // Esquina para turno
    const corner = document.createElement('div');
    corner.className = 'weekday-corner';
    weekdayRow.appendChild(corner);
    for (const dn of DAY_NAMES) {
      const dh = document.createElement('div');
      dh.className = 'weekday-cell';
      dh.textContent = dn;
      weekdayRow.appendChild(dh);
    }
    grid.appendChild(weekdayRow);

    for (const week of monthWeeks) {
      const weekNum = getWeekNumber(week[0]);
      const turnoChar = getTurnoForWeek(weekNum, state.turno);

      // Fila de semana
      const weekRow = document.createElement('div');
      weekRow.className = 'week-row';

      // Indicador de turno con clase para color
      const turnEl = document.createElement('div');
      turnEl.className = `week-turn ${turnoChar}`;
      turnEl.textContent = turnoChar;
      turnEl.setAttribute('aria-label', `Semana ${weekNum}: turno ${turnoChar === 'M' ? 'mañana' : 'tarde'}`);
      weekRow.appendChild(turnEl);

      for (let i = 0; i < 7; i++) {
        const date = week[i];
        const key = toKey(date);
        const isCurrentMonth = date.getMonth() === month;
        const isToday = false; // 2027, no hoy real
        const paintedColor = state.paintedDays[key];
        const isRest = isLibranza(date, state.grupo);
        const isHol = isHoliday(date);
        const isWorkHol = isWorkingHoliday(date);

        const dayEl = document.createElement('button');
        dayEl.type = 'button';
        dayEl.className = 'day';
        dayEl.dataset.date = key;

        let ariaLabel = `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
        if (isHol) {
          const holidayName = FIXED_HOLIDAYS[key] || WORKING_HOLIDAYS[key] || (isWorkHol ? 'Domingo laborable' : 'Domingo');
          ariaLabel += `, ${holidayName}${isWorkHol ? ' (laborable)' : ''}`;
        }
        if (isRest) ariaLabel += ', libranza';
        if (paintedColor !== undefined) ariaLabel += `, color ${paintedColor + 1}`;
        dayEl.setAttribute('aria-label', ariaLabel);

        if (!isCurrentMonth) dayEl.classList.add('other-month');
        if (isToday) dayEl.classList.add('today');
        if (isRest) dayEl.classList.add('is-rest');
        
        const isBlockingHol = isBlockingHoliday(date);
        if (isHol) {
          if (isWorkHol) {
            dayEl.classList.add('working-holiday');
          } else {
            dayEl.classList.add('holiday');
          }
          // Solo festivos bloqueantes no se pueden pintar/borrar
          if (isBlockingHol) {
            dayEl.style.pointerEvents = 'none';
            dayEl.style.cursor = 'default';
          }
        }
        if (paintedColor !== undefined) {
          dayEl.classList.add('painted', `color-${paintedColor}`);
        }

        const num = document.createElement('span');
        num.className = 'day-number';
        num.textContent = date.getDate();
        dayEl.appendChild(num);

        // Solo añadir eventos si NO es festivo bloqueante
        if (!isBlockingHol) {
          dayEl.addEventListener('click', () => handleDayClick(key, dayEl));
          dayEl.addEventListener('dblclick', (e) => {
            e.preventDefault();
            handleDayDblClick(key);
          });
        }

        weekRow.appendChild(dayEl);
      }

      grid.appendChild(weekRow);
    }

    monthEl.appendChild(grid);
    calendarEl.appendChild(monthEl);
  }
}

function renderStats() {
  const stats = computeStats(state.paintedDays, state.grupo, state.turno);
  statEls.color0.textContent = stats.counts[0];
  statEls.color1.textContent = stats.counts[1];
  statEls.color2.textContent = stats.counts[2];
  statEls.total.textContent = stats.total;
  statEls.longWeekends.textContent = stats.longWeekends;
  statEls.sundaysInVacation.textContent = stats.sundaysInVacation;
  statEls.restDaysInVacation.textContent = stats.restDaysInVacation;
  statEls.holidaysOnRestDays.textContent = stats.holidaysOnRestDays;
  renderLocalHolidaysList();
}

function renderLocalHolidaysList() {
  const container = document.getElementById('local-holidays-list');
  if (!container) return;
  
  const localHolidays = getLocalHolidays();
  if (Object.keys(localHolidays).length === 0) {
    container.innerHTML = '<p class="local-holidays-empty">No hay festivos locales configurados</p>';
    return;
  }
  
  // Ordenar por fecha
  const sortedEntries = Object.entries(localHolidays).sort(([a], [b]) => a.localeCompare(b));
  
  container.innerHTML = sortedEntries.map(([date, name]) => {
    const dateObj = new Date(date + 'T12:00:00');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `
      <div class="local-holiday-item">
        <span class="local-holiday-date">${day}/${month}</span>
        <span class="local-holiday-name">${name}</span>
      </div>
    `;
  }).join('');
}

function updateUndoButton() {
  undoBtn.disabled = !state.history;
}

function updateToolSelection() {
  // Actualizar ambas barras de herramientas
  for (const container of [legendToolsLeft, legendToolsRight]) {
    if (!container) continue;
    for (const btn of container.querySelectorAll('.tool-btn')) {
      const isActive = btn.dataset.tool === currentTool;
      btn.setAttribute('aria-checked', isActive);
      if (isActive) btn.classList.add('active'); else btn.classList.remove('active');
    }
  }
}

// ========================================
// EVENTOS: PINTAR / BORRAR
// ========================================

function handleDayClick(key, dayEl) {
  // Seguridad: no actuar en festivos bloqueantes
  if (isBlockingHoliday(fromKey(key))) return;

  if (currentTool === 'erase') {
    handleEraseClick(key);
    return;
  }
  // ... resto igual

  // Modo pintar
  if (firstClickKey === null) {
    // Primer clic
    firstClickKey = key;
    dayEl.classList.add('paint-preview');
  } else {
    // Segundo clic -> pintar rango
    const start = firstClickKey;
    const end = key;
    firstClickKey = null;
    // Quitar preview de todos
    document.querySelectorAll('.day.paint-preview').forEach(el => el.classList.remove('paint-preview'));

    // Verificar que no hay días pintados entre medio
    if (hasPaintedInRange(state.paintedDays, start, end)) {
      // No se puede pintar: hay días pintados en medio
      // Feedback visual: shake o alerta suave
      dayEl.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 300 });
      return;
    }

    // Pintar
    pushHistory();
    state.paintedDays = paintRange(state.paintedDays, start, end, parseInt(currentTool.split('-')[1], 10));
    state.lastAction = 'paint';
    saveState();
    initInfoModal();
  render();
  }
}

function handleDayDblClick(key) {
  // Seguridad: no actuar en festivos bloqueantes
  if (isBlockingHoliday(fromKey(key))) return;

  // Doble clic = pintar solo ese día (si no está pintado)
  if (currentTool === 'erase') {
    // Doble clic en borrar = borra solo ese día
    if (key in state.paintedDays) {
      pushHistory();
      state.paintedDays = eraseRange(state.paintedDays, key, key);
      state.lastAction = 'erase';
      saveState();
      initInfoModal();
  render();
    }
    return;
  }

  if (!(key in state.paintedDays)) {
    pushHistory();
    state.paintedDays = paintRange(state.paintedDays, key, key, parseInt(currentTool.split('-')[1], 10));
    state.lastAction = 'paint';
    saveState();
    initInfoModal();
  render();
  }
}

function handleEraseClick(key) {
  // Seguridad: no actuar en festivos bloqueantes
  if (isBlockingHoliday(fromKey(key))) return;

  if (firstClickKey === null) {
    // Primer clic: debe ser un día pintado
    if (!(key in state.paintedDays)) return;
    firstClickKey = key;
    document.querySelector(`[data-date="${key}"]`)?.classList.add('paint-preview');
  } else {
    // Segundo clic: borrar rango
    const start = firstClickKey;
    const end = key;
    firstClickKey = null;
    document.querySelectorAll('.day.paint-preview').forEach(el => el.classList.remove('paint-preview'));

    pushHistory();
    state.paintedDays = eraseRange(state.paintedDays, start, end);
    state.lastAction = 'erase';
    saveState();
    initInfoModal();
  render();
  }
}

// ========================================
// INICIALIZACIÓN
// ========================================

function init() {
  getDOMElements();
  loadState();
  turnoSelect.value = state.turno;
  grupoSelect.value = String(state.grupo);

  // Event listeners
  turnoSelect.addEventListener('change', () => {
    state.turno = turnoSelect.value;
    saveState();
    initInfoModal();
  render();
  });

  grupoSelect.addEventListener('change', () => {
    state.grupo = parseInt(grupoSelect.value, 10);
    saveState();
    initInfoModal();
  render();
  });

  // Tool selection en ambas barras
  function setupToolListeners(container) {
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.tool-btn');
      if (!btn) return;
      currentTool = btn.dataset.tool;
      firstClickKey = null;
      document.querySelectorAll('.day.paint-preview').forEach(el => el.classList.remove('paint-preview'));
      updateToolSelection();
    });
  }
  setupToolListeners(legendToolsLeft);
  setupToolListeners(legendToolsRight);

  undoBtn.addEventListener('click', () => {
    if (undo()) {
      firstClickKey = null;
      document.querySelectorAll('.day.paint-preview').forEach(el => el.classList.remove('paint-preview'));
      turnoSelect.value = state.turno;
      grupoSelect.value = String(state.grupo);
      initInfoModal();
  render();
    }
  });

  // Atajo Ctrl+Z
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (undo()) {
        firstClickKey = null;
        document.querySelectorAll('.day.paint-preview').forEach(el => el.classList.remove('paint-preview'));
        turnoSelect.value = state.turno;
        grupoSelect.value = String(state.grupo);
        render();
      }
    }
  });

  // Escape = cancelar selección de rango
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && firstClickKey !== null) {
      firstClickKey = null;
      document.querySelectorAll('.day.paint-preview').forEach(el => el.classList.remove('paint-preview'));
    }
  });

  initInfoModal();
  initPdfModal();
  render();
}

if (typeof window !== 'undefined') {
  init();
}

// ========================================
// EXPORT PARA TESTS (node --test)
// ========================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Constantes
    YEAR,
    COLORS,
    WEEK1_MONDAY,
    GRUPO_BASE_DAY,
    FIXED_HOLIDAYS,
    WORKING_HOLIDAYS,
    // Funciones puras
    getWeekday,
    getWeekNumber,
    getTurnoForWeek,
    getLibranzaDay,
    isLibranza,
    isHoliday,
    isWorkingHoliday,
    isBlockingHoliday,
    generateYearWeeks,
    groupWeeksByVisualMonth,
    countLongWeekends,
    toKey,
    fromKey,
    hasPaintedInRange,
    paintRange,
    eraseRange,
    computeStats,
    countSundaysInVacation,
    countRestDaysInVacation,
    countHolidaysOnRestDays,
    isBlockingHoliday,
    getLocalHolidays,
    saveLocalHolidays,
    cleanLocalHolidaysPaintedDays,
    initPdfModal,
    generatePdf
  };
}
// ========================================
// INFO MODAL
// ========================================

// Inicialización del modal de info (se llama desde init())
function initInfoModal() {
  const infoBtn = document.getElementById('info-btn');
  const infoModal = document.getElementById('info-modal');
  const infoClose = document.getElementById('info-close');
  const infoOk = document.getElementById('info-ok');

  function openInfoModal() {
    const modal = document.getElementById('info-modal');
    if (modal) {
      modal.showModal();
      const closeBtn = document.getElementById('info-close');
      if (closeBtn) closeBtn.focus();
    }
  }

  function closeInfoModal() {
    const modal = document.getElementById('info-modal');
    if (modal) {
      modal.close();
    }
  }

  if (infoBtn && infoModal) {
    infoBtn.addEventListener('click', () => {
      const modal = document.getElementById('info-modal');
      if (modal) {
        modal.showModal();
        const closeBtn = document.getElementById('info-close');
        if (closeBtn) closeBtn.focus();
      }
    });
  }
  if (infoClose && infoModal) {
    infoClose.addEventListener('click', () => {
      const modal = document.getElementById('info-modal');
      if (modal) modal.close();
    });
  }
  if (infoModal) {
    infoModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        const modal = document.getElementById('info-modal');
        if (modal) modal.close();
      }
    });
    infoModal.addEventListener('click', (e) => {
      if (e.target === infoModal) {
        infoModal.close();
      }
    });
  }
  if (document.getElementById('info-ok')) {
    document.getElementById('info-ok').addEventListener('click', () => {
      const modal = document.getElementById('info-modal');
      if (modal) modal.close();
    });
  }
}

// ========================================
// PDF MODAL & GENERATION
// ========================================

// Inicialización del modal de PDF (se llama desde init())
function initPdfModal() {
  const pdfBtn = document.getElementById('pdf-btn');
  const pdfModal = document.getElementById('pdf-modal');
  const pdfClose = document.getElementById('pdf-close');
  const pdfCancel = document.getElementById('pdf-cancel');
  const pdfGenerate = document.getElementById('pdf-generate');
  const pdfFilename = document.getElementById('pdf-filename');

  function openPdfModal() {
    const modal = document.getElementById('pdf-modal');
    if (modal) {
      // Actualizar nombre de archivo sugerido
      const filenameInput = document.getElementById('pdf-filename');
      if (filenameInput) {
        const grupo = state.grupo;
        const turno = state.turno;
        filenameInput.value = `Vacas27_2027_Grupo${grupo}_Turno${turno}.pdf`;
      }
      const modalEl = document.getElementById('pdf-modal');
      if (modalEl) {
        modalEl.showModal();
        const closeBtn = document.getElementById('pdf-close');
        if (closeBtn) closeBtn.focus();
      }
    }
  }

  function closePdfModal() {
    const modal = document.getElementById('pdf-modal');
    if (modal) {
      modal.close();
    }
  }

  if (pdfBtn && pdfModal) {
    pdfBtn.addEventListener('click', () => {
      const modal = document.getElementById('pdf-modal');
      if (modal) {
        // Actualizar nombre de archivo antes de abrir
        const filenameInput = document.getElementById('pdf-filename');
        if (filenameInput) {
          const grupo = state.grupo;
          const turno = state.turno;
          filenameInput.value = `Vacas27_2027_Grupo${state.grupo}_Turno${state.turno}.pdf`;
        }
        modal.showModal();
        const closeBtn = document.getElementById('pdf-close');
        if (closeBtn) closeBtn.focus();
      }
    });
  }
  if (pdfClose && pdfModal) {
    pdfClose.addEventListener('click', () => {
      const modal = document.getElementById('pdf-modal');
      if (modal) modal.close();
    });
  }
  if (pdfCancel && pdfModal) {
    pdfCancel.addEventListener('click', () => {
      const modal = document.getElementById('pdf-modal');
      if (modal) modal.close();
    });
  }
  if (pdfModal) {
    pdfModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        const modal = document.getElementById('pdf-modal');
        if (modal) modal.close();
      }
    });
    pdfModal.addEventListener('click', (e) => {
      if (e.target === pdfModal) {
        pdfModal.close();
      }
    });
  }
  if (pdfGenerate) {
    pdfGenerate.addEventListener('click', async () => {
      await generatePdf();
    });
  }
}

// ========================================
// PDF GENERATION (pure jsPDF, no html2canvas)
// ========================================

// Generar PDF del calendario - versión programática sin html2canvas
async function generatePdf() {
  const pdfBtn = document.getElementById('pdf-btn');
  const pdfGenerate = document.getElementById('pdf-generate');
  const pdfBtnText = document.getElementById('pdf-btn-text');
  const pdfFilenameInput = document.getElementById('pdf-filename');
  const includeLegend = document.getElementById('pdf-include-legend');
  const pdfModal = document.getElementById('pdf-modal');

  if (!pdfGenerate) return;

  // Mostrar estado de carga
  const originalBtnText = pdfGenerate.innerHTML;
  pdfGenerate.disabled = true;
  pdfGenerate.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;margin-right:4px;">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1" stroke-dasharray="31.4 31.4" stroke-dashoffset="31.4">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
      </path>
    </svg>
    <span id="pdf-btn-text">Generando...</span>
  `;
  pdfGenerate.classList.add('generating');

  try {
    // Verificar que jsPDF esté disponible
    console.log('PDF generation started');
    console.log('window.jspdf:', typeof window.jspdf);
    
    if (typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF no está cargado. Verifica la conexión a internet y el CDN.');
    }

    // Obtener nombre de archivo
    let filename = pdfFilenameInput ? pdfFilenameInput.value.trim() : `Vacas27_2027_Grupo${state.grupo}_Turno${state.turno}.pdf`;

    // Configurar jsPDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pdf.internal.pageSize.getWidth() - 2 * 15;
    const contentHeight = pdf.internal.pageSize.getHeight() - 2 * 15;

    // Dibujar el calendario programáticamente (3 cols x 4 filas)
    drawCalendarGrid(pdf, state, margin, contentWidth, contentHeight);

    // Agregar leyenda de colores si se solicita
    const includeLegend = document.getElementById('pdf-include-legend')?.checked;
    if (includeLegend) {
      // La leyenda se coloca después de la cuadrícula (4 filas * 60 = 240, empieza en 25, termina en 265)
      addLegendToPdf(pdf, 15, 275, contentWidth);
    }

    // Agregar estadísticas en página nueva
    pdf.addPage();
    addStatsToPdf(pdf, 15, 15, pdf.internal.pageSize.getWidth() - 30);

    // Guardar PDF
    filename = pdfFilenameInput ? pdfFilenameInput.value.trim() : `Vacas27_2027_Grupo${state.grupo}_Turno${state.turno}.pdf`;
    pdf.save(filename);

    // Cerrar modal
    if (pdfModal) {
      pdfModal.close();
    }

    showMessage('PDF generado correctamente');
  } catch (error) {
    console.error('Error generando PDF:', error);
    showMessage('Error al generar PDF: ' + error.message, true);
  } finally {
    // Restaurar botón
    const pdfGenerateBtn = document.getElementById('pdf-generate');
    if (pdfGenerateBtn) {
      pdfGenerateBtn.innerHTML = originalBtnText;
      pdfGenerateBtn.disabled = false;
      pdfGenerateBtn.classList.remove('generating');
    }
  }
}

// Dibujar la cuadrícula del calendario (3 cols x 4 filas = 12 meses)
// El calendario empieza el 4 de enero de 2027 (primer lunes del año)
// Cada mes termina en domingo
function drawCalendarGrid(pdf, state, margin, contentWidth, contentHeight) {
  // Configuración de la cuadrícula 3x4
  const COLS = 3;
  const ROWS = 4;
  const CELL_W = (pdf.internal.pageSize.getWidth() - 2 * margin) / 3;
  const CELL_H = (pdf.internal.pageSize.getHeight() - 2 * margin) / 4;
  
  // Título principal
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#1a1a2e');
  pdf.text('Vacas27 — Calendario 2027', pdf.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
  
  // Subtítulo con grupo y turno
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#666');
  const turnoText = state.turno === 'M' ? 'Mañana' : state.turno === 'T' ? 'Tarde' : 
                    state.turno === 'A' ? 'Alternado (empieza Tarde)' : 'Alternado (empieza Mañana)';
  pdf.text(`Grupo ${state.grupo} — Turno ${state.turno === 'M' ? 'Mañana' : state.turno === 'T' ? 'Tarde' : state.turno === 'A' ? 'Alternado (inicia Tarde)' : 'Alternado (empieza Mañana)'}`, 
           pdf.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
  
  // El calendario empieza el 4 de enero de 2027 (primer lunes del año)
  // Cada mes termina en domingo
  // El 1 de enero de 2027 es viernes, el primer lunes es el 4 de enero
  const firstMonday2027 = new Date(2027, 0, 4); // 4 de enero de 2027
  
  // Dibujar cada mes
  for (let month = 0; month < 12; month++) {
    const col = month % 3;
    const row = Math.floor(month / 3);
    const x = margin + month % 3 * CELL_W;
    const y = margin + Math.floor(month / 3) * CELL_H;
    
    // Calcular el primer día del mes en la cuadrícula
    const firstDayOfMonth = new Date(2027, month, 1);
    const firstDayOfWeek = (new Date(2027, month, 1).getDay() + 6) % 7; // 0=Lun, 6=Dom
    
    drawMonthCell(pdf, month, state, margin + month % 3 * CELL_W, margin + Math.floor(month / 3) * CELL_H, CELL_W, CELL_H, firstDayOfWeek);
  }
}

// Dibujar una celda de mes individual
// El calendario empieza el 4 de enero de 2027 (primer lunes del año)
// Cada mes termina en domingo
function drawMonthCell(pdf, monthIndex, state, x, y, cellW, cellH, firstDayOfWeek) {
  pdf.setFillColor('#ffffff');
  pdf.setDrawColor('#e0e0e0');
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, 58, 58, 1, 1, 'FD');
  
  // Header del mes
  pdf.setFillColor('#f5f5f5');
  pdf.rect(x, y, 58, 8, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#1a1a2e');
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  pdf.text(monthNames[monthIndex], x + 29, y + 5.5, { align: 'center' });
  
  // Headers de días de la semana (centrados en cada columna de 8mm)
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#999');
  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  for (let d = 0; d < 7; d++) {
    pdf.text(dayNames[d], x + 2 + d * 8, y + 14, { align: 'center' });
  }
  
  // Días del mes - calcular el primer día a mostrar
  let day = 1;
  const daysInCurrentMonth = new Date(2027, monthIndex + 1, 0).getDate();
  
  // Calcular cuántos días del mes anterior se muestran (días vacíos al inicio)
  const firstDayOfWeekLocal = (new Date(2027, monthIndex, 1).getDay() + 6) % 7; // 0=Lun, 6=Dom
  
  for (let week = 0; week < 6; week++) {
    for (let dow = 0; dow < 7; dow++) {
      const cellIndex = week * 7 + dow;
      if (cellIndex < firstDayOfWeekLocal) continue; // Días antes del 1 del mes
      if (day > daysInCurrentMonth) break;
      
      const cellX = x + 1 + dow * 8;  // 8mm por columna
      const cellY = y + 8 + week * 8;  // 8mm por fila (header 8mm + 7*7mm = 57mm total)
      
      const isRest = isLibranza(new Date(2027, monthIndex, day), state.grupo);
      const isDayHoliday = isHoliday(new Date(2027, monthIndex, day));
      const isWorkingDayHoliday = isWorkingHoliday(new Date(2027, monthIndex, day));
      const isPainted = state.paintedDays && state.paintedDays[`2027-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`];
      
      // Fondo del día (pintado con color)
      if (isPainted) {
        const colorIdx = state.paintedDays[`2027-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`];
        const colors = ['#f06292', '#81c784', '#64b5f6'];
        if (colorIdx !== undefined && colors[colorIdx]) {
          pdf.setFillColor(colors[colorIdx]);
          pdf.roundedRect(x + 1 + dow * 8, y + 17 + week * 8, 6, 7, 1, 1, 'F');
        }
      }
      
      // Círculo verde para libranza (centrado en la celda del día)
      if (isRest) {
        pdf.setDrawColor('#4caf50');
        pdf.setLineWidth(0.5);
        // Centro de la celda del día: x + 4 + dow * 8, y + 21 + week * 8
        pdf.circle(x + 4 + dow * 8, y + 21 + week * 8, 2, 'S');
      }
      
      // Texto del día (centrado en la celda)
      if (isDayHoliday && !isWorkingDayHoliday) {
        pdf.setTextColor('#c62828');
      } else if (isWorkingDayHoliday) {
        pdf.setTextColor('#e65100');
      } else if (isRest) {
        pdf.setTextColor('#2e7d32');
      } else {
        pdf.setTextColor('#333');
      }
      
      pdf.setFontSize(6);
      pdf.setFont('helvetica', isDayHoliday ? 'bold' : 'normal');
      // Centrado en la celda de 8x8mm: x + 4 + dow * 8, y + 18 + week * 7 + 3.5
      pdf.text(String(day), x + 4 + dow * 8, y + 18 + week * 7 + 3.5, { align: 'center' });
      
      day++;
    }
    if (day > daysInCurrentMonth) break;
  }
}
// Función auxiliar: días en mes
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Función auxiliar para agregar leyenda al PDF (solo colores, festivos y libranza - NO festivos locales)
function addLegendToPdf(pdf, x, y, maxWidth) {
  const legends = [
    { color: '#f06292', label: 'Color 1' },
    { color: '#81c784', label: 'Color 2' },
    { color: '#64b5f6', label: 'Color 3' },
    { color: '#c62828', label: 'Festivo' },
    { color: '#e65100', label: 'Festivo laborable' },
    { color: '#4caf50', label: 'Libranza', isCircle: true }
  ];

  let currentX = x;
  let currentY = y;
  const itemHeight = 6;
  const itemWidth = 35;
  const gap = 3;

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');

  for (let i = 0; i < legends.length; i++) {
    const legend = legends[i];
    if (currentX + itemWidth > x + 180) {
      currentX = x;
      currentY += itemHeight + 2;
    }

    if (legend.isCircle) {
      pdf.setDrawColor('#4caf50');
      pdf.setLineWidth(0.8);
      pdf.circle(currentX + 4, currentY + 3, 2.5, 'S');
    } else {
      pdf.setFillColor(legend.color);
      pdf.rect(currentX, currentY + 1, 8, 5, 'F');
    }

    pdf.setTextColor('#333');
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text(legend.label, currentX + 10, currentY + 4);
    currentX += itemWidth + gap;
  }
}

// Función auxiliar para agregar estadísticas al PDF
function addStatsToPdf(pdf, x, y, maxWidth) {
  const stats = computeStats(state.paintedDays, state.grupo, state.turno);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#1a1a2e');
  pdf.text('Estadísticas', x, y);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#333');

  let currentY = y + 8;
  const lineHeight = 7;

  const statsData = [
    ['Color 1 (Rosa)', stats.counts[0]],
    ['Color 2 (Verde)', stats.counts[1]],
    ['Color 3 (Azul)', stats.counts[2]],
    ['Total pintados', stats.total],
    ['Fines de semana largos', stats.longWeekends],
    ['Domingos en vacaciones', stats.sundaysInVacation],
    ['Descansos en vacaciones', stats.restDaysInVacation],
    ['Festivos en descanso', stats.holidaysOnRestDays]
  ];

  for (const [label, value] of statsData) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, x, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(value), x + 80, currentY);
    currentY += lineHeight;
  }

  // Agregar festivos locales si existen
  const localHolidays = getLocalHolidays();
  if (Object.keys(localHolidays).length > 0) {
    currentY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Festivos locales:', x, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY += lineHeight;

    const sortedHolidays = Object.entries(localHolidays).sort(([a], [b]) => a.localeCompare(b));
    for (const [date, name] of sortedHolidays) {
      const dateObj = new Date(date + 'T12:00:00');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      pdf.text(`${day}/${month} — ${name}`, x + 5, currentY);
      currentY += lineHeight;
    }
  }
}

