# SPEC 03 — Power pellets y modo asustado

> **Estado:** Apovado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-09-17
> **Objetivo:** Añadir 4 power pellets en las esquinas del laberinto que activan 6 s de modo asustado, durante el cual Pac-Man puede comer fantasmas por 200/400/800/1600 en cadena.

## Alcance

**Incluye:**

- Nuevo tile `o` → valor `4` (power pellet) en `maze.js`, colocado en las 4 esquinas clásicas: (1,3), (26,3), (1,23), (26,23).
- Estado de partida `powerTimer` (frames restantes de modo asustado, 360 = 6 s) y `frightenedChain` (cadena de fantasmas comidos).
- Bandera `frightened` por fantasma; los fantasmas en `pen` también se asustan y salen azules mientras el timer viva.
- Fantasmas asustados: huyen maximizando la distancia Manhattan a Pac-Man y van a la mitad de velocidad (0.05).
- Comer un pellet reinicia `powerTimer` a 360; la cadena NO se resetea entre pellets (solo cuando el modo expira).
- Comer fantasma asustado: puntos 200·2^chain (tope 1600 tras 4), teletransporte a su celda de `GHOST_STARTS` en estado `pen` (saldrá por la lógica de `releaseAt` ya existente).
- Dibujo del pellet grande en `render.js`, fantasmas asustados en azul con parpadeo blanco en los últimos 2 s (120 frames).
- Los pellets cuentan en `dotsRemaining` para la condición de victoria; no dan puntos por sí mismos.

**Fuera de alcance (para otros specs):**

- Ojos que regresan a la pen viajando por el laberinto (estado `eaten` visual).
- Media vuelta instantánea de todos los fantasmas al comer el pellet.
- Scatter global programado ni velocidades por nivel.
- Efectos de sonido, animación de muerte o animación de "puntos flotantes" al comer fantasma.

## Modelo de datos

```js
// maze.js — leyenda ampliada
// '#' pared(1) · '.' dot(2) · ' ' vacío(0) · '-' puerta(3) · 'o' power pellet(4)

// game.js — estado de partida (añadidos)
{ ..., powerTimer: 0, frightenedChain: 0 } // frames restantes de asustado; fantasmas comidos en el modo actual

// game.js — cada fantasma (añadido)
{ ..., frightened: false } // se combina con state: 'pen' | 'active'
```

Convenciones: todo frame-based a 60 fps (360 frames = 6 s); coordenadas en celdas `(x, y)` sobre la rejilla 28×31.

## Plan de implementación

1. `maze.js`: añadir `'o'` al `parseTile` (→ 4), actualizar la leyenda del comentario y cambiar los 4 dots de las esquinas (1,3), (26,3), (1,23), (26,23) a `'o'`. Prueba manual: los 4 tiles cambian.
2. `render.js`: dibujar el tile `4` como círculo grande (radio ~6 px). Prueba manual: se ven 4 pellets grandes en las esquinas.
3. `game.js` en `createGame()`: añadir `powerTimer: 0` y `frightenedChain: 0` a la partida, `frightened: false` por fantasma, y contar `v === 2 || v === 4` en `dotsRemaining`. Prueba: la partida carga y el contador de dots incluye los 4 pellets.
4. `game.js` en `movePacman()`: al pisar un tile `4`, ponerlo a 0, decrementar `dotsRemaining`, poner `powerTimer = 360` (sin puntos). Prueba: comer un pellet asusta a los fantasmas activos visibles.
5. `game.js` en `update()`: decrementar `powerTimer`; al llegar a 0, poner `frightened = false` en todos y `frightenedChain = 0`. Al comer pellet, solo se reinicia el timer. Prueba: el modo expira a los ~6 s y todo vuelve a la normalidad.
6. `game.js`: rama asustada en `decideGhost` (elegir la dirección que MAXIMIZA la distancia a Pac-Man, misma regla de no-reversa y desempate `left, right, up, down`) y velocidad 0.05 mientras `frightened && state === 'active'`. Prueba: los fantasmas huyen y son más lentos.
7. `game.js` en `update()`: colisión con fantasma `frightened` → `score += 200 << frightenedChain` (tope tras 4 con 1600), `frightenedChain++`, teletransporte del fantasma a su `GHOST_STARTS` en `state: 'pen'` y `frightened: false`. Colisión con fantasma normal → como hoy (pierde vida). `resetPositions()` limpia `powerTimer`, `frightenedChain` y las banderas `frightened`. Prueba: se come a un fantasma, reaparece en la pen y sale de nuevo.
8. `render.js`: fantasmas con `frightened` en azul oscuro; parpadeo blanco/azul alternando cada ~10 frames cuando `powerTimer <= 120`; fantasma en `pen` asustado también se dibuja azul. Prueba: el aviso de parpadeo se ve antes de que expire.
9. Verificación manual en navegador con el checklist de abajo.

