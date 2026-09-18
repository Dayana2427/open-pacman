// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const FRIGHTENED_SPEED = 0.05; // mitad de GHOST_SPEED durante el modo asustado

// Esquina inferior-izquierda del laberinto a la que huye Clyde cuando
// Pac-Man se le acerca (distancia Manhattan < 8).
const CLYDE_CORNER = { x: 1, y: 29 };

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    powerTimer: 0,       // frames restantes de modo asustado (360 = 6 s)
    frightenedChain: 0,  // fantasmas comidos en el modo asustado actual
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      releaseAt: g.releaseAt,
      state: g.kind === 'blinky' ? 'active' : 'pen',
      frightened: false,
    } ) ),
    releaseTimer: 0, // frames desde el inicio/reset (60 fps → 90 frames = 1.5 s, el último en salir)
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Comer power pellet: activa modo asustado (sin puntos por si mismo).
    // Se asustan todos, incluidos los de la pen.
    if ( grid[ p.y ][ p.x ] === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.dotsRemaining--;
      game.powerTimer = 360;
      game.ghosts.forEach( ( g ) => { g.frightened = true; } );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Celda objetivo del fantasma segun su personalidad.
//   blinky: la celda de Pac-Man (persecucion directa).
//   pinky:  4 celdas delante de Pac-Man segun su direccion (sin bug arcade).
//   inky:   punto espejo del pivote (2 celdas delante de Pac-Man) respecto
//           a Blinky: blinky + 2*(pivote - blinky).
//   clyde:  persigue a Pac-Man si dista >= 8; si no, huye a su esquina.
function ghostTarget( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );

  if ( g.kind === 'blinky' ) return { x: px, y: py };

  if ( g.kind === 'pinky' ) {
    const d = DIRS[ p.dir ] || DIRS.left;
    return { x: px + 4 * d.x, y: py + 4 * d.y };
  }

  if ( g.kind === 'inky' ) {
    const d = DIRS[ p.dir ] || DIRS.left;
    const pvx = px + 2 * d.x;
    const pvy = py + 2 * d.y;
    const b = game.ghosts.find( ( o ) => o.kind === 'blinky' );
    const bx = b ? Math.round( b.x ) : px;
    const by = b ? Math.round( b.y ) : py;
    return { x: bx + 2 * ( pvx - bx ), y: by + 2 * ( pvy - by ) };
  }

  // clyde
  const dist = Math.abs( Math.round( g.x ) - px ) + Math.abs( Math.round( g.y ) - py );
  return dist >= 8 ? { x: px, y: py } : CLYDE_CORNER;
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Elegir la direccion que minimiza la distancia Manhattan al objetivo.
  // Asustado: huir de Pac-Man, MAXIMIZANDO la distancia hacia el.
  // El orden de DIRS (left, right, up, down) resuelve los empates.
  const target = ghostTarget( game, g );
  const px = Math.round( game.pacman.x );
  const py = Math.round( game.pacman.y );
  let best = choices[ 0 ];
  let bestDist = g.frightened ? -Infinity : Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const distPac = Math.abs( g.x + d.x - px ) + Math.abs( g.y + d.y - py );
    const dist = g.frightened ? distPac : Math.abs( g.x + d.x - target.x ) + Math.abs( g.y + d.y - target.y );
    const mejor = g.frightened ? dist > bestDist : dist < bestDist;
    if ( mejor ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

// Movimiento dentro de la pen: el fantasma espera su releaseAt y luego sube
// hacia la puerta; si no puede subir, se desplaza a la columna 13 (centro de
// la puerta) y sigue subiendo hasta la fila 11, donde pasa a 'active'.
function movePenGhost( game, g ) {
  if ( game.releaseTimer < g.releaseAt ) return;
  const grid = game.grid;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    if ( g.y <= 11 ) {
      g.state = 'active';
      g.dir = 'up'; // decideGhost elegira rumbo en el proximo cruce
      return;
    }
    if ( canMove( grid, g.x, g.y, 'up', 'ghost' ) ) g.dir = 'up';
    else if ( g.x > 13 ) g.dir = 'left';
    else g.dir = 'right';
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
}

function moveGhost( game, g ) {
  if ( g.state === 'pen' ) {
    movePenGhost( game, g );
    return;
  }
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  // Asustado y activo: mitad de velocidad.
  const speed = g.frightened && g.state === 'active' ? FRIGHTENED_SPEED : g.speed;
  g.x += d.x * speed;
  g.y += d.y * speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.state = GHOST_STARTS[ i ].kind === 'blinky' ? 'active' : 'pen';
    g.frightened = false;
  } );
  game.powerTimer = 0;
  game.frightenedChain = 0;
  game.releaseTimer = 0;
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  game.releaseTimer++;
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  // Temporizador del modo asustado: al expirar se apagan las banderas y
  // la cadena de puntos vuelve a empezar.
  if ( game.powerTimer > 0 ) {
    game.powerTimer--;
    if ( game.powerTimer === 0 ) {
      game.frightenedChain = 0;
      game.ghosts.forEach( ( g ) => { g.frightened = false; } );
    }
  }

  for ( let i = 0; i < game.ghosts.length; i++ ) {
    const g = game.ghosts[ i ];
    if ( !collides( game.pacman, g ) ) continue;
    if ( g.frightened ) {
      // Comer fantasma: cadena 200/400/800/1600 y vuelta a la pen.
      game.score += Math.min( 1600, 200 << game.frightenedChain );
      game.frightenedChain++;
      g.x = GHOST_STARTS[ i ].x;
      g.y = GHOST_STARTS[ i ].y;
      g.dir = 'up';
      g.state = 'pen';
      g.frightened = false;
    } else {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
