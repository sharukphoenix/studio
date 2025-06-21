import 'diff';

declare module 'diff' {
  interface MergeOkHunk {
    ok: string[];
    conflict?: undefined;
    mine?: undefined;
    theirs?: undefined;
  }
  interface MergeConflictHunk {
    ok?: undefined;
    conflict: true;
    mine: string[];
    theirs: string[];
  }

  type MergeHunk = MergeOkHunk | MergeConflictHunk;

  export function merge(mine: string, theirs: string, base: string): MergeHunk[];
}