## Criterios de aceptación

- [ ] La partida carga sin errores en consola y se ven 4 pellets grandes en (1,3), (26,3), (1,23), (26,23).
- [ ] Comer un pellet pone a los 4 fantasmas azules: huyen de Pac-Man y a mitad de velocidad.
- [ ] Un fantasma que sale de la pen mientras el modo vive, sale azul.
- [ ] Comer fantasmas asustados suma 200, 400, 800 y 1600 en ese orden dentro del mismo modo.
- [ ] El fantasma comido reaparece en su celda de `GHOST_STARTS`, sale de la pen y ya no está asustado.
- [ ] Chocar con un fantasma NO asustado cuesta una vida, igual que antes de este spec.
- [ ] Comer un segundo pellet reinicia el timer a 6 s sin resetear la cadena.
- [ ] Los fantasmas parpadean blanco en los últimos ~2 s y vuelven a su color al expirar.
- [ ] Al expirar el modo, la cadena vuelve a empezar en 200 con el siguiente pellet.
- [ ] Al perder una vida, el modo asustado se cancela por completo (ni azules ni timer).
- [ ] La partida solo se gana al comer todos los dots y los 4 pellets.
- [ ] El pellet no suma puntos por sí mismo.

## Decisiones

- **Sí:** tile nuevo `o` → 4. `2` es dot y `3` puerta; un valor distinto evita colisiones semánticas en `game.js` y `render.js`.
- **Sí:** 6 s en frames (360), no tiempo real. Es la convención del proyecto (SPEC 01/02).
- **Sí:** huida por maximización de distancia Manhattan. Reutiliza `decideGhost` invirtiendo la comparación; cero lógica nueva de movimiento.
- **Sí:** velocidad asustado 0.05 (la mitad de `GHOST_SPEED`). Da tiempo a cazarlos sin trivializarlo.
- **Sí:** fantasma comido = teleport a `GHOST_STARTS` + `pen`. El más simple de los tres; los "ojos que regresan" quedan descartados por ser mucho código para un efecto puramente estético.
- **Sí:** cadena (200→1600) persiste entre pellets y solo se resetea al expirar el modo. Decisión del usuario.
- **Sí:** los pellets cuentan para ganar y no dan puntos. Decisión del usuario.
- **No:** media vuelta instantánea de los fantasmas al comer el pellet. La huida por target ya los aleja; invertir `dir` de golpe rompería la regla de no-reversa de `decideGhost`.
- **No:** parpadeo del pellet en sí. El pellet se dibuja estático; solo parpadea el fantasma al final del modo.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Fantasma comido pegado a la puerta de la pen: sale al instante y Pac-Man aún está ahí (podría costar una vida) | El fantasma comido sale con `frightened: false` y velocidad normal; caso raro, se verifica visualmente en la puerta (13,11) |
| `frightened` en pen: si el modo expira mientras el fantasma sube, saldría azul a medias | El paso 5 pone `frightened = false` a todos, incluidos los de `pen`; el render pinta azul solo con la bandera viva |
| `powerTimer` en frames asume ~60 fps constantes | Aceptado: el juego ya es 100 % frame-based (ver SPEC 01) |

## Lo que **no** está en este spec

- Ojos que regresan a la pen por el laberinto.
- Efectos de sonido o animaciones de puntos flotantes.
- Cambios de dificultad por nivel (duración del asustado decreciente, etc.).

Cada uno de esos, si aterriza, va en su propio spec.
