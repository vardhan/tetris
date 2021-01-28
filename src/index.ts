import { Keyboard } from "./keyboard";

const kRows: number = 20;
const kColumns: number = 10;
const kTileSize: number = 30;
const kBackgroundStyle = "#0f0e17";
const kTileStyles = {
  1: "#E073AC",
  2: "#76BA47",
  3: "#893c75",
  4: "#E85B55",
  5: "#F3A61E",
  6: "#8FD6F1",
  7: "#F5EB58"
}

const gCanvas = document.getElementById("canvas") as HTMLCanvasElement;
const gContext = gCanvas.getContext("2d");

type Tetrimino = Array<Array<number>>;
interface TilePosition {
  x: number;
  y: number;
}
interface FallingTetrimino {
  pos: TilePosition;
  tiles: Tetrimino;
}
const kTetriminos: Array<Tetrimino> = [
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0]
  ],
  [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0]
  ],
  [
    [4, 4],
    [4, 4]
  ],
  [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0]
  ],
  [
    [6, 6, 0],
    [0, 6, 6],
    [0, 0, 0]
  ],
  [
    [0, 7, 0],
    [7, 7, 7],
    [0, 0, 0]
  ]
];

function rotateTetrimino(tetrimino: Tetrimino): Tetrimino {
  let n = tetrimino.length;
  let out = Array<Array<number>>(n)
    .fill(undefined)
    .map((_, i) => Array(n).fill(0));
  for (let row in tetrimino) {
    for (let col in tetrimino[row]) {
      let r = Number(row);
      let c = Number(col);

      let rowp = n - 1 - c;
      let colp = r;

      out[rowp][colp] = tetrimino[row][col];
    }
  }
  return out;
}

// left & top are canvas coordinates
function renderTile(left: number, top: number, value: number) {
  if (value === 0) {
    return;
  }
  if (value < 0 && (value * -1) in kTileStyles) {
    gContext.strokeStyle = kTileStyles[value * -1];
    gContext.lineWidth   = 1;
    gContext.strokeRect(left, top, kTileSize, kTileSize);
  }
  else if (value in kTileStyles) {
    gContext.fillStyle = kTileStyles[value];
    gContext.fillRect(left, top, kTileSize, kTileSize);

    gContext.strokeStyle = kBackgroundStyle;
    gContext.lineWidth   = 1;
    gContext.strokeRect(left, top, kTileSize, kTileSize);
  } else {
    console.log("uhoh invalid renderTile = " + value);
  }
}

// left & top are canvas coordinates
function renderTiles(left: number, top: number, tiles: Array<Array<number>>) {
  for (let y in tiles) {
    for (let x in tiles[y]) {
      renderTile(left + Number(x)*kTileSize, top + Number(y)*kTileSize, tiles[y][x]);
    }
  }
}
function drawTiles(pos: TilePosition, tiles: Array<Array<number>>) {
  renderTiles(pos.x * kTileSize, pos.y * kTileSize, tiles);
}

function makeFallingTetrimino(): FallingTetrimino {
  let randomMino = kTetriminos[Math.floor(Math.random() * kTetriminos.length)];
  // let randomColor = Number(Object.keys(kTileStyles)[Math.floor(Math.random() * Object.keys(kTileStyles).length)]);
  // randomMino = randomMino.map((row) => row.map((tileValue) => tileValue === 0 ? 0 : randomColor ));
  return {
    pos: { y: 0, x: Math.floor((kColumns/2)-(randomMino[0].length/2))},
    tiles: randomMino
  };
}

// Board is an array of kRows. Each row is an array of column values.
type Board = Array<Array<number>>;

class Game {
  board: Board;
  currentlyFalling: FallingTetrimino;
  tetriminoQueue = new Array<FallingTetrimino>();
  running: boolean;
  timerId: number;
  keyboard: Keyboard;
  linesCleared: number = 0;
  score: number = 0;
  showShadow: boolean = true;
  level: number = 0;

  constructor() {
    this.board = Array<Array<number>>(kRows)
      .fill(undefined)
      .map((_, i) => Array(kColumns).fill(0));
    for (let i = 0; i < 1; i++) {
      this.tetriminoQueue.push(makeFallingTetrimino());
    }
    this.getNextTetrimino();
  }

  getNextTetrimino()  {
    let mino = this.tetriminoQueue.shift();
    this.tetriminoQueue.push(makeFallingTetrimino());
    this.currentlyFalling = mino;
  }

  isWithinBoard(pos: TilePosition): boolean {
    return (
      pos.y >= 0 &&
      pos.y < this.board.length &&
      pos.x >= 0 &&
      pos.x < this.board[0].length
    );
  }

