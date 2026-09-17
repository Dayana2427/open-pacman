
# SPEC 01 — Fantasmas con personalidad clásica

> **Estado:** Aprovado
> **Depende de:** ninguno
> **Fecha:** 2026-09-16
> **Objetivo:** Implementar 4 fantasmas con las personalidades clásicas de Pac-Man (Blinky agresivo, Pinky emboscador, Inky flanqueador y Clyde tímido), con salida escalonada de la pen y un color por personalidad.

## Alcance

**Incluye:**

- Redefinir `GHOST_STARTS` en `maze.js` con 4 fantasmas (kind, celda inicial y orden de salida).
- Lógica de salida escalonada de la pen: Blinky arranca fuera en (13,11); Pinky, Inky y Clyde salen cada 1.5 s.
- Cuatro comportamientos de decisión en `decideGhost` (game.js):
  - **Blinky** (rojo): persigue la celda de Pac-Man minimizando distancia Manhattan en cada cruce.
  - **Pinky** (rosa): apunta 4 celdas delante de Pac-Man según su dirección actual, sin el bug del arcade.
  - **Inky** (cian): punto pivote 2 celdas delante de Pac-Man; su objetivo es el punto espejo respecto a Blinky (`blinky + 2*(pivot - blinky)`).
  - **Clyde** (naranja): persigue a Pac-Man si la distancia Manhattan ≥ 8; si está más cerca, apunta a su esquina inferior-izquierda.
- Reinicio completo al perder vida: posiciones iniciales y contador de liberación a cero.
- Colores por kind en `render.js`: rojo, rosa, cian, naranja.

**Fuera de alcance (para otros specs):**

- Modo asustado / power pellets / fantasmas comestibles (decidido: spec aparte).
- Modo scatter global programado (los targets de esquina solo aplican a Clyde).
- Velocidades distintas por fantasma (todos usan `GHOST_SPEED` 0.1).
- Cambios en el laberinto o en el tamaño del canvas.

## Modelo de datos

```js
// maze.js
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky', releaseAt: 0 },
  { x: 13, y: 14, kind: 'pinky',  releaseAt: 90 },
  { x: 15, y: 14, kind: 'inky',   releaseAt: 180 },
  { x: 14, y: 15, kind: 'clyde',  releaseAt: 270 },
]; // releaseAt en frames (60 fps → 1.5 s = 90 frames)

// game.js — cada fantasma
{ x, y, dir, speed, kind, state: 'pen' | 'active' }

// game.js — estado de partida
{ ..., releaseTimer: 0 } // contador de frames desde el inicio/reset
```

Convenciones: coordenadas en celdas `(x, y)` sobre la rejilla 28×31; el timer solo avanza mientras `update()` se ejecuta con la partida activa.

## Plan de implementación

1. `maze.js`: reemplazar `GHOST_STARTS` por las 4 entradas con `kind` y `releaseAt` (blinky, pinky, inky, clyde).
2. `game.js`: en `createGame()`, añadir `state: 'pen' | 'active'` por fantasma y `releaseTimer: 0`; blinky arranca `active`.
3. `game.js`: avanzar `releaseTimer` en `update()` y liberar fantasmas en pen cuando corresponda; un fantasma en pen sube en línea recta hasta la fila 11 (atraviesa la puerta, permitida para ghosts) y pasa a `active`.
4. `game.js`: reemplazar la rama `hunter/random` de `decideGhost` por los 4 objetivos según kind, con desempate por orden `left, right, up, down`.
5. `game.js`: en `resetPositions()` restaurar estados `pen`/`active` y poner `releaseTimer` a 0.
6. `render.js`: colorear cada fantasma según su kind.
7. Verificación manual en navegador con el checklist de abajo.

## Criterios de aceptación

- [ ] La partida carga sin errores en consola y muestra 4 fantasmas.
- [ ] Blinky inicia en (13,11) fuera de la pen y reduce la distancia a Pac-Man en cada cruce.
- [ ] Pinky sale de la pen a ~1.5 s, Inky a ~3 s y Clyde a ~4.5 s (±0.5 s).
- [ ] Pinky no persigue a Pac-Man directamente: su dirección apunta hacia celdas delante de Pac-Man.
- [ ] Inky se aleja/acerca de forma correlacionada con la posición de Blinky (flanqueo visible).
- [ ] Clyde revierte su rumbo hacia su esquina cuando Pac-Man se acerca a menos de 8 celdas.
- [ ] Los colores son rojo, rosa, cian y naranja, uno por kind.
- [ ] Al perder una vida, los 4 vuelven a su celda inicial y la salida escalonada se repite desde cero.
- [ ] Ningún fantasma atraviesa paredes ni queda atascado, incluido el túnel.

## Decisiones

- **Sí:** personalidades clásicas completas (Blinky/Pinky/Inky/Clyde). Es lo que el usuario eligió y es reconocible al instante.
- **No:** mantener el ghost `random`. Queda sustituido por las 4 personalidades deterministas; si hace falta aleatoriedad futura, será otro spec.
- **No:** bug histórico de Pinky al mirar arriba. Predecibilidad > fidelidad arcade.
- **Sí:** liberación por contador de frames (`releaseAt`), no por tiempo real. Evita depender de delta time; el juego ya es frame-based.
- **Sí:** reset completo del timer al perder vida. Simétrico con el arranque y fácil de verificar.
- **No:** modo asustado. Requiere power pellets y estados extra; el usuario lo asignó explícitamente a otro spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Inky puede oscilar/entrar en bucle al flanquear | La prohibición de marcha atrás de `decideGhost` evita oscilaciones triviales; se verifica visualmente en el corredor del túnel |
| Desempates en distancias iguales impredecibles | Desempate fijo por orden `left, right, up, down` |
| `releaseTimer` en frames asume ~60 fps constantes | Aceptable: todo el juego ya es frame-based con velocidades fijas |

## Lo que **no** está en este spec

- Modo asustado y power pellets (spec propio si aterriza).
- Dificultad progresiva o velocidad de Blinky creciente.
- Multiplayer o controles táctiles.

Cada uno de esos, si aterriza, va en su propio spec.
