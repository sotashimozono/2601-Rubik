const parseMoves = (input: string) => {
  const regex = /([ULFRBD])(\+\+|[\+\-])/g;
  return [...input.matchAll(regex)].map(m => ({
    side: m[1], // 'U', 'R' など
    op: m[2]    // '+', '-', '++'
  }));
};

const PERMUTATIONS = {
  U: [3, 5, 8, 4, 7, 1, 2, 6, ...], // GAPの(1,3,8,6)...に対応
  // 他の面も同様に定義
};

const applyMove = (currentState: number[], move: {side: string, op: string}) => {
  const p = PERMUTATIONS[move.side];
  if (move.op === '+') return permute(currentState, p);
  if (move.op === '-') return permute(currentState, inverse(p));
  if (move.op === '++') return permute(permute(currentState, p), p);
};