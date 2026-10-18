# MEMORY.md — Diario de Estudio
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no
aporte.
## Estado actual
v1.5 - Nueva stat "Descansos en vacaciones". 61 tests pasando.

## Decisiones (y por qué)
- Spec base = AGENTS.md actualizado (no specs/NNN/)
- Botón Deshacer incluido (1 nivel, snapshot antes de pintar/borrar rango)
- Selector de herramienta: indicador visual en leyenda (borde/brillo)
- 3 colores pintura: rosa `#f06292`, verde `#81c784`, azul `#64b5f6` (evita conflicto festivos)
- Semana 1 = lunes 4 ene 2027 (ISO week 1)
- Calendario: semanas completas lun-dom, meses visuales empiezan en su primer lunes, multi-columna responsive
- localStorage: días pintados + selección turno/grupo (clave: vacas27-state-v1)
- Lógica pura separada, testeable con node --test

## Aprendizajes y errores a evitar
- toKey/fromKey: usar componentes locales (getFullYear, getMonth, getDate) NO toISOString (zona horaria)
- **getWeekNumber: usar mediodía local (new Date(y,m,d,12)) NO getTime() → evita bug DST en marzo/abril**
- **hasPaintedInRange / paintRange / eraseClick / dblClick: usar `key in obj` NO truthiness (color 0 es falsy)**
- generateYearWeeks: incluir semana que contiene 1 ene (empieza 28 dic), semana 1 negocio = 4 ene → filtrar semana 0 en render
- groupWeeksByVisualMonth: cada mes empieza en su primer lunes, semanas se asignan al mes cuyo primer lunes <= lunes semana
- Todo código DOM dentro de init() para que require() en tests no falle
- **Festivos: CSS solo visual, interacción controlada por JS (inline style en festivos bloqueantes)**
- **isBlockingHoliday: solo 14 festivos fijos bloquean rangos; domingos NO bloquean**

## Bugs corregidos
1. **Libranza lunes rota en marzo/abril**: getWeekNumber usaba getTime() (UTC) → fallaba con cambio horario verano (28 mar 2027). Fix: usar componentes locales + mediodía.
2. **Borrar no funcionaba en rojo (color 0)**: truthiness (`if (paintedDays[key])`) falla para 0. Fix: usar `key in paintedDays` en 4 sitios.
3. **Pintar sobrescribía color 0**: mismo bug truthiness en paintRange.
4. **v1.4.1 - Domingos no paintables en rangos**: CSS `.holiday/.working-holiday` tenía `pointer-events: none` que bloqueaba clicks en domingos. Fix: quitar del CSS, solo festivos bloqueantes tienen inline `pointer-events: none`.
5. **v1.5.2 - Fines de semana largos no recalculaban bien**: 
   - Faltaba check `isLibranza(lunes, grupo)` (solo verificaba sábado)
   - Bug truthiness en `!paintedDays[key]` (color 0 es falsy) → usar `!(key in paintedDays)`

## Festivos v1.5.2
- **14 festivos fijos** (12 no laborables + 2 laborables 25 mar, 16 ago): bloquean pintura/rangos, visual rojo/naranja, no clicables (inline style)
- **Domingos**: festivo visual (rojo/naranja) → **SÍ paintable** individual y rangos, clicables
- Excepción: domingos 26 jun – 29 ago = festivo laborable visual (naranja)
- Círculo verde libranza encima (z-index: 3)
- Fines de semana largos: festivos se ignoran (cuentan como días libres)

## Stats v1.5.2
- **Domingos en vacaciones**: domingos en `paintedDays` → contador recalculado (no persistido)
- **Descansos en vacaciones**: días de libranza semanales del grupo (excluye domingos) en `paintedDays` → contador recalculado (no persistido)
  - Fórmula: `total libranzas pintadas - domingos en vacaciones`

## Rangos con festivos
- `paintRange`: salta `isBlockingHoliday` (continue) → pinta antes y después
- `hasPaintedInRange`: ignora `isBlockingHoliday` → no cuentan como "pintados en medio"
- Render: solo festivos bloqueantes tienen `pointer-events: none` (inline)

## Próximos pasos
- Verificación manual completa en navegador:
  1. Clic 4 ene → clic 8 ene → pinta 4,5, **salta 6**, 7,8
  2. Domingos se pueden pintar individualmente y en rangos
  3. Festivos fijos (rojo) y laborables (naranja) no clicables
  4. Círculo verde libranza encima de festivos
  5. Stats "Domingos en vacaciones" y "Descansos en vacaciones" actualizadas