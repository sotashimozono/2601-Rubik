// src/types.ts
export type Side = 'U' | 'L' | 'F' | 'R' | 'B' | 'D';
export type Dir = '+' | '-' | '++';

export interface CubeOp {
  side: Side;
  dir: Dir;
}

export interface SolveData {
  scramble: string;
  solution: string;
  // permutations?: Record<Side, number[]>; // 後述：これがあると最強です
}