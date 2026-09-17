# SPEC 02 — Salida rápida de la pen

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-17
> **Objetivo:** Reducir los tiempos de salida escalonada de la pen para que pinky, inky y clyde salgan en el primer segundo y medio de partida en intervalos de 0.5 s.

## Alcance

**Incluye:**

- Cambiar `releaseAt` de pinky, inky y clyde en `maze.js`: 90 → 30, 180 → 60, 270 → 90 frames.
- Actualizar el comentario de `releaseTimer` en `game.js` (decía 1.5 s; ahora el último sale a ~1.5 s).

**Fuera de alcance:**

- Movimiento de rebote de los fantasmas dentro de la pen (decidido: se quedan quietos).
- Cambiar la posición inicial de blinky (se mantiene fuera, en (13,11), activo desde el inicio).
- Modificar `movePenGhost` o `resetPositions` (la lógica actual ya sirve).
- Modo asustado / power pellets (spec propio, ver SPEC 01).

## Modelo de datos

Este spec no introduce estructuras nuevas. Solo cambian valores existentes:

```js
// maze.js
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky', releaseAt: 0 },
  { x: 13, y: 14, kind: 'pinky',  releaseAt: 30 },  // 0.5 s
  { x: 15, y: 14, kind: 'inky',   releaseAt: 60 },  // 1 s
  { x: 14, y: 15, kind: 'clyde',  releaseAt: 90 },  // 1.5 s
];
```

## Plan de implementación

1. `maze.js`: actualizar los tres valores `releaseAt` (pinky 30, inky 60, clyde 90) y el comentario de la línea del array.
2. `game.js:52`: corregir el comentario de `releaseTimer` para reflejar los nuevos tiempos.
3. Verificación manual en navegador con el checklist de abajo.

## Criterios de aceptación

- [ ] La partida carga sin errores en consola.
- [ ] Blinky se mueve de inmediato al iniciar la partida (igual que hoy).
- [ ] Pinky empieza a salir de la pen a ~0.5 s, inky a ~1 s y clyde a ~1.5 s (±0.3 s cada uno).
- [ ] La salida se lee como secuencial: ningún par de fantasmas sale a la vez.
- [ ] Al perder una vida, la misma secuencia corta se repite desde cero.

## Decisiones

- **Sí:** intervalo de 0.5 s (30 frames). Resuelve la queja de los >3 s sin perder la lectura de "cola" en la puerta.
- **No:** intervalo de 1 s. Dejaría a clyde saliendo a los 3 s, justo el problema que motiva este spec.
- **No:** rebote dentro de la pen. El usuario lo descartó explícitamente.
- **Sí:** mantener blinky fuera de la pen. Confirmado por el usuario.
- **No:** segundos reales ni delta time. El juego es frame-based; se mantiene la convención de SPEC 01.

## Riesgos

Sin riesgos relevantes: el cambio es de solo valores constantes ya probados por la lógica existente de `movePenGhost`.

## Lo que **no** está en este spec

- Rebote de espera en la pen.
- Velocidades distintas durante la salida.

Cada uno de esos, si aterriza, va en su propio spec.
