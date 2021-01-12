import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { COLS, BLOCK_SIZE, ROWS, COLORS, LINES_PER_LEVEL, LEVEL, KEY, POINTS } from 'src/app/shared/constants';
import {BoardService} from 'src/app/shared/board.service'
import {  IPeice } from 'src/app/shared/IPeice';
import { Peice } from 'src/app/shared/Peice'; 
@Component({
  selector: 'game-board',
  templateUrl: 'board.component.html'
})
export class BoardComponent implements OnInit {
  @ViewChild('board', { static: true })
  canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('next', { static: true })
  canvasNext: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D;
  ctxNext: CanvasRenderingContext2D;
  board: number[][];
  Peice: Peice;
  next: Peice;
  requestId: number;
  time: { start: number; elapsed: number; level: number };
  points: number;
  lines: number;
  level: number;
  moves = {
    [KEY.LEFT]: (p: IPeice): IPeice => ({ ...p, x: p.x - 1 }),
    [KEY.RIGHT]: (p: IPeice): IPeice => ({ ...p, x: p.x + 1 }),
    [KEY.DOWN]: (p: IPeice): IPeice => ({ ...p, y: p.y + 1 }),
    [KEY.SPACE]: (p: IPeice): IPeice => ({ ...p, y: p.y + 1 }),
    [KEY.UP]: (p: IPeice): IPeice => this.service.rotate(p)
  };

  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.keyCode === KEY.ESC) {
      this.gameOver();
    } else if (this.moves[event.keyCode]) {
      event.preventDefault();
      // Get new state
      let p = this.moves[event.keyCode](this.Peice);
      if (event.keyCode === KEY.SPACE) {
        // Hard drop
        while (this.service.valid(p, this.board)) {
          this.points += POINTS.HARD_DROP;
          this.Peice.move(p);
          p = this.moves[KEY.DOWN](this.Peice);
        }
      } else if (this.service.valid(p, this.board)) {
        this.Peice.move(p);
        if (event.keyCode === KEY.DOWN) {
          this.points += POINTS.SOFT_DROP;
        }
      }
    }
  }

  constructor(private service: BoardService) {}

  ngOnInit() {
    this.initBoard();
    this.initNext();
    this.resetGame();
  }

  initBoard() {
    this.ctx = this.canvas.nativeElement.getContext('2d');

    // Calculate size of canvas from constants.
    this.ctx.canvas.width = COLS * BLOCK_SIZE;
    this.ctx.canvas.height = ROWS * BLOCK_SIZE;

    // Scale so we don't need to give size on every draw.
    this.ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
  }

  initNext() {
    this.ctxNext = this.canvasNext.nativeElement.getContext('2d');

    // Calculate size of canvas from constants.
    this.ctxNext.canvas.width = 4 * BLOCK_SIZE;
    this.ctxNext.canvas.height = 4 * BLOCK_SIZE;

    this.ctxNext.scale(BLOCK_SIZE, BLOCK_SIZE);
  }

  play() {
    this.resetGame();
    this.next = new Peice(this.ctx);
    this.Peice = new Peice(this.ctx);
    this.next.drawNext(this.ctxNext);
    this.time.start = performance.now();

    // If we have an old game running a game then cancel the old
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
    }

    this.animate();
  }

  resetGame() {
    this.points = 0;
    this.lines = 0;
    this.level = 0;
    this.board = this.getEmptyBoard();
    this.time = { start: 0, elapsed: 0, level: LEVEL[this.level] };
  }

  animate(now = 0) {
    this.time.elapsed = now - this.time.start;
    if (this.time.elapsed > this.time.level) {
      this.time.start = now;
      if (!this.drop()) {
        this.gameOver();
        return;
      }
    }
    this.draw();
    this.requestId = requestAnimationFrame(this.animate.bind(this));
  }

  draw() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.Peice.draw();
    this.drawBoard();
  }

  drop(): boolean {
    let p = this.moves[KEY.DOWN](this.Peice);
    if (this.service.valid(p, this.board)) {
      this.Peice.move(p);
    } else {
      this.freeze();
      this.clearLines();
      if (this.Peice.y === 0) {
        // Game over
        return false;
      }
      this.Peice = this.next;
      this.next = new Peice(this.ctx);
      this.next.drawNext(this.ctxNext);
    }
    return true;
  }

  clearLines() {
    let lines = 0;
    this.board.forEach((row, y) => {
      if (row.every(value => value !== 0)) {
        lines++;
        this.board.splice(y, 1);
        this.board.unshift(Array(COLS).fill(0));
      }
    });
    if (lines > 0) {
      this.points += this.service.getLinesClearedPoints(lines, this.level);
      this.lines += lines;
      if (this.lines >= LINES_PER_LEVEL) {
        this.level++;
        this.lines -= LINES_PER_LEVEL;
        this.time.level = LEVEL[this.level];
      }
    }
  }

  freeze() {
    this.Peice.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.board[y + this.Peice.y][x + this.Peice.x] = value;
        }
      });
    });
  }

  drawBoard() {
    this.board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.ctx.fillStyle = COLORS[value];
          this.ctx.fillRect(x, y, 1, 1);
        }
      });
    });
  }

  gameOver() {
    cancelAnimationFrame(this.requestId);
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(1, 5, 18, 2.2);
    this.ctx.font = '2px Arial';
    this.ctx.fillStyle = 'red';
    this.ctx.fillText('GAME OVER', 3.8,  6.8);
  }

  getEmptyBoard(): number[][] {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }
}