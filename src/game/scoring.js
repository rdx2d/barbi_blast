export const PT_PER_PLACED_CELL = 1;
export const PT_PER_CLEARED_CELL = 10;

export const MULTI_LINE_BONUS = Object.freeze({
  2: 30,
  3: 80,
  4: 130,
  5: 200,
});
export const MULTI_LINE_BONUS_CAP = 300;
export const FULL_BOARD_CLEAR_BONUS = 360;

export const IOS_STREAK_WINDOW = 3;
const STREAK_MULTIPLIERS = Object.freeze([1.0, 1.2, 1.5, 2.0, 2.5]);

export function multiplierForStreak(streakCount) {
  if (streakCount <= 0) return STREAK_MULTIPLIERS[0];
  const idx = Math.min(streakCount, STREAK_MULTIPLIERS.length - 1);
  return STREAK_MULTIPLIERS[idx];
}

export function multiLineBonus(linesCleared, fullBoardClear) {
  if (fullBoardClear) return FULL_BOARD_CLEAR_BONUS;
  if (linesCleared <= 1) return 0;
  if (linesCleared >= 6) return MULTI_LINE_BONUS_CAP;
  return MULTI_LINE_BONUS[linesCleared] ?? 0;
}

export function scoreDrop({ cellsPlaced, cellsCleared, linesCleared, fullBoardClear, streakCount }) {
  const placementPoints = cellsPlaced * PT_PER_PLACED_CELL;
  const clearPoints = cellsCleared * PT_PER_CLEARED_CELL;
  const bonus = multiLineBonus(linesCleared, fullBoardClear);
  const multiplier = multiplierForStreak(streakCount);

  const multipliedClearAndBonus = Math.round((clearPoints + bonus) * multiplier);
  return {
    total: placementPoints + multipliedClearAndBonus,
    placementPoints,
    clearPoints,
    bonus,
    multiplier,
  };
}

export function advanceStreak(prevState, linesClearedThisDrop) {
  const state = {
    streakCount: prevState.streakCount,
    placementsSinceLastClear: prevState.placementsSinceLastClear,
  };

  if (linesClearedThisDrop > 0) {
    state.streakCount += 1;
    state.placementsSinceLastClear = 0;
    return { state, broken: false, incremented: true };
  }

  state.placementsSinceLastClear += 1;
  if (state.placementsSinceLastClear >= IOS_STREAK_WINDOW && state.streakCount > 0) {
    state.streakCount = 0;
    return { state, broken: true, incremented: false };
  }
  return { state, broken: false, incremented: false };
}