  // can `piece` move `delta`-steps within `board`?
  canMove(board: Board, piece: FallingTetrimino, delta: TilePosition): boolean {
    if (!this.running) {
      return false;
    }
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

  clearFullLines() {
    let linesCleared = 0
    for (let row in this.board) {
      // does this row have non-0s? clear it if so!
      if (
        this.board[row].every((val) => {
          return val !== 0;
        })
      ) {
        this.board.splice(Number(row), 1);
        this.board.unshift(Array<number>(kColumns).fill(0));
        linesCleared += 1;
      }
    }
    const kScores = {
      0: 0,
      1: 40,
      2: 100,
      3: 300,
      4: 1200
    };
    this.level = Math.floor(this.linesCleared/10);
    this.score += kScores[linesCleared] * (this.level+1);
    this.linesCleared += linesCleared;
  }

  mergeFallingTetrimino() {
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

    this.clearFullLines();
    this.getNextTetrimino();
    let nextPiece = this.currentlyFalling;
    if (!this.canMove(this.board, nextPiece, { y: 0, x: 0 })) {
      console.log("game over!");
      this.stop();
    }
  }

  tick() {
    if (!this.running) {
      return;
    }

    if (this.canMove(this.board, this.currentlyFalling, { y: 1, x: 0 })) {
      this.currentlyFalling.pos.y += 1;
    } else {
      this.mergeFallingTetrimino();
    }

    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.tick();
      this.render();
    }, this.computeDropDelayInMs());
  }

  computeDropDelayInMs() : number {
    var fps = 0;
    if (this.level >= 10 && this.level <= 12) {
      fps = 5;
    }
    else if (this.level >= 13 && this.level <= 15) {
      fps = 4;
    }
    else if (this.level >= 16 && this.level <= 18) {
      fps = 3;
    }
    else if (this.level >= 19 && this.level <= 28) {
      fps = 2;
    }
    else if (this.level >= 29) {
      fps = 1;
    } else {
      fps = {
        0: 48,
        1: 43,
        2: 38,
        3: 33,
        4: 28,
        5: 23,
        6: 18,
        7: 13,
        8: 8,
        9: 6,
      }[this.level];  
    }
    return Math.floor(fps/60*1000);
  }

  render() {
    gContext.clearRect(0, 0, gCanvas.width, gCanvas.height);
    gContext.fillStyle = kBackgroundStyle;
    gContext.fillRect(0, 0, kColumns * kTileSize, kRows * kTileSize);
    gContext.strokeStyle = "white";
    gContext.strokeRect(0, 0, kColumns * kTileSize, kRows * kTileSize);
    drawTiles({ x: 0, y: 0 }, this.board);
    this.drawFallingPiece();   
    this.renderScore();
  }
  drawFallingPiece() {
    drawTiles(this.currentlyFalling.pos, this.currentlyFalling.tiles);

    // draw the shadow of the falling tile.
    if (this.showShadow) {
    let y = 0;
    while (this.canMove(this.board, this.currentlyFalling, { x: 0, y: y })) {
      y += 1;
    }
    drawTiles({x: this.currentlyFalling.pos.x, y: this.currentlyFalling.pos.y+y - 1}, this.currentlyFalling.tiles.map((row) => row.map((val) => {
      return val == 0 ? 0 :-1 * val;
    })));
    }
  }

  renderScore() {
    let top = 0;
    let left = kColumns * kTileSize;
    let width = gCanvas.width - left;
    gContext.fillStyle = kBackgroundStyle;
    gContext.fillRect(left, 0, width, gCanvas.height);
    left += 10;
    // gContext.strokeStyle = "white";
    // gContext.strokeRect(left, 0, width, gCanvas.height);

    top += 10;

    // Level heading
    top += 20;
    gContext.fillStyle = "grey";
    gContext.font = "12px monospace";
    gContext.fillText("Level", left, top);

    // Level
    top += 30;
    gContext.fillStyle = "white";
    gContext.font = "32px monospace";
    gContext.fillText(String(this.level), left, top);
    top += 10;

    // Lines heading
    top += 20;
    gContext.fillStyle = "grey";
    gContext.font = "12px monospace";
    gContext.fillText("Lines", left, top);

    // Score heading
    gContext.fillStyle = "grey";
    gContext.font = "12px monospace";
    gContext.fillText("Score", left + 100, top);

    // Lines
    top += 20;
    gContext.fillStyle = "white";
    gContext.font = "20px monospace";
    gContext.fillText(String(this.linesCleared), left, top);

    // Score
    gContext.fillStyle = "white";
    gContext.font = "20px monospace";
    gContext.fillText(String(this.score), left + 100, top);

    // Next heading
    top += 70;
    gContext.fillStyle = "grey";
    gContext.font = "20px monospace";
    gContext.fillText("Next", left, top);
    
    // Next tetrimino
    top += 30;
    this.tetriminoQueue.forEach((tetrimino) => {
      renderTiles(left, top, tetrimino.tiles);
      top += tetrimino.tiles.length * kTileSize + kTileSize;
    });

    top += 30;
    if (!this.running) {
      gContext.fillStyle = "red";
      gContext.font = "26px monospace";
      gContext.fillText("GAME OVER", left, top);
    }
  }

  start() {
    this.running = true;
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
      ArrowUp: () => {
        this.rotateCurrentlyFalling();
        this.render();
      },
      Space: () => {
        while (this.canMove(this.board, this.currentlyFalling, { x: 0, y: 1 })) {
          this.tick();
        }
        this.tick();
        this.render();
      },
    });
    this.tick();
    this.render();
  }

  rotateCurrentlyFalling() {
    let rotatedMino = {
      pos: this.currentlyFalling.pos,
      tiles: rotateTetrimino(this.currentlyFalling.tiles)
    };
    if (this.canMove(this.board, rotatedMino, { x: 0, y: 0 })) {
      this.currentlyFalling = rotatedMino;
    } else if (this.canMove(this.board, rotatedMino, { x: 1, y: 0 })) { // try wallkicking left
      rotatedMino.pos.x += 1;
      this.currentlyFalling = rotatedMino;
    }
    else if (this.canMove(this.board, rotatedMino, { x: -1, y: 0 })) { // try wallkicking right
      rotatedMino.pos.x -= 1;
      this.currentlyFalling = rotatedMino;
    }
    this.render();
  }

  stop() {
    this.running = false;
    clearInterval(this.timerId);
    this.render();
  }
}

let game = new Game();
game.start();

document.getElementById("new_game").addEventListener("click", (ev) => {
  game.stop();
  game = new Game();
  game.start();
});

document.getElementById("shadows").addEventListener("change", (ev) => {
  game.showShadow = ev.target.checked;
  game.render();
})