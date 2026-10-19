/**
 * Configuración de festivos locales - config.js
 * Lógica de la página de configuración
 */

// Estado local de la página de configuración
let localHolidays = {};
let originalHolidays = {}; // Para detectar cambios

// Elementos DOM
let holidaysList;
let newHolidayDate;
let addHolidayBtn;
let saveBtn;
let configMessage;

const MAX_LOCAL_HOLIDAYS = 5;
const MIN_DATE = '2027-01-04';
const MAX_DATE = '2027-12-31';

document.addEventListener('DOMContentLoaded', () => {
  initElements();
  loadHolidays();
  renderList();
  attachEvents();
});

function initElements() {
  holidaysList = document.getElementById('holidays-list');
  newHolidayDate = document.getElementById('new-holiday-date');
  addHolidayBtn = document.getElementById('add-holiday-btn');
  saveBtn = document.getElementById('save-btn');
  configMessage = document.getElementById('config-message');
  
  // Establecer fecha de hoy como valor por defecto (o primera fecha válida)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  if (todayStr >= '2027-01-04' && todayStr <= '2027-12-31') {
    newHolidayDate.value = todayStr;
  } else {
    newHolidayDate.value = '2027-01-04';
  }
}

function loadHolidays() {
  try {
    const raw = localStorage.getItem('vacas27-local-holidays');
    if (raw) {
      localHolidays = JSON.parse(raw);
    } else {
      localHolidays = {
        '2027-02-10': 'Festivo local 1',
        '2027-09-08': 'Festivo local 2',
      };
    }
  } catch (e) {
    console.warn('Error cargando festivos locales:', e);
    localHolidays = {
      '2027-02-10': 'Festivo local 1',
      '2027-09-08': 'Festivo local 2',
    };
  }
  // Guardar copia original para detectar cambios
  originalHolidays = { ...localHolidays };
}

function saveHolidays() {
  try {
    localStorage.setItem('vacas27-local-holidays', JSON.stringify(localHolidays));
    return true;
  } catch (e) {
    console.error('Error guardando festivos locales:', e);
    return false;
  }
}

function formatDateForDisplay(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function getDayName(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
}

function isSunday(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.getDay() === 0;
}

function isValidDate(dateStr) {
  // Verificar formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  
  const date = new Date(dateStr + 'T12:00:00');
  if (isNaN(date.getTime())) return false;
  
  // Verificar rango
  if (dateStr < '2027-01-04' || dateStr > '2027-12-31') return false;
  
  // No domingo
  if (isSunday(dateStr)) return false;
  
  return true;
}

function renderList() {
  const list = document.getElementById('holidays-list');
  if (!list) return;
  
  const entries = Object.entries(localHolidays).sort(([a], [b]) => a.localeCompare(b));
  
  if (entries.length === 0) {
    list.innerHTML = '<p class="config-empty">No hay festivos locales configurados</p>';
    return;
  }
  
  list.innerHTML = entries.map(([date, name]) => {
    const displayDate = formatDateForDisplay(date);
    const dayName = getDayName(date);
    return `
      <div class="config-item" data-date="${date}" role="listitem">
        <div class="config-item-info">
          <span class="config-item-date">${date}</span>
          <span class="config-item-day">(${dayName})</span>
          <span class="config-item-name">${name}</span>
        </div>
        <button type="button" class="btn-delete" data-date="${date}" aria-label="Eliminar festivo ${date}" title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  // Actualizar estado del botón añadir
  updateAddButtonState();
}

function updateAddButtonState() {
  const count = Object.keys(localHolidays).length;
  const dateInput = document.getElementById('new-holiday-date');
  const addBtn = document.getElementById('add-holiday-btn');
  
  if (count >= 5) {
    addBtn.disabled = true;
    addBtn.title = 'Máximo 5 festivos locales';
    dateInput.disabled = true;
  } else {
    addBtn.disabled = false;
    addBtn.title = 'Añadir festivo local';
    dateInput.disabled = false;
  }
}

function showMessage(message, isError = false) {
  const msg = document.getElementById('config-message');
  msg.textContent = message;
  msg.className = 'config-message' + (isError ? ' error' : ' success');
  
  // Auto-ocultar después de 3 segundos
  setTimeout(() => {
    msg.textContent = '';
    msg.className = 'config-message';
  }, 3000);
}

function attachEvents() {
  // Añadir festivo
  document.getElementById('add-holiday-btn').addEventListener('click', () => {
    const date = newHolidayDate.value;
    if (!date) {
      showMessage('Selecciona una fecha', true);
      return;
    }
    
    if (!isValidDate(date)) {
      showMessage('Fecha inválida: debe ser entre 4/1/2027 y 31/12/2027, no domingo, y no duplicada', true);
      return;
    }
    
    if (date in localHolidays) {
      showMessage('Esa fecha ya es un festivo local', true);
      return;
    }
    
    if (Object.keys(localHolidays).length >= 5) {
      showMessage('Máximo 5 festivos locales permitidos', true);
      return;
    }
    
    // Generar nombre automático
    const count = Object.keys(localHolidays).length + 1;
    localHolidays[date] = `Festivo local ${count}`;
    
    renderList();
    newHolidayDate.value = '';
    showMessage('Festivo añadido');
  });
  
  // Eliminar festivo (delegación de eventos)
  document.getElementById('holidays-list').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (deleteBtn) {
      const date = deleteBtn.dataset.date;
      if (date && date in localHolidays) {
        delete localHolidays[date];
        renderList();
        showMessage('Festivo eliminado');
      }
    }
  });
  
  // Guardar cambios
  document.getElementById('save-btn').addEventListener('click', async () => {
    // Detectar nuevos festivos
    const newHolidays = {};
    for (const date of Object.keys(localHolidays)) {
      if (!(date in originalHolidays)) {
        newHolidays[date] = localHolidays[date];
      }
    }
    
    // Guardar en localStorage
    if (!saveHolidays()) {
      showMessage('Error al guardar', true);
      return;
    }
    
    // Limpiar días pintados que coincidan con NUEVOS festivos locales
    if (Object.keys(newHolidays).length > 0) {
      await cleanPaintedDays(newHolidays);
    }
    
    showMessage('Cambios guardados correctamente');
    
    // Volver a la página principal después de un breve momento
    setTimeout(() => {
      window.history.back();
    }, 1000);
  });
  
  // Botón atrás del header
  document.getElementById('back-btn').addEventListener('click', () => {
    window.history.back();
  });
  
  // Validación en tiempo real del input date
  const dateInput = document.getElementById('new-holiday-date');
  dateInput.addEventListener('change', () => {
    const date = dateInput.value;
    if (date && !isValidDate(date)) {
      dateInput.setCustomValidity('Fecha inválida: debe ser entre 4/1/2027 y 31/12/2027, no domingo');
      dateInput.reportValidity();
    } else {
      dateInput.setCustomValidity('');
    }
  });
}

// Limpiar días pintados que coincidan con nuevos festivos locales
async function cleanPaintedDays(newHolidays) {
  // Cargar estado actual
  const raw = localStorage.getItem('vacas27-state-v1');
  if (!raw) return;
  
  try {
    const state = JSON.parse(raw);
    let modified = false;
    
    for (const date of Object.keys(newHolidays)) {
      if (state.paintedDays && date in state.paintedDays) {
        delete state.paintedDays[date];
        modified = true;
      }
    }
    
    if (modified) {
      localStorage.setItem('vacas27-state-v1', JSON.stringify(state));
    }
  } catch (e) {
    console.warn('Error limpiando días pintados:', e);
  }
}