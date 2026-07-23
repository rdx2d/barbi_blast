import { GRID_SIZE, CELL_STATE, createEmptyGrid } from './grid.js';
import { pickRandomTray, SHAPE_BY_ID } from './shapes.js';
import { canPlace, applyPlacement, hasAnyValidPlacement } from './placement.js';
import { findClears, clearedCellSet, applyClears, isFullBoardClear } from './clearing.js';
import { scoreDrop, advanceStreak, multiplierForStreak } from './scoring.js';
import { ALLEY_EVENT_INTERVAL, eventsDueAfterScoreCross, pickEvent, runEvent, EVENT_META } from './alleyEvents.js';
import { GameOverModal } from '../ui/gameOverModal.js';
import { GateScreen } from '../ui/gateScreen.js';
import { HomeScreen } from '../ui/homeScreen.js';
import { SettingsSheet } from '../ui/settingsSheet.js';
import { MusicPlayer } from '../audio/musicPlayer.js';
import { getTelegramUser } from '../telegram/identity.js';
import { submitScore } from '../net/api.js';
import { saveRunSnapshot, loadRunSnapshot, clearRunSnapshot } from '../storage/progress.js';
import { tintFor } from './skins.js';

let pendingSnapshot = null;

const COLORS = Object.freeze({
  bgBase: 0x1e1e24,
  bgSurface: 0x3d3a3e,
  bgDeep: 0x0f0f13,
  cellEmpty: 0x2a272c,
  cellEmptyHi: 0x4a464b,
  accentPrimary: 0x39ff14,
  accentSolana: 0x9945ff,
  stateSuccess: 0x14f195,
  ghostValid: 0x39ff14,
  ghostInvalid: 0xff3b3b,
  textMuted: 0xa0a0a5,
});

const CSS = Object.freeze({
  accentPrimary: '#39FF14',
  accentSolana: '#9945FF',
  textPrimary: '#FFFFFF',
  textMuted: '#A0A0A5',
});

const COLOR_TO_TEXTURE = Object.freeze({
  green: 'block-green',
  purple: 'block-purple',
  blue: 'block-blue',
  red: 'block-red',
  yellow: 'block-yellow',
  grey: 'block-grey',
});

const VIRTUAL_WIDTH = 720;
const VIRTUAL_HEIGHT = 1280;
const TRAY_SIZE = 3;

class BoardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BoardScene' });
    this.grid = createEmptyGrid();
    this.gridColors = createEmptyGrid();
    this.cellSprites = [];
    this.tray = [];
    this.ghostSprites = [];
    this.metrics = null;

    this.score = 0;
    this.highScore = 0;
    this.streakState = { streakCount: 0, placementsSinceLastClear: 0 };
    this.hudRefs = {};

    this.hazardSprites = [];
    this.alleyEventsFired = 0;

    this.gameOver = false;
    this.modal = null;
  }

  preload() {
    const base = 'assets/blocks';
    this.load.image('block-green', `${base}/element_green_square_glossy.png`);
    this.load.image('block-purple', `${base}/element_purple_cube_glossy.png`);
    this.load.image('block-grey', `${base}/element_grey_square_glossy.png`);
    this.load.image('block-blue', `${base}/element_blue_square_glossy.png`);
    this.load.image('block-red', `${base}/element_red_square_glossy.png`);
    this.load.image('block-yellow', `${base}/element_yellow_square_glossy.png`);
    this.load.image('backdrop-barbi', 'assets/img/fentanyl-barbi.webp');
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bgDeep);
    this.drawBackdrop();
    this.drawTitle();
    this.drawHud();
    this.drawBoard();
    this.drawFooterTag();

    const snap = pendingSnapshot;
    pendingSnapshot = null;
    if (!(snap && this.applySnapshot(snap))) {
      this.spawnTray();
    }
    this.updateTrayDimStates();
    this.refreshHud();

    this.modal = new GameOverModal({
      onRevive: () => this.frogRocketRevive(),
      onPlayAgain: () => this.hardReset(),
    });

    this.onSkinChanged = () => this.retintAll();
    window.addEventListener('bb:skin-changed', this.onSkinChanged);
    this.events.once('shutdown', () => window.removeEventListener('bb:skin-changed', this.onSkinChanged));
    this.events.once('destroy', () => window.removeEventListener('bb:skin-changed', this.onSkinChanged));
  }

  applySnapshot(snap) {
    try {
      const trayPieces = snap.tray.map((t) => {
        const shape = SHAPE_BY_ID[t.shapeId];
        if (!shape && !t.placed) throw new Error(`unknown shape ${t.shapeId}`);
        return { shape: shape ?? SHAPE_BY_ID.mono, colorKey: t.colorKey ?? 'green', placed: !!t.placed };
      });
      if (trayPieces.length === 0 || trayPieces.every((t) => t.placed)) {
        throw new Error('empty tray in snapshot');
      }
      this.grid = snap.grid.map((row) => row.slice());
      this.gridColors = (snap.gridColors ?? createEmptyGrid()).map((row) => row.slice());
      this.score = snap.score;
      if (this.score > this.highScore) this.highScore = this.score;
      this.streakState = snap.streakState ?? { streakCount: 0, placementsSinceLastClear: 0 };
      this.alleyEventsFired = snap.alleyEventsFired ?? 0;
      this.restoreBoardSprites();
      this.spawnTray(trayPieces);
      return true;
    } catch (err) {
      console.warn('[progress] snapshot restore failed:', err.message);
      return false;
    }
  }

  restoreBoardSprites() {
    const { cellSize } = this.metrics;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const state = this.grid[r][c];
        if (state === CELL_STATE.FILLED) {
          const colorKey = this.gridColors[r][c] || 'green';
          const world = this.cellToWorld(r, c);
          const sprite = this.add.image(
            world.x + cellSize / 2,
            world.y + cellSize / 2,
            COLOR_TO_TEXTURE[colorKey] ?? COLOR_TO_TEXTURE.green,
          );
          sprite.setDisplaySize(cellSize, cellSize);
          sprite.setTint(tintFor(colorKey));
          sprite.setData('colorKey', colorKey);
          this.cellSprites[r][c] = sprite;
        } else if (state === CELL_STATE.HAZARD) {
          this.spawnHazardCell(r, c);
        }
      }
    }
  }

  retintAll() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const s = this.cellSprites?.[r]?.[c];
        if (s && s.getData) {
          const key = s.getData('colorKey');
          if (key) s.setTint(tintFor(key));
        }
        const h = this.hazardSprites?.[r]?.[c];
        if (h && h.list) {
          for (const child of h.list) {
            if (child.getData && child.getData('colorKey')) {
              child.setTint(tintFor(child.getData('colorKey')));
            }
          }
        }
      }
    }
    for (const entry of this.tray ?? []) {
      const container = entry.container;
      if (!container || !container.list) continue;
      for (const child of container.list) {
        if (child.getData && child.getData('colorKey')) {
          child.setTint(tintFor(child.getData('colorKey')));
        }
      }
    }
  }

  saveProgress() {
    if (this.gameOver) return;
    saveRunSnapshot({
      grid: this.grid,
      gridColors: this.gridColors,
      score: this.score,
      streakState: this.streakState,
      alleyEventsFired: this.alleyEventsFired,
      tray: this.tray.map((t) => ({
        shapeId: t.shape?.id ?? 'mono',
        colorKey: t.colorKey,
        placed: t.placed,
      })),
    });
  }

  drawBackdrop() {
    const baseFill = this.add.graphics();
    baseFill.fillStyle(COLORS.bgBase, 1);
    baseFill.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    if (this.textures.exists('backdrop-barbi')) {
      const barbi = this.add.image(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, 'backdrop-barbi');
      const tex = this.textures.get('backdrop-barbi').getSourceImage();
      const scale = Math.max(VIRTUAL_WIDTH / tex.width, VIRTUAL_HEIGHT / tex.height);
      barbi.setScale(scale);
      barbi.setAlpha(0.42);
      barbi.setTint(0x8fa8ff);
    }

    const darken = this.add.graphics();
    darken.fillStyle(COLORS.bgDeep, 0.55);
    darken.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    const vignette = this.add.graphics();
    const rings = 24;
    const maxR = Math.hypot(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) / 2;
    for (let i = rings; i > 0; i--) {
      const t = i / rings;
      const alpha = 0.05 * t;
      vignette.fillStyle(COLORS.bgDeep, alpha);
      vignette.fillCircle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, maxR * t);
    }

    const scan = this.add.graphics();
    scan.lineStyle(1, 0x000000, 0.22);
    for (let y = 0; y < VIRTUAL_HEIGHT; y += 4) {
      scan.lineBetween(0, y, VIRTUAL_WIDTH, y);
    }

    const noise = this.add.graphics();
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * VIRTUAL_WIDTH;
      const y = Math.random() * VIRTUAL_HEIGHT;
      const a = 0.02 + Math.random() * 0.05;
      noise.fillStyle(0xffffff, a);
      noise.fillRect(x, y, 1, 1);
    }
  }

  drawTitle() {
    const cx = VIRTUAL_WIDTH / 2;
    this.add.text(cx + 4, 64 + 4, 'BARBI BLAST', {
      fontFamily: '"Press Start 2P"',
      fontSize: '36px',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.55);

    const title = this.add.text(cx, 64, 'BARBI BLAST', {
      fontFamily: '"Press Start 2P"',
      fontSize: '36px',
      color: CSS.accentPrimary,
      stroke: '#003b02',
      strokeThickness: 5,
    }).setOrigin(0.5);

    if (title.preFX) {
      title.preFX.setPadding(24);
      title.preFX.addGlow(0x39ff14, 4, 0, false, 0.1, 16);
    }

    this.add.text(cx, 100, '// SLUM ALLEY BLOCKS //', {
      fontFamily: '"VT323"',
      fontSize: '20px',
      color: CSS.textMuted,
    }).setOrigin(0.5);
  }

  drawHud() {
    const leftX = 48;
    const rightX = VIRTUAL_WIDTH - 48;
    const y = 138;

    this.add.text(leftX, y - 12, 'SCORE', {
      fontFamily: '"Press Start 2P"',
      fontSize: '11px',
      color: CSS.textMuted,
    }).setOrigin(0, 1);

    this.hudRefs.score = this.add.text(leftX, y, '0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '26px',
      color: CSS.accentPrimary,
      stroke: '#003b02',
      strokeThickness: 3,
    }).setOrigin(0, 0);

    this.add.text(rightX, y - 12, 'HIGH', {
      fontFamily: '"Press Start 2P"',
      fontSize: '11px',
      color: CSS.textMuted,
    }).setOrigin(1, 1);

    this.hudRefs.high = this.add.text(rightX, y, '0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '18px',
      color: CSS.textPrimary,
    }).setOrigin(1, 0);

    this.hudRefs.streak = this.add.text(rightX, y + 30, '', {
      fontFamily: '"VT323"',
      fontSize: '22px',
      color: CSS.accentPrimary,
    }).setOrigin(1, 0);

    const user = getTelegramUser();
    if (user) {
      this.add.text(leftX, y + 34, `@${user.displayName}`, {
        fontFamily: '"VT323"',
        fontSize: '20px',
        color: CSS.textMuted,
      }).setOrigin(0, 0);
    }
  }

  refreshHud() {
    if (!this.hudRefs.score) return;
    this.hudRefs.score.setText(String(this.score));
    this.hudRefs.high.setText(String(this.highScore));
    const streak = this.streakState.streakCount;
    if (streak > 0) {
      const mult = multiplierForStreak(streak);
      this.hudRefs.streak.setText(`STREAK x${mult.toFixed(1)}`);
    } else {
      this.hudRefs.streak.setText('');
    }
  }

  drawBoard() {
    const outerPad = 48;
    const boardSize = VIRTUAL_WIDTH - outerPad * 2;
    const cellGap = 6;
    const innerPad = 18;
    const innerBoardSize = boardSize - innerPad * 2;
    const cellSize = (innerBoardSize - cellGap * (GRID_SIZE - 1)) / GRID_SIZE;

    const boardX = (VIRTUAL_WIDTH - boardSize) / 2;
    const boardY = 205;

    const frameShadow = this.add.graphics();
    frameShadow.fillStyle(0x000000, 0.55);
    frameShadow.fillRoundedRect(boardX + 6, boardY + 10, boardSize, boardSize, 22);

    const frame = this.add.graphics();
    frame.fillStyle(COLORS.bgSurface, 1);
    frame.fillRoundedRect(boardX, boardY, boardSize, boardSize, 22);
    frame.lineStyle(3, COLORS.accentPrimary, 0.85);
    frame.strokeRoundedRect(boardX, boardY, boardSize, boardSize, 22);
    if (frame.postFX) {
      frame.postFX.addGlow(0x39ff14, 6, 0, false, 0.1, 12);
    }

    const bevel = this.add.graphics();
    bevel.lineStyle(2, 0xffffff, 0.06);
    bevel.strokeRoundedRect(boardX + 4, boardY + 4, boardSize - 8, boardSize - 8, 18);

    const cellsX = boardX + innerPad;
    const cellsY = boardY + innerPad;

    for (let row = 0; row < GRID_SIZE; row++) {
      this.cellSprites[row] = [];
      this.hazardSprites[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = cellsX + col * (cellSize + cellGap);
        const y = cellsY + row * (cellSize + cellGap);
        this.drawEmptyCell(x, y, cellSize);
        this.cellSprites[row][col] = null;
        this.hazardSprites[row][col] = null;
      }
    }

    this.metrics = { boardX, boardY, boardSize, cellsX, cellsY, cellSize, cellGap };
  }

  drawEmptyCell(x, y, size) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.cellEmpty, 1);
    g.fillRoundedRect(x, y, size, size, 6);

    g.lineStyle(1, COLORS.cellEmptyHi, 0.35);
    g.strokeRoundedRect(x + 0.5, y + 0.5, size - 1, size - 1, 6);

    g.fillStyle(0xffffff, 0.03);
    g.fillRoundedRect(x + 3, y + 3, size - 6, Math.max(4, size * 0.25), 4);
  }

  drawFooterTag() {
    const cx = VIRTUAL_WIDTH / 2;
    const y = VIRTUAL_HEIGHT - 40;

    this.add.text(cx, y - 20, 'HOLD $FB • UNLOCK FROG ROCKET', {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      color: CSS.accentSolana,
    }).setOrigin(0.5);

    this.add.text(cx, y + 4, 'threshold: 500 $FB • read-only', {
      fontFamily: '"VT323"',
      fontSize: '20px',
      color: CSS.textMuted,
    }).setOrigin(0.5);
  }

  cellToWorld(row, col) {
    const { cellsX, cellsY, cellSize, cellGap } = this.metrics;
    return {
      x: cellsX + col * (cellSize + cellGap),
      y: cellsY + row * (cellSize + cellGap),
    };
  }

  worldToCell(x, y) {
    const { cellsX, cellsY, cellSize, cellGap } = this.metrics;
    const stride = cellSize + cellGap;
    const col = Math.round((x - cellsX) / stride);
    const row = Math.round((y - cellsY) / stride);
    return { row, col };
  }

  getTraySlotPositions() {
    const { boardX, boardY, boardSize, cellSize } = this.metrics;
    const trayY = boardY + boardSize + 90;
    const trayWidth = boardSize;
    const slotWidth = trayWidth / TRAY_SIZE;
    return [0, 1, 2].map((i) => ({
      x: boardX + slotWidth * (i + 0.5),
      y: trayY,
      slotWidth,
      cellSize,
    }));
  }

  spawnTray(restorePieces = null) {
    this.tray = [];
    const trayData = restorePieces ?? pickRandomTray(TRAY_SIZE);
    const slots = this.getTraySlotPositions();
    trayData.forEach((piece, i) => {
      if (piece.placed) {
        this.tray.push({
          shape: piece.shape,
          colorKey: piece.colorKey,
          container: null,
          homeX: slots[i].x,
          homeY: slots[i].y,
          slot: i,
          placed: true,
        });
        return;
      }
      const trayCellSize = slots[i].cellSize * 0.55;
      const container = this.buildPieceContainer(piece.shape, piece.colorKey, trayCellSize);
      container.x = slots[i].x;
      container.y = slots[i].y;
      container.setSize(piece.shape.cols * trayCellSize, piece.shape.rows * trayCellSize);
      container.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(container);

      const trayEntry = {
        shape: piece.shape,
        colorKey: piece.colorKey,
        container,
        homeX: slots[i].x,
        homeY: slots[i].y,
        trayCellSize,
        boardCellSize: slots[i].cellSize,
        slot: i,
        placed: false,
      };
      container.setData('trayEntry', trayEntry);
      this.attachDragHandlers(container, trayEntry);
      this.tray.push(trayEntry);
    });
  }

  buildPieceContainer(shape, colorKey, cellSize) {
    const container = this.add.container(0, 0);
    const gap = Math.max(2, cellSize * 0.08);
    const totalW = shape.cols * cellSize + (shape.cols - 1) * gap;
    const totalH = shape.rows * cellSize + (shape.rows - 1) * gap;
    const originX = -totalW / 2;
    const originY = -totalH / 2;

    for (let r = 0; r < shape.rows; r++) {
      for (let c = 0; c < shape.cols; c++) {
        if (shape.matrix[r][c] !== 1) continue;
        const x = originX + c * (cellSize + gap) + cellSize / 2;
        const y = originY + r * (cellSize + gap) + cellSize / 2;
        const sprite = this.add.image(x, y, COLOR_TO_TEXTURE[colorKey]);
        sprite.setDisplaySize(cellSize, cellSize);
        sprite.setTint(tintFor(colorKey));
        sprite.setData('colorKey', colorKey);
        container.add(sprite);
      }
    }
    return container;
  }

  attachDragHandlers(container, entry) {
    container.on('dragstart', (pointer) => this.onDragStart(pointer, container, entry));
    container.on('drag', (pointer, dragX, dragY) => this.onDrag(pointer, container, entry, dragX, dragY));
    container.on('dragend', (pointer) => this.onDragEnd(pointer, container, entry));
  }

  onDragStart(pointer, container, entry) {
    if (entry.placed || this.gameOver) return;
    this.children.bringToTop(container);
    const scale = entry.boardCellSize / entry.trayCellSize;
    this.tweens.add({
      targets: container,
      scale,
      duration: 90,
      ease: 'Cubic.easeOut',
    });
    entry.activeScale = scale;
  }

  onDrag(pointer, container, entry, dragX, dragY) {
    if (entry.placed || this.gameOver) return;
    container.x = dragX;
    container.y = dragY - entry.boardCellSize * 1.2;
    this.updateGhost(entry, container);
  }

  onDragEnd(pointer, container, entry) {
    if (entry.placed || this.gameOver) return;
    const target = this.computeDropTarget(entry, container);
    this.clearGhost();

    if (target && canPlace(this.grid, entry.shape, target.row, target.col)) {
      this.commitPlacement(entry, target.row, target.col);
    } else {
      this.tweens.add({
        targets: container,
        x: entry.homeX,
        y: entry.homeY,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }
  }

  computeDropTarget(entry, container) {
    const gap = Math.max(2, entry.boardCellSize * 0.08);
    const shapeW = entry.shape.cols * entry.boardCellSize + (entry.shape.cols - 1) * gap;
    const shapeH = entry.shape.rows * entry.boardCellSize + (entry.shape.rows - 1) * gap;
    const topLeftX = container.x - shapeW / 2;
    const topLeftY = container.y - shapeH / 2;
    const { row, col } = this.worldToCell(topLeftX, topLeftY);
    if (row < 0 || col < 0) return null;
    if (row + entry.shape.rows > GRID_SIZE) return null;
    if (col + entry.shape.cols > GRID_SIZE) return null;
    return { row, col };
  }

  updateGhost(entry, container) {
    this.clearGhost();
    const target = this.computeDropTarget(entry, container);
    if (!target) return;

    const valid = canPlace(this.grid, entry.shape, target.row, target.col);
    const color = valid ? COLORS.ghostValid : COLORS.ghostInvalid;
    const { cellSize } = this.metrics;
    const { matrix, rows, cols } = entry.shape;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] !== 1) continue;
        const world = this.cellToWorld(target.row + r, target.col + c);
        const g = this.add.graphics();
        g.fillStyle(color, valid ? 0.25 : 0.18);
        g.fillRoundedRect(world.x, world.y, cellSize, cellSize, 6);
        g.lineStyle(2, color, 0.9);
        g.strokeRoundedRect(world.x, world.y, cellSize, cellSize, 6);
        this.ghostSprites.push(g);
      }
    }
  }

  clearGhost() {
    for (const g of this.ghostSprites) g.destroy();
    this.ghostSprites = [];
  }

  commitPlacement(entry, row, col) {
    this.grid = applyPlacement(this.grid, entry.shape, row, col);

    const { matrix, rows, cols } = entry.shape;
    const { cellSize } = this.metrics;
    const cellsPlaced = entry.shape.cells;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] !== 1) continue;
        const gr = row + r;
        const gc = col + c;
        this.gridColors[gr][gc] = entry.colorKey;
        const world = this.cellToWorld(gr, gc);
        const sprite = this.add.image(world.x + cellSize / 2, world.y + cellSize / 2, COLOR_TO_TEXTURE[entry.colorKey]);
        sprite.setDisplaySize(cellSize, cellSize);
        sprite.setTint(tintFor(entry.colorKey));
        sprite.setData('colorKey', entry.colorKey);
        this.cellSprites[gr][gc] = sprite;
      }
    }

    const clears = findClears(this.grid);
    const linesCleared = clears.rows.length + clears.cols.length;
    let cellsCleared = 0;
    let fullBoardClear = false;

    if (linesCleared > 0) {
      const clearedSet = clearedCellSet(clears.rows, clears.cols, this.grid.length);
      cellsCleared = clearedSet.size;
      this.animateClears(clearedSet);
      this.grid = applyClears(this.grid, clears.rows, clears.cols);
      for (const key of clearedSet) {
        const [gr, gc] = key.split(',').map(Number);
        this.gridColors[gr][gc] = CELL_STATE.EMPTY;
      }
      fullBoardClear = isFullBoardClear(this.grid);
    }

    const streakOutcome = advanceStreak(this.streakState, linesCleared);
    this.streakState = streakOutcome.state;

    const dropScore = scoreDrop({
      cellsPlaced,
      cellsCleared,
      linesCleared,
      fullBoardClear,
      streakCount: this.streakState.streakCount,
    });

    const prevScore = this.score;
    this.score += dropScore.total;
    if (this.score > this.highScore) this.highScore = this.score;

    const popCenter = this.pieceCenterInWorld(entry.shape, row, col);
    this.showScorePop(popCenter.x, popCenter.y, dropScore.total, linesCleared > 0);

    if (linesCleared > 0) {
      this.showLineClearBanner(linesCleared, fullBoardClear, dropScore.bonus, dropScore.multiplier);
    } else if (streakOutcome.broken) {
      this.showStreakBrokenBanner();
    }

    entry.placed = true;
    entry.container.destroy();

    if (this.tray.every((t) => t.placed)) {
      this.spawnTray();
    }
    this.updateTrayDimStates();
    this.refreshHud();

    this.maybeFireAlleyEvent(prevScore);
    this.saveProgress();
  }

  pieceCenterInWorld(shape, row, col) {
    const { cellSize, cellGap } = this.metrics;
    const topLeft = this.cellToWorld(row, col);
    const w = shape.cols * cellSize + (shape.cols - 1) * cellGap;
    const h = shape.rows * cellSize + (shape.rows - 1) * cellGap;
    return { x: topLeft.x + w / 2, y: topLeft.y + h / 2 };
  }

  animateClears(clearedSet) {
    for (const key of clearedSet) {
      const [r, c] = key.split(',').map(Number);
      const sprite = this.cellSprites[r][c];
      if (!sprite) continue;
      this.cellSprites[r][c] = null;
      sprite.setTint(0xffffff);
      const targetScale = (sprite.scaleX || 1) * 1.3;
      this.tweens.add({
        targets: sprite,
        scaleX: targetScale,
        scaleY: targetScale,
        alpha: 0,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => sprite.destroy(),
      });
    }
  }

  showScorePop(x, y, points, isBonus) {
    if (points <= 0) return;
    const text = this.add.text(x, y, `+${points}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: isBonus ? '22px' : '16px',
      color: isBonus ? '#39FF14' : '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  showLineClearBanner(linesCleared, fullBoardClear, bonus, multiplier) {
    let label;
    if (fullBoardClear) label = 'FULL CLEAR!';
    else if (linesCleared >= 5) label = `${linesCleared}X MEGA!`;
    else if (linesCleared >= 3) label = `${linesCleared}X COMBO!`;
    else if (linesCleared === 2) label = 'DOUBLE!';
    else label = 'CLEAR!';

    const cx = VIRTUAL_WIDTH / 2;
    const y = this.metrics.boardY + this.metrics.boardSize / 2;

    const text = this.add.text(cx, y, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: fullBoardClear ? '44px' : '32px',
      color: fullBoardClear ? '#14F195' : '#39FF14',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(1001).setAlpha(0);

    if (text.preFX) {
      text.preFX.setPadding(24);
      text.preFX.addGlow(fullBoardClear ? 0x14f195 : 0x39ff14, 6, 0, false, 0.1, 20);
    }

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: { from: 0.6, to: 1.15 },
      duration: 220,
      ease: 'Back.easeOut',
      yoyo: false,
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          y: y - 40,
          delay: 400,
          duration: 350,
          ease: 'Cubic.easeIn',
          onComplete: () => text.destroy(),
        });
      },
    });

    if (multiplier > 1) {
      const multText = this.add.text(cx, y + 50, `x${multiplier.toFixed(1)} STREAK`, {
        fontFamily: '"VT323"',
        fontSize: '32px',
        color: '#39FF14',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(1001).setAlpha(0);

      this.tweens.add({
        targets: multText,
        alpha: 1,
        duration: 200,
        onComplete: () => {
          this.tweens.add({
            targets: multText,
            alpha: 0,
            delay: 500,
            duration: 300,
            onComplete: () => multText.destroy(),
          });
        },
      });
    }
  }

  showStreakBrokenBanner() {
    const cx = VIRTUAL_WIDTH / 2;
    const y = this.metrics.boardY + this.metrics.boardSize + 30;
    const text = this.add.text(cx, y, 'STREAK LOST', {
      fontFamily: '"VT323"',
      fontSize: '28px',
      color: '#ff3b3b',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1000).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 150,
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          delay: 500,
          duration: 300,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  maybeFireAlleyEvent(prevScore) {
    const due = eventsDueAfterScoreCross(prevScore, this.score, ALLEY_EVENT_INTERVAL);
    if (due <= 0) return;
    for (let i = 0; i < due; i++) {
      this.fireAlleyEvent();
    }
    this.alleyEventsFired += due;
  }

  fireAlleyEvent() {
    const eventType = pickEvent();
    const result = runEvent(eventType, this.grid);
    this.grid = result.grid;

    const meta = EVENT_META[eventType] ?? { label: 'ALLEY EVENT', subtitle: '' };
    this.playAlleyEventFx(meta);

    for (const { r, c } of result.placed) {
      this.spawnHazardCell(r, c);
    }

    this.updateTrayDimStates();
  }

  playAlleyEventFx(meta) {
    this.cameras.main.shake(240, 0.008);

    const flash = this.add.graphics().setDepth(2000);
    flash.fillStyle(0x39ff14, 0.35);
    flash.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    const cx = VIRTUAL_WIDTH / 2;
    const y = this.metrics.boardY + this.metrics.boardSize / 2 - 40;

    const banner = this.add.text(cx, y, `!! ${meta.label} !!`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '30px',
      color: '#ff3b3b',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2001).setAlpha(0);

    if (banner.preFX) {
      banner.preFX.setPadding(24);
      banner.preFX.addGlow(0xff3b3b, 6, 0, false, 0.1, 20);
    }

    const subtitle = this.add.text(cx, y + 44, meta.subtitle ?? '', {
      fontFamily: '"VT323"',
      fontSize: '22px',
      color: '#A0A0A5',
    }).setOrigin(0.5).setDepth(2001).setAlpha(0);

    this.tweens.add({
      targets: [banner, subtitle],
      alpha: 1,
      scale: { from: 0.6, to: 1.1 },
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [banner, subtitle],
          alpha: 0,
          delay: 700,
          duration: 350,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            banner.destroy();
            subtitle.destroy();
          },
        });
      },
    });
  }

  spawnHazardCell(row, col) {
    const { cellSize } = this.metrics;
    const world = this.cellToWorld(row, col);
    const cx = world.x + cellSize / 2;
    const cy = world.y + cellSize / 2;

    const container = this.add.container(cx, cy);
    container.setDepth(50);

    const base = this.add.image(0, 0, COLOR_TO_TEXTURE.grey);
    base.setDisplaySize(cellSize, cellSize);
    base.setTint(tintFor('grey'));
    base.setData('colorKey', 'grey');
    container.add(base);

    const stripes = this.add.graphics();
    const half = cellSize / 2 - 3;
    const stripeGap = 8;
    stripes.lineStyle(3, 0xffd51e, 0.9);
    for (let d = -cellSize; d < cellSize; d += stripeGap) {
      const x1 = -half + d;
      const y1 = -half;
      const x2 = -half + d + cellSize;
      const y2 = -half + cellSize;
      const clipped = this.clipDiagonalToSquare(x1, y1, x2, y2, -half, half);
      if (clipped) {
        stripes.lineBetween(clipped.x1, clipped.y1, clipped.x2, clipped.y2);
      }
    }
    container.add(stripes);

    const border = this.add.graphics();
    border.lineStyle(2, 0xffd51e, 0.6);
    border.strokeRect(-cellSize / 2 + 1, -cellSize / 2 + 1, cellSize - 2, cellSize - 2);
    container.add(border);

    container.setScale(0);
    container.setAngle(-8);
    this.tweens.add({
      targets: container,
      scale: 1,
      angle: 0,
      duration: 260,
      ease: 'Back.easeOut',
      delay: 120 + Math.random() * 160,
    });

    this.hazardSprites[row][col] = container;
  }

  frogRocketRevive() {
    this.explodeBoardSprites(true);
    this.grid = createEmptyGrid();
    this.gridColors = createEmptyGrid();
    this.streakState = { streakCount: 0, placementsSinceLastClear: 0 };

    this.playFrogRocketFx();

    this.time.delayedCall(900, () => {
      this.clearActiveTray();
      this.spawnTray();
      this.updateTrayDimStates();
      this.refreshHud();
      this.gameOver = false;
      this.saveProgress();
    });
  }

  hardReset() {
    this.explodeBoardSprites(false);
    this.grid = createEmptyGrid();
    this.gridColors = createEmptyGrid();
    this.streakState = { streakCount: 0, placementsSinceLastClear: 0 };
    this.score = 0;
    this.alleyEventsFired = 0;

    this.time.delayedCall(400, () => {
      this.clearActiveTray();
      this.spawnTray();
      this.updateTrayDimStates();
      this.refreshHud();
      this.gameOver = false;
      this.saveProgress();
    });
  }

  explodeBoardSprites(withRadialFling) {
    const cx = this.metrics.cellsX + (this.metrics.cellSize * GRID_SIZE + this.metrics.cellGap * (GRID_SIZE - 1)) / 2;
    const cy = this.metrics.cellsY + (this.metrics.cellSize * GRID_SIZE + this.metrics.cellGap * (GRID_SIZE - 1)) / 2;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.cellSprites[r][c];
        const hazard = this.hazardSprites[r][c];
        const target = cell || hazard;
        if (!target) continue;
        this.cellSprites[r][c] = null;
        this.hazardSprites[r][c] = null;

        const tx = target.x ?? 0;
        const ty = target.y ?? 0;
        if (withRadialFling) {
          const dx = tx - cx;
          const dy = ty - cy;
          const dist = Math.hypot(dx, dy) || 1;
          const flingX = tx + (dx / dist) * 260 + (Math.random() - 0.5) * 40;
          const flingY = ty + (dy / dist) * 260 + (Math.random() - 0.5) * 40;
          this.tweens.add({
            targets: target,
            x: flingX,
            y: flingY,
            angle: (Math.random() - 0.5) * 240,
            alpha: 0,
            scaleX: (target.scaleX || 1) * 1.6,
            scaleY: (target.scaleY || 1) * 1.6,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => target.destroy(),
          });
        } else {
          this.tweens.add({
            targets: target,
            alpha: 0,
            duration: 280,
            ease: 'Cubic.easeOut',
            onComplete: () => target.destroy(),
          });
        }
      }
    }
  }

  clearActiveTray() {
    for (const entry of this.tray) {
      if (!entry.placed && entry.container?.destroy) {
        entry.container.destroy();
      }
    }
    this.tray = [];
  }

  playFrogRocketFx() {
    this.cameras.main.shake(480, 0.018);

    const flash = this.add.graphics().setDepth(3000);
    flash.fillStyle(0x14f195, 0.75);
    flash.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    const cx = VIRTUAL_WIDTH / 2;
    const cy = this.metrics.boardY + this.metrics.boardSize / 2;

    const banner = this.add.text(cx, cy, 'FROG ROCKET', {
      fontFamily: '"Press Start 2P"',
      fontSize: '52px',
      color: '#14F195',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(3001).setAlpha(0);

    if (banner.preFX) {
      banner.preFX.setPadding(24);
      banner.preFX.addGlow(0x14f195, 8, 0, false, 0.1, 20);
    }

    this.tweens.add({
      targets: banner,
      alpha: 1,
      scale: { from: 0.5, to: 1.25 },
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          delay: 600,
          duration: 350,
          ease: 'Cubic.easeIn',
          onComplete: () => banner.destroy(),
        });
      },
    });

    const sub = this.add.text(cx, cy + 60, 'BOARD WIPED • RUN CONTINUES', {
      fontFamily: '"VT323"',
      fontSize: '28px',
      color: '#39FF14',
    }).setOrigin(0.5).setDepth(3001).setAlpha(0);
    this.tweens.add({
      targets: sub,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.tweens.add({
          targets: sub,
          alpha: 0,
          delay: 700,
          duration: 300,
          onComplete: () => sub.destroy(),
        });
      },
    });
  }

  clipDiagonalToSquare(x1, y1, x2, y2, lo, hi) {
    let ax = x1, ay = y1, bx = x2, by = y2;
    if (ax < lo) {
      const dy = by - ay;
      const dx = bx - ax;
      ay = ay + (lo - ax) * (dy / dx);
      ax = lo;
    }
    if (bx > hi) {
      const dy = by - ay;
      const dx = bx - ax;
      by = ay + (hi - ax) * (dy / dx);
      bx = hi;
    }
    if (ax > hi || bx < lo) return null;
    return { x1: ax, y1: ay, x2: bx, y2: by };
  }

  updateTrayDimStates() {
    let anyPlayable = false;
    let unplacedCount = 0;
    for (const entry of this.tray) {
      if (entry.placed) continue;
      unplacedCount += 1;
      const playable = hasAnyValidPlacement(this.grid, entry.shape);
      entry.container.setAlpha(playable ? 1 : 0.35);
      if (playable) anyPlayable = true;
    }
    if (!anyPlayable && unplacedCount > 0 && !this.gameOver) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.gameOver = true;
    clearRunSnapshot();
    const finalScore = this.score;
    const rankPromise = submitScore(finalScore);
    this.time.delayedCall(320, () => {
      this.modal?.show({ score: finalScore, high: this.highScore, rankPromise });
    });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#0f0f13',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
  },
  scene: [BoardScene],
};

async function boot() {
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }

  try {
    await document.fonts.load('16px "Press Start 2P"');
    await document.fonts.load('16px "VT323"');
  } catch (err) {
    console.warn('Font preload failed, proceeding with fallbacks', err);
  }

  let musicPlayer = null;
  try {
    musicPlayer = new MusicPlayer();
    musicPlayer.start();

    // WebKit (Telegram iOS WebView) only grants audio "user activation" on
    // touchend / click / mousedown / keydown — NOT touchstart or pointerdown.
    // Keep retrying on every qualifying gesture until one unlock succeeds.
    const unlockEvents = ['click', 'touchend', 'mousedown', 'keydown'];
    const tryUnlock = () => {
      if (musicPlayer.unlocked) { removeUnlockListeners(); return; }
      musicPlayer.tryUnlock().then((ok) => {
        if (ok) removeUnlockListeners();
      });
    };
    const removeUnlockListeners = () => {
      for (const ev of unlockEvents) window.removeEventListener(ev, tryUnlock);
    };
    for (const ev of unlockEvents) window.addEventListener(ev, tryUnlock, { passive: true });
  } catch (err) {
    console.warn('[music] init failed', err);
  }

  const gate = new GateScreen();
  gate.begin();
  await gate.awaitVerified();

  let phaserGame = null;
  let moreSettingsSheet = null;
  let homeSettingsSheet = null;

  const showHome = () => {
    document.getElementById('game-root').style.display = 'none';
    document.getElementById('game-gear').hidden = true;
    home.show();
  };

  const startGame = async () => {
    pendingSnapshot = await loadRunSnapshot();
    document.getElementById('game-root').style.display = '';
    document.getElementById('game-gear').hidden = false;
    if (!phaserGame) {
      phaserGame = new Phaser.Game(config);
    }
  };

  moreSettingsSheet = new SettingsSheet({
    id: 'more-settings',
    player: null,
    actions: {},
  });

  homeSettingsSheet = new SettingsSheet({
    id: 'home-settings',
    player: musicPlayer,
    actions: {
      medals: () => console.info('[home] MEDALS tapped — leaderboard modal ships in Step 6'),
      more: () => moreSettingsSheet.show(),
    },
  });

  const home = new HomeScreen({
    onPlay: startGame,
    onOpenLeaderboard: () => console.info('[home] leaderboard modal ships in Step 6'),
    onOpenSettings: () => homeSettingsSheet.show(),
  });

  showHome();
}

boot();
