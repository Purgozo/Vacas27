# Constitución — Vacas27
Principios innegociables. Toda spec, plan y tarea debe cumplirlos.
1. **Simplicidad primero**: HTML, CSS y JS puros. Sin dependencias ni build. Funciona
abriendo index.html con doble clic.
2. **La spec manda**: nada se implementa si no está en la spec activa. Si falta una
decisión, se para y se pregunta.
3. **Lógica separada de interfaz**: los cálculos (días de vacaciones, días de cada color, fin de semanas largos, etc.) son
funciones puras, sin DOM ni localStorage, que reciben "hoy" como parámetro.
4. **Tests como puerta**: la lógica se prueba con `node --test`, sin instalar paquetes.
Prohibido avanzar con tests en rojo.
5. **Los datos del usuario son sagrados**: localStorage con compatibilidad hacia atrás. Nunca se pierde una sesión.
6. **Idioma**: código en inglés; interfaz y documentación en español.