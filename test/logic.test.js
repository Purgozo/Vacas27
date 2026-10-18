/**
 * Tests para lógica pura de Vacas27
 * Ejecutar: node --test test/logic.test.js
 */

const {
  YEAR,
  WEEK1_MONDAY,
  GRUPO_BASE_DAY,
  FIXED_HOLIDAYS,
  WORKING_HOLIDAYS,
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
  countRestDaysInVacation
} = require('../app.js');

const assert = require('assert');
const { describe, it } = require('node:test');

describe('Lógica pura Vacas27', () => {

  describe('getWeekday', () => {
    it('lunes 4 ene 2027 = 0', () => {
      assert.strictEqual(getWeekday(new Date(2027, 0, 4)), 0);
    });
    it('domingo 10 ene 2027 = 6', () => {
      assert.strictEqual(getWeekday(new Date(2027, 0, 10)), 6);
    });
    it('sábado 9 ene 2027 = 5', () => {
      assert.strictEqual(getWeekday(new Date(2027, 0, 9)), 5);
    });
  });

  describe('getWeekNumber', () => {
    it('semana 1: lun 4 ene - dom 10 ene', () => {
      assert.strictEqual(getWeekNumber(new Date(2027, 0, 4)), 1);
      assert.strictEqual(getWeekNumber(new Date(2027, 0, 10)), 1);
    });
    it('semana 2: lun 11 ene', () => {
      assert.strictEqual(getWeekNumber(new Date(2027, 0, 11)), 2);
    });
    it('antes de semana 1 = 0', () => {
      assert.strictEqual(getWeekNumber(new Date(2027, 0, 1)), 0);
      assert.strictEqual(getWeekNumber(new Date(2027, 0, 3)), 0);
    });
  });

  describe('getTurnoForWeek', () => {
    it('Turno M siempre M', () => {
      assert.strictEqual(getTurnoForWeek(1, 'M'), 'M');
      assert.strictEqual(getTurnoForWeek(2, 'M'), 'M');
      assert.strictEqual(getTurnoForWeek(52, 'M'), 'M');
    });
    it('Turno T siempre T', () => {
      assert.strictEqual(getTurnoForWeek(1, 'T'), 'T');
      assert.strictEqual(getTurnoForWeek(2, 'T'), 'T');
    });
    it('Turno A: semana 1=T, semana 2=M, alterna', () => {
      assert.strictEqual(getTurnoForWeek(1, 'A'), 'T');
      assert.strictEqual(getTurnoForWeek(2, 'A'), 'M');
      assert.strictEqual(getTurnoForWeek(3, 'A'), 'T');
      assert.strictEqual(getTurnoForWeek(4, 'A'), 'M');
    });
    it('Turno B: opuesto a A', () => {
      assert.strictEqual(getTurnoForWeek(1, 'B'), 'M');
      assert.strictEqual(getTurnoForWeek(2, 'B'), 'T');
      assert.strictEqual(getTurnoForWeek(3, 'B'), 'M');
    });
  });

  describe('getLibranzaDay', () => {
    it('Grupo 1: semana 1 = martes (1)', () => {
      assert.strictEqual(getLibranzaDay(1, 1), 1);
    });
    it('Grupo 2: semana 1 = miércoles (2)', () => {
      assert.strictEqual(getLibranzaDay(2, 1), 2);
    });
    it('Grupo 6: semana 1 = lunes (0)', () => {
      assert.strictEqual(getLibranzaDay(6, 1), 0);
    });
    it('Avanza 1 día por semana, ciclo 6', () => {
      // Grupo 1: sem1=mar(1), sem2=mié(2), sem3=jue(3), sem4=vie(4), sem5=sáb(5), sem6=lun(0), sem7=mar(1)
      assert.strictEqual(getLibranzaDay(1, 1), 1);
      assert.strictEqual(getLibranzaDay(1, 2), 2);
      assert.strictEqual(getLibranzaDay(1, 3), 3);
      assert.strictEqual(getLibranzaDay(1, 4), 4);
      assert.strictEqual(getLibranzaDay(1, 5), 5);
      assert.strictEqual(getLibranzaDay(1, 6), 0);
      assert.strictEqual(getLibranzaDay(1, 7), 1);
    });
  });

  describe('isLibranza', () => {
    it('Domingo siempre es libranza', () => {
      const sun = new Date(2027, 0, 10); // domingo 10 ene
      assert.strictEqual(isLibranza(sun, 1), true);
      assert.strictEqual(isLibranza(sun, 6), true);
    });
    it('Grupo 1: martes 5 ene es libranza semana 1', () => {
      assert.strictEqual(isLibranza(new Date(2027, 0, 5), 1), true);
    });
    it('Grupo 1: miércoles 6 ene NO es libranza semana 1', () => {
      assert.strictEqual(isLibranza(new Date(2027, 0, 6), 1), false);
    });
  });

  describe('generateYearWeeks', () => {
    it('Genera 52-53 semanas', () => {
      const weeks = generateYearWeeks();
      assert.ok(weeks.length >= 52 && weeks.length <= 53);
    });
    it('Cada semana tiene 7 días (lun-dom)', () => {
      const weeks = generateYearWeeks();
      for (const week of weeks) {
        assert.strictEqual(week.length, 7);
        assert.strictEqual(getWeekday(week[0]), 0);
        assert.strictEqual(getWeekday(week[6]), 6);
      }
    });
    it('Primera semana generada es la que contiene el 1 ene (empieza 28 dic 2026)', () => {
      const weeks = generateYearWeeks();
      assert.strictEqual(toKey(weeks[0][0]), '2026-12-28');
    });
    it('Semana 1 de negocio (lunes 4 ene) está en la segunda semana generada', () => {
      const weeks = generateYearWeeks();
      assert.strictEqual(toKey(weeks[1][0]), '2027-01-04');
    });
  });

  describe('groupWeeksByVisualMonth', () => {
    it('Agrupa semanas por mes visual', () => {
      const weeks = generateYearWeeks();
      const months = groupWeeksByVisualMonth(weeks);
      // Debe haber 12 meses
      assert.strictEqual(months.length, 12);
      // Cada mes tiene semanas
      for (const m of months) {
        assert.ok(m.weeks.length > 0);
        assert.ok(m.month >= 0 && m.month <= 11);
      }
    });
  });

  describe('toKey / fromKey', () => {
    it('Redondeo correcto', () => {
      const d = new Date(2027, 5, 15); // 15 jun 2027
      const key = toKey(d);
      assert.strictEqual(key, '2027-06-15');
      const d2 = fromKey(key);
      assert.strictEqual(toKey(d2), key);
    });
  });

  describe('paintRange / eraseRange / hasPaintedInRange', () => {
    const empty = {};

    it('paintRange pinta rango inclusive', () => {
      const painted = paintRange(empty, '2027-01-02', '2027-01-04', 0);
      assert.strictEqual(painted['2027-01-02'], 0);
      assert.strictEqual(painted['2027-01-03'], 0);
      assert.strictEqual(painted['2027-01-04'], 0);
      assert.strictEqual(painted['2027-01-05'], undefined);
    });

    it('paintRange no sobreescribe colores existentes', () => {
      const base = { '2027-01-03': 1 };
      const painted = paintRange(base, '2027-01-02', '2027-01-04', 0);
      assert.strictEqual(painted['2027-01-02'], 0);
      assert.strictEqual(painted['2027-01-03'], 1); // se mantiene
      assert.strictEqual(painted['2027-01-04'], 0);
    });

    it('eraseRange borra rango inclusive', () => {
      const base = { '2027-01-02': 0, '2027-01-03': 1, '2027-01-04': 2 };
      const erased = eraseRange(base, '2027-01-02', '2027-01-03');
      assert.strictEqual(erased['2027-01-02'], undefined);
      assert.strictEqual(erased['2027-01-03'], undefined);
      assert.strictEqual(erased['2027-01-04'], 2); // fuera de rango
    });

    it('hasPaintedInRange detecta pintados en medio', () => {
      const painted = { '2027-01-03': 0 };
      assert.strictEqual(hasPaintedInRange(painted, '2027-01-02', '2027-01-04'), true);
      assert.strictEqual(hasPaintedInRange(painted, '2027-01-04', '2027-01-06'), false);
    });

    it('hasPaintedInRange funciona con rango invertido', () => {
      const painted = { '2027-01-03': 0 };
      assert.strictEqual(hasPaintedInRange(painted, '2027-01-04', '2027-01-02'), true);
    });
  });

  describe('computeStats', () => {
    it('Cuenta correctamente por color y total', () => {
      const painted = {
        '2027-01-05': 0,
        '2027-01-06': 0,
        '2027-01-07': 1,
        '2027-01-08': 2,
        '2027-01-09': 2
      };
      const stats = computeStats(painted, 1, 'A');
      assert.deepStrictEqual(stats.counts, [2, 1, 2]);
      assert.strictEqual(stats.total, 5);
    });
  });

  describe('countLongWeekends', () => {
    it('Cuenta fin de semana largo: sáb+dom+libres + lun siguiente libre', () => {
      // Simular: sábado 9 ene, domingo 10 ene, lunes 11 ene sin pintar
      // Grupo 1 libra sábado 9 ene (semana 1)
      const painted = {};
      const count = countLongWeekends(painted, 1, 'A');
      assert.ok(count >= 1); // al menos ese finde
    });

    it('No cuenta si hay día pintado en el rango', () => {
      const painted = { '2027-01-09': 0 }; // sábado pintado
      const count = countLongWeekends(painted, 1, 'A');
      // Ese finde específico no debería contar
      // (puede haber otros, pero el primero no)
    });
  });

  describe('Regresión: Bug DST (horario verano) en getWeekNumber', () => {
    it('Semanas alrededor del cambio DST (28 mar 2027) son correctas', () => {
      // 2027-03-28 es el último domingo de marzo = cambio a horario de verano en España
      // Antes del fix, getWeekNumber usaba getTime() (UTC) y fallaba
      assert.strictEqual(getWeekNumber(new Date(2027, 2, 22)), 12); // Lun 22 mar
      assert.strictEqual(getWeekNumber(new Date(2027, 2, 28)), 12); // Dom 28 mar (cambio DST)
      assert.strictEqual(getWeekNumber(new Date(2027, 2, 29)), 13); // Lun 29 mar
      assert.strictEqual(getWeekNumber(new Date(2027, 3, 4)), 13);  // Dom 4 abr
    });

    it('Libranzas no se rompen en el cambio DST (marzo/abril)', () => {
      // Grupo 1: semana 12 = Lun, semana 13 = Mar (continúa secuencia)
      assert.strictEqual(getLibranzaDay(1, 12), 0); // Lun
      assert.strictEqual(getLibranzaDay(1, 13), 1); // Mar

      // Verificar isLibranza para fechas alrededor del DST
      assert.strictEqual(isLibranza(new Date(2027, 2, 22), 1), true);  // Lun 22 mar
      assert.strictEqual(isLibranza(new Date(2027, 2, 29), 1), false); // Lun 29 mar (semana 13 = Mar)
      assert.strictEqual(isLibranza(new Date(2027, 2, 30), 1), true);  // Mar 30 mar
    });
  });

  describe('Regresión: Borrar color 0 (rojo) - truthiness bug', () => {
    it('hasPaintedInRange detecta color 0 (falsy) correctamente', () => {
      const painted = { '2027-01-03': 0 }; // color 0 = rosa (no festivo)
      assert.strictEqual(hasPaintedInRange(painted, '2027-01-02', '2027-01-04'), true);
    });

    it('eraseRange borra días con color 0', () => {
      const base = { '2027-01-02': 0, '2027-01-03': 1 };
      const erased = eraseRange(base, '2027-01-02', '2027-01-02');
      assert.strictEqual(erased['2027-01-02'], undefined);
      assert.strictEqual(erased['2027-01-03'], 1);
    });

    it('paintRange no sobreescribe color 0 existente', () => {
      const base = { '2027-01-03': 0 };
      const painted = paintRange(base, '2027-01-02', '2027-01-04', 1);
      assert.strictEqual(painted['2027-01-02'], 1);
      assert.strictEqual(painted['2027-01-03'], 0); // se mantiene color 0
      assert.strictEqual(painted['2027-01-04'], 1);
    });
  });

  describe('Festivos 2027', () => {
    it('Festivos fijos detectados correctamente', () => {
      assert.strictEqual(isHoliday(new Date(2027, 0, 1)), true);   // Año Nuevo
      assert.strictEqual(isHoliday(new Date(2027, 0, 6)), true);   // Epifanía
      assert.strictEqual(isHoliday(new Date(2027, 1, 10)), true);  // Carnaval
      assert.strictEqual(isHoliday(new Date(2027, 2, 1)), true);   // Día de Baleares
      assert.strictEqual(isHoliday(new Date(2027, 2, 26)), true);  // Viernes Santo
      assert.strictEqual(isHoliday(new Date(2027, 4, 1)), true);   // Día del Trabajo
      assert.strictEqual(isHoliday(new Date(2027, 8, 8)), true);   // Día de Asturias
      assert.strictEqual(isHoliday(new Date(2027, 9, 12)), true);  // Fiesta Nacional
      assert.strictEqual(isHoliday(new Date(2027, 10, 1)), true);  // Todos los Santos
      assert.strictEqual(isHoliday(new Date(2027, 11, 6)), true);  // Constitución
      assert.strictEqual(isHoliday(new Date(2027, 11, 8)), true);  // Inmaculada
      assert.strictEqual(isHoliday(new Date(2027, 11, 25)), true); // Navidad
    });

    it('Festivos laborables detectados', () => {
      assert.strictEqual(isHoliday(new Date(2027, 2, 25)), true);  // Anunciación
      assert.strictEqual(isWorkingHoliday(new Date(2027, 2, 25)), true);
      assert.strictEqual(isHoliday(new Date(2027, 7, 16)), true);  // San Roque
      assert.strictEqual(isWorkingHoliday(new Date(2027, 7, 16)), true);
    });

    it('Domingos son festivos no laborables por defecto', () => {
      const sun = new Date(2027, 0, 10); // domingo 10 ene
      assert.strictEqual(isHoliday(sun), true);
      assert.strictEqual(isWorkingHoliday(sun), false);
    });

    it('Domingos 26 jun - 29 ago son festivos laborables', () => {
      assert.strictEqual(isHoliday(new Date(2027, 5, 27)), true);  // domingo 27 jun
      assert.strictEqual(isWorkingHoliday(new Date(2027, 5, 27)), true);
      assert.strictEqual(isHoliday(new Date(2027, 6, 18)), true);  // domingo 18 jul
      assert.strictEqual(isWorkingHoliday(new Date(2027, 6, 18)), true);
      assert.strictEqual(isHoliday(new Date(2027, 7, 29)), true);  // domingo 29 ago
      assert.strictEqual(isWorkingHoliday(new Date(2027, 7, 29)), true);
    });

    it('Domingo 25 jun NO es laborable (antes del rango)', () => {
      // 25 jun 2027 es viernes, el domingo anterior es 27 jun (dentro del rango)
      // El domingo antes del rango es 20 jun
      assert.strictEqual(isHoliday(new Date(2027, 5, 20)), true);  // domingo 20 jun
      assert.strictEqual(isWorkingHoliday(new Date(2027, 5, 20)), false);
    });

    it('Domingo 30 ago NO es laborable (después del rango)', () => {
      // 30 ago 2027 es lunes, el domingo después es 5 sep
      // El domingo después del rango es 5 sep (ago tiene 31 días, último domingo 29 ago)
      assert.strictEqual(isHoliday(new Date(2027, 8, 5)), true);   // domingo 5 sep
      assert.strictEqual(isWorkingHoliday(new Date(2027, 8, 5)), false);
    });

    it('Días laborables normales no son festivos', () => {
      assert.strictEqual(isHoliday(new Date(2027, 0, 4)), false);  // lunes 4 ene
      assert.strictEqual(isHoliday(new Date(2027, 5, 15)), false); // martes 15 jun
    });
  });

  describe('isBlockingHoliday', () => {
    it('Festivos fijos bloquean', () => {
      assert.strictEqual(isBlockingHoliday(new Date(2027, 0, 1)), true);   // Año Nuevo
      assert.strictEqual(isBlockingHoliday(new Date(2027, 0, 6)), true);   // Epifanía
      assert.strictEqual(isBlockingHoliday(new Date(2027, 11, 25)), true); // Navidad
    });

    it('Festivos laborables fijos bloquean', () => {
      assert.strictEqual(isBlockingHoliday(new Date(2027, 2, 25)), true);  // Anunciación
      assert.strictEqual(isBlockingHoliday(new Date(2027, 7, 16)), true);  // San Roque
    });

    it('Domingos NO bloquean (se pintan normal)', () => {
      assert.strictEqual(isBlockingHoliday(new Date(2027, 0, 10)), false); // domingo 10 ene
      assert.strictEqual(isBlockingHoliday(new Date(2027, 5, 27)), false); // domingo 27 jun (laborable)
      assert.strictEqual(isBlockingHoliday(new Date(2027, 6, 18)), false); // domingo 18 jul (laborable)
      assert.strictEqual(isBlockingHoliday(new Date(2027, 7, 29)), false); // domingo 29 ago (laborable)
    });

    it('Días laborables normales NO bloquean', () => {
      assert.strictEqual(isBlockingHoliday(new Date(2027, 0, 4)), false);  // lunes 4 ene
      assert.strictEqual(isBlockingHoliday(new Date(2027, 5, 15)), false); // martes 15 jun
    });
  });

  describe('paintRange salta festivos bloqueantes', () => {
    it('Salta Epifanía (6 ene) en rango 4-8 ene', () => {
      const painted = paintRange({}, '2027-01-04', '2027-01-08', 0);
      assert.strictEqual(painted['2027-01-04'], 0); // Lun
      assert.strictEqual(painted['2027-01-05'], 0); // Mar
      assert.strictEqual('2027-01-06' in painted, false); // Mié (Epifanía) - NO pintado
      assert.strictEqual(painted['2027-01-07'], 0); // Jue
      assert.strictEqual(painted['2027-01-08'], 0); // Vie
    });

    it('Salta Anunciación (25 mar) y Viernes Santo (26 mar) en rango', () => {
      const painted = paintRange({}, '2027-03-23', '2027-03-28', 1);
      assert.strictEqual(painted['2027-03-23'], 1); // Mar
      assert.strictEqual(painted['2027-03-24'], 1); // Mié
      assert.strictEqual('2027-03-25' in painted, false); // Jue (Anunciación) - NO pintado
      assert.strictEqual('2027-03-26' in painted, false); // Vie (Viernes Santo) - NO pintado
      assert.strictEqual(painted['2027-03-27'], 1); // Sáb
      assert.strictEqual(painted['2027-03-28'], 1); // Dom (no bloquea)
    });
  });

  describe('hasPaintedInRange ignora festivos bloqueantes', () => {
    it('No detecta pintado en festivo bloqueante como "en medio"', () => {
      const painted = { '2027-01-03': 0, '2027-01-09': 0 }; // Dom 3 ene y Sáb 9 ene pintados
      // Rango 4-8 ene: 4,5,6(Epifanía),7,8. 6 es festivo bloqueante, 4,5,7,8 no están pintados
      assert.strictEqual(hasPaintedInRange(painted, '2027-01-04', '2027-01-08'), false);
    });

    it('Detecta pintado en día normal en medio', () => {
      const painted = { '2027-01-03': 0, '2027-01-05': 0 }; // Mar y Jue pintados
      // 4 ene (Mié) NO es festivo, y está en el rango 3-5
      assert.strictEqual(hasPaintedInRange(painted, '2027-01-03', '2027-01-05'), true);
    });
  });

  describe('countSundaysInVacation', () => {
    it('Cuenta domingos pintados', () => {
      const painted = {
        '2027-01-03': 0, // domingo 3 ene
        '2027-01-04': 0, // lunes 4 ene
        '2027-01-10': 1, // domingo 10 ene
        '2027-01-17': 2, // domingo 17 ene
      };
      assert.strictEqual(countSundaysInVacation(painted), 3);
    });

    it('No cuenta si no hay domingos', () => {
      const painted = {
        '2027-01-04': 0, // lunes
        '2027-01-05': 1, // martes
      };
      assert.strictEqual(countSundaysInVacation(painted), 0);
    });

    it('Funciona con objeto vacío', () => {
      assert.strictEqual(countSundaysInVacation({}), 0);
    });
  });

  describe('computeStats incluye domingos en vacaciones', () => {
    it('Devuelve sundaysInVacation en stats', () => {
      const painted = {
        '2027-01-03': 0, // domingo
        '2027-01-10': 1, // domingo
      };
      const stats = computeStats(painted, 1, 'A');
      assert.strictEqual(stats.sundaysInVacation, 2);
      assert.ok('sundaysInVacation' in stats);
    });
  });

  describe('countRestDaysInVacation', () => {
    it('Cuenta descansos (libranzas) en días pintados (excluye domingos)', () => {
      // Grupo 1: semana 1 = mar 5, semana 2 = mié 13, semana 3 = jue 21, semana 4 = vie 28, semana 5 = sáb 5 feb, semana 6 = lun 11 feb
      const painted = {
        '2027-01-05': 0, // martes 5 ene = libranza G1 semana 1
        '2027-01-13': 1, // miércoles 13 ene = libranza G1 semana 2
      };
      assert.strictEqual(countRestDaysInVacation(painted, 1), 2);
    });

    it('NO cuenta domingos (se restan, ya están en "Domingos en vacaciones")', () => {
      const painted = {
        '2027-01-10': 0, // domingo 10 ene
        '2027-01-17': 1, // domingo 17 ene
      };
      assert.strictEqual(countRestDaysInVacation(painted, 1), 0);
      assert.strictEqual(countRestDaysInVacation(painted, 6), 0);
    });

    it('No cuenta si no hay descansos (no domingos) pintados', () => {
      // Grupo 1: 4 ene (lunes) NO es libranza semana 1
      const painted = {
        '2027-01-04': 0, // lunes
        '2027-01-06': 1, // miércoles (semana 1 no es libranza G1)
      };
      assert.strictEqual(countRestDaysInVacation(painted, 1), 0);
    });

    it('Funciona con objeto vacío', () => {
      assert.strictEqual(countRestDaysInVacation({}, 1), 0);
    });

    it('Distinto grupo = distintas libranzas (excluye domingos)', () => {
      // G1 semana 1 = mar 5, G2 semana 1 = mié 6
      const painted = {
        '2027-01-05': 0, // martes = libranza G1
        '2027-01-06': 1, // miércoles = libranza G2
        '2027-01-10': 2, // domingo = libranza todos (se resta)
      };
      assert.strictEqual(countRestDaysInVacation(painted, 1), 1); // solo G1 (martes)
      assert.strictEqual(countRestDaysInVacation(painted, 2), 1); // solo G2 (miércoles)
      assert.strictEqual(countRestDaysInVacation(painted, 3), 0); // G3 libranza jueves
    });
  });

  describe('computeStats incluye descansos en vacaciones', () => {
    it('Devuelve restDaysInVacation en stats (excluye domingos)', () => {
      const painted = {
        '2027-01-05': 0, // martes = libranza G1
        '2027-01-10': 1, // domingo = libranza todos (se resta)
        '2027-01-04': 2, // lunes NO libranza G1
      };
      const stats = computeStats(painted, 1, 'A');
      assert.strictEqual(stats.restDaysInVacation, 1); // solo martes (domingo se resta)
      assert.ok('restDaysInVacation' in stats);
    });
  });

});