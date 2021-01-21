import { Keyboard } from "./keyboard";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const context = canvas.getContext("2d");
const ROWS: number = 20;
const COLUMNS: number = 10;
const BSIZE: number = 30;

type Tetrimino = Array<Array<number>>;
interface Position {
  x: number;
  y: number;
}
interface FallingPiece {
  pos: Position;
  tiles: Tetrimino;
}
const tetriminos: Array<Tetrimino> = [
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  [
    [1, 1],
    [1, 1]
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ]
];

function rotateTetrimino(tetrimino: Tetrimino) {
  let len = tetrimino.length;
  let n = tetrimino.length;
  let out = Array<Array<number>>(len)
    .fill(undefined)
    .map((_, i) => Array(len).fill(0));
  for (let row in tetrimino) {
    for (let col in tetrimino[row]) {
      let xp = -1 * Number(row);
      let yp = Number(col);
      xp = ((xp % n) + n) % n;
      yp = ((yp % n) + n) % n;

      out[yp][xp] = tetrimino[col][row];
    }
  }
  return out;
}

function drawSquare(x: number, y: number, value: number) {
  if (value === 0) {
    return;
  }
  switch (value) {
    case 1: {
      context.fillStyle = "black";
      break;
    }
    default:
      console.log("uhoh invalid square.");
      return;
  }
  context.fillRect(x * BSIZE, y * BSIZE, BSIZE, BSIZE);
}

function drawArray(pos: Position, tiles: Array<Array<number>>) {
  for (let y in tiles) {
    for (let x in tiles[y]) {
      drawSquare(pos.x + Number(x), pos.y + Number(y), tiles[y][x]);
    }
  }
}

type Board = Array<Array<number>>;
class Game {
  board: Board;
  currentlyFalling: FallingPiece;
  intervalId: number;
  keyboard: Keyboard;

  constructor() {
    this.board = Array<Array<number>>(ROWS)
      .fill(undefined)
      .map((_, i) => Array(COLUMNS).fill(0));
    this.currentlyFalling = {
      pos: { x: 0, y: 0 },
      tiles: tetriminos[0]
    };
  }

  getNextFallingPiece(): FallingPiece {
    return {
      pos: { y: 0, x: 0 },
      tiles: tetriminos[Math.floor(Math.random() * tetriminos.length)]
    };
  }

  isWithinBoard(pos: Position): boolean {
    return (
      pos.y >= 0 &&
      pos.y < this.board.length &&
      pos.x >= 0 &&
      pos.x < this.board[0].length
    );
  }

  // can `piece` move `delta`-steps within `board`?
  canMove(board: Board, piece: FallingPiece, delta: Position): boolean {
    for (let y in piece.tiles) {
      for (let x in piece.tiles[y]) {
        // only consider non-empty tile.
        if (piece.tiles[y][x] !== 0) {
          let newy = piece.pos.y + Number(y) + delta.y;
          let newx = piece.pos.x + Number(x) + delta.x;
          if (
            !this.isWithinBoard({ x: newx, y: newy }) ||
            board[newy][newx] !== 0
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }

  mergeFallingPiece() {
    let posy = this.currentlyFalling.pos.y;
    let posx = this.currentlyFalling.pos.x;
    for (let y in this.currentlyFalling.tiles) {
      for (let x in this.currentlyFalling.tiles[y]) {
        let val = this.currentlyFalling.tiles[y][x];
        let boardy = posy + Number(y);
        let boardx = posx + Number(x);
        if (val !== 0 && this.isWithinBoard({ x: boardx, y: boardy })) {
          this.board[boardy][boardx] = val;
        }
      }
    }
  }

  tick() {
    if (this.canMove(this.board, this.currentlyFalling, { y: 1, x: 0 })) {
      this.currentlyFalling.pos.y += 1;
    } else {
      console.log("falling piece has landed!");
      this.mergeFallingPiece();
      let nextPiece = this.getNextFallingPiece();
      if (this.canMove(this.board, nextPiece, { y: 0, x: 0 })) {
        this.currentlyFalling = nextPiece;
      } else {
        console.log("game over :(");
        this.stop();
      }
    }
  }

  render() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "grey";
    context.fillRect(0, 0, COLUMNS * BSIZE, ROWS * BSIZE);
    drawArray({ x: 0, y: 0 }, this.board);
    drawArray(this.currentlyFalling.pos, this.currentlyFalling.tiles);
  }

  start() {
    this.intervalId = setInterval(() => {
      this.tick();
      this.render();
    }, 1000);

    this.keyboard = new Keyboard({
      ArrowLeft: () => {
        if (this.canMove(this.board, this.currentlyFalling, { x: -1, y: 0 })) {
          this.currentlyFalling.pos.x -= 1;
          this.render();
        }
      },
      ArrowRight: () => {
        if (this.canMove(this.board, this.currentlyFalling, { x: 1, y: 0 })) {
          this.currentlyFalling.pos.x += 1;
          this.render();
        }
      },
      ArrowDown: () => {
        this.tick();
        this.render();
      },
      Space: () => {
        let rotatedMino = {
          pos: this.currentlyFalling.pos,
          tiles: rotateTetrimino(this.currentlyFalling.tiles)
        };
        if (this.canMove(this.board, rotatedMino, { x: 0, y: 0 })) {
          this.currentlyFalling = rotatedMino;
        }
        this.render();
      }
    });
  }

  stop() {
    clearInterval(this.intervalId);
  }
}

let game = new Game();
game.start();
