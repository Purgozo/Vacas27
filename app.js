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

/**
 * Verifica si una fecha es festivo (no laborable o laborable)
 */
function isHoliday(date) {
  const key = toKey(date);
  if (key in FIXED_HOLIDAYS) return true;
  if (key in WORKING_HOLIDAYS) return true;
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
 * Solo los 14 festivos fijos: 12 no laborables + 2 laborables (25 mar, 16 ago)
 * Los domingos NO bloquean (se pintan normal)
 */
function isBlockingHoliday(date) {
  const key = toKey(date);
  return key in FIXED_HOLIDAYS || key in WORKING_HOLIDAYS;
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
  return { counts, total, longWeekends, sundaysInVacation, restDaysInVacation };
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
    restDaysInVacation: document.getElementById('stat-rest-days-in-vacation')
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
      render();
    }
    return;
  }

  if (!(key in state.paintedDays)) {
    pushHistory();
    state.paintedDays = paintRange(state.paintedDays, key, key, parseInt(currentTool.split('-')[1], 10));
    state.lastAction = 'paint';
    saveState();
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
    render();
  });

  grupoSelect.addEventListener('change', () => {
    state.grupo = parseInt(grupoSelect.value, 10);
    saveState();
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
    isBlockingHoliday
  };
}