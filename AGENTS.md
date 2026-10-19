# Vacas27 — Guía para Agentes

## Proyecto
Web app "Vacas27" en HTML/CSS/JS vanilla. Solo tres archivos:
- `index.html` — Desplegables (Turno y Grupo), calendario anual 2027, leyenda de colores, estadísticas
- `styles.css` — diseño mobile-first, limpio y moderno
- `app.js` — estado, persistencia en localStorage, renderizado, lógica pura testeable

Sin build, sin servidor, sin dependencias. Se abre `index.html` directo en el navegador.

## Comandos
- Tests: `node --test`

## Reglas
- Lee `docs/constitution.md` y la spec activa (`specs/NNN-*/`) antes de tocar código.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones
tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su
porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de
dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).

## Ejecutar / Probar
```bash
cd /home/alvaro/Dropbox/Estudio\ programacion/Vacas27
xdg-open index.html
```
Verificar manual: añadir sesión → aparece en la lista, los datos sobreviven a la descarga (localStorage)los datos sobreviven a la descarga
## Lógica Clave (app.js)

### Turnos (desplegable 1)
- **M**: todas las semanas de mañana (`M`)
- **T**: todas las semanas de tarde (`T`)
- **A**: semana 1 (lunes 4 ene) = `T`, luego alterna `M`/`T`
- **B**: opuesto a A (semana 1 = `M`, luego alterna)

### Grupos de libranza (desplegable 2) — Grupo 1..6
- Semana 1 (lunes 4 ene – domingo 10 ene):
  - G1: mar 5 | G2: mié 6 | G3: jue 7 | G4: vie 8 | G5: sáb 9 | G6: lun 4
- Cada semana avanza 1 día (lun→mar→mié→jue→vie→sáb→lun…)
- **Todos los grupos libran todos los domingos del año**

### Calendario anual 2027
- Meses visuales, pero **semanas completas** (lun–dom)
- Si mes termina mid-semana: días restantes hasta domingo se muestran en ese mes
- Mes siguiente empieza en su **primer lunes**
- A la izquierda/derecha de cada semana: carácter de turno (`M` o `T`)
- Días de libranza: **círculo verde**

### Pintar / Borrar (herramientas en leyenda)
- 3 colores de relleno + herramienta "Borrar"
- Selección: clic en leyenda → indicador visual en el botón seleccionado
- **Pintar**: clic día A → clic día B = pinta rango A→B si **no hay días pintados entre medio**
- **Doble clic**: pinta solo ese día
- **Borrar**: clic día pintado A → clic día B = borra todos los días pintados entre A y B
- Un día **no puede tener 2 colores**

### Estadísticas (resumen)
- Días por color (3 contadores)
- Total días pintados
- **Fines de semana largos**: sáb + dom + lun siguiente **sin ningún color** → contador
- **Domingos en vacaciones**: domingos que están pintados → contador (recalculado, no persistido)
- **Descansos en vacaciones**: días de libranza semanales del grupo (excluye domingos) que caen en días pintados → contador (recalculado, no persistido)
  - Fórmula: `total libranzas pintadas - domingos en vacaciones`
- **Festivos en descanso**: festivos fijos (incluye laborables) que caen en día de libranza del grupo (excluye domingos) → contador (recalculado, no persistido)

### Festivos 2027
- **14 festivos fijos** (12 no laborables + 2 laborables: 25 mar, 16 ago): **no se pueden pintar**, se saltan en rangos, visual rojo/naranja, **no clicables** (inline style `pointer-events: none`)
- **Domingos**: festivo visual (rojo/naranja) pero **SÍ se pueden pintar** individualmente y en rangos, clicables
- **CSS festivos solo visual** (color, font-weight), **interacción controlada por JS** (solo festivos bloqueantes reciben `pointer-events: none` inline)
- Círculo verde libranza encima de festivos (z-index superior)

### Persistencia & Deshacer
- `localStorage`: días pintados por color + selección turno/grupo
- **Botón Deshacer**: guarda snapshot antes de cada acción completa (pintar rango / borrar rango). Un solo nivel. Deshabilitado si no hay historial o ya usado.
- Cambiar turno/grupo recalcula libranzas y fines de semana largos (no persiste, se recalcula)

## Convenciones
- Textos de la UI solo en español.
- Sin frameworks, sin compilación, sin scripts externos.
- Los tres archivos deben quedar en la misma carpeta (rutas relativas).
- Lógica pura en funciones separadas (sin DOM/localStorage), testeables con `node --test`
- Código en inglés, UI en español

## Tareas Comunes
| Tarea | Cómo |
|-------|-----|
| Añadir funcionalidad | Editar los tres archivos directamente |


## Límites

- Siempre: actualizar `MEMORY.md`al terminar cada tarea.
- Pregunta antes: crear archivos nuevos, cambiar el formatos de los datos guardadaos.
- Nunca: añadir dependencias, frameworks o un paso de build.

## Verificación

- No hay tests automáticos. Después de cada cambio, verifica con el MCP de Chrome
DevTools: abre `index.html`, prueba la funcionalidad, revisa la consola y comprueba la
vista móvil.