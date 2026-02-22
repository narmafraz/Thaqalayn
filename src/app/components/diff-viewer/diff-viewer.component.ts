import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TextDiff, DiffSegment } from '@app/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-diff-viewer',
  templateUrl: './diff-viewer.component.html',
  styleUrls: ['./diff-viewer.component.scss'],
  standalone: false
})
export class DiffViewerComponent {
  @Input() diffs: TextDiff[] = [];
  @Input() collapsed = true;

  toggle(): void {
    this.collapsed = !this.collapsed;
  }

  /**
   * Compute diff segments client-side when the data only provides
   * source texts but no pre-computed segments.
   */
  static computeDiff(textA: string, textB: string): DiffSegment[] {
    if (textA === textB) {
      return [{ type: 'equal', text: textA }];
    }

    // Use a simple LCS-based character diff for Arabic text comparison
    const segments: DiffSegment[] = [];
    const lcs = DiffViewerComponent.longestCommonSubsequence(textA, textB);

    let iA = 0;
    let iB = 0;

    for (const [posA, posB] of lcs) {
      // Characters before this match
      if (iA < posA || iB < posB) {
        const deletedText = textA.substring(iA, posA);
        const insertedText = textB.substring(iB, posB);
        if (deletedText && insertedText) {
          segments.push({ type: 'replace', text_a: deletedText, text_b: insertedText });
        } else if (deletedText) {
          segments.push({ type: 'delete', text_a: deletedText });
        } else if (insertedText) {
          segments.push({ type: 'insert', text_b: insertedText });
        }
      }
      // The matching character
      const lastSeg = segments[segments.length - 1];
      if (lastSeg && lastSeg.type === 'equal') {
        lastSeg.text += textA[posA];
      } else {
        segments.push({ type: 'equal', text: textA[posA] });
      }
      iA = posA + 1;
      iB = posB + 1;
    }

    // Remaining characters after last LCS match
    if (iA < textA.length || iB < textB.length) {
      const deletedText = textA.substring(iA);
      const insertedText = textB.substring(iB);
      if (deletedText && insertedText) {
        segments.push({ type: 'replace', text_a: deletedText, text_b: insertedText });
      } else if (deletedText) {
        segments.push({ type: 'delete', text_a: deletedText });
      } else if (insertedText) {
        segments.push({ type: 'insert', text_b: insertedText });
      }
    }

    return segments;
  }

  /**
   * Returns an array of [indexInA, indexInB] pairs representing the LCS.
   * Uses a simple DP approach suitable for typical verse-length texts.
   */
  private static longestCommonSubsequence(a: string, b: string): [number, number][] {
    const m = a.length;
    const n = b.length;

    // For very long texts, fall back to a simpler word-level comparison
    if (m > 2000 || n > 2000) {
      return DiffViewerComponent.wordLevelLCS(a, b);
    }

    // Standard DP LCS
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find the actual subsequence positions
    const result: [number, number][] = [];
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.push([i - 1, j - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return result.reverse();
  }

  /**
   * Word-level LCS for very long texts (avoids O(n*m) memory for large strings).
   * Splits on whitespace, computes word-level LCS, then maps back to character positions.
   */
  private static wordLevelLCS(a: string, b: string): [number, number][] {
    const wordsA = a.split(/(\s+)/);
    const wordsB = b.split(/(\s+)/);
    const wm = wordsA.length;
    const wn = wordsB.length;

    const dp: number[][] = Array.from({ length: wm + 1 }, () => new Array(wn + 1).fill(0));
    for (let i = 1; i <= wm; i++) {
      for (let j = 1; j <= wn; j++) {
        if (wordsA[i - 1] === wordsB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const wordPairs: [number, number][] = [];
    let wi = wm;
    let wj = wn;
    while (wi > 0 && wj > 0) {
      if (wordsA[wi - 1] === wordsB[wj - 1]) {
        wordPairs.push([wi - 1, wj - 1]);
        wi--;
        wj--;
      } else if (dp[wi - 1][wj] > dp[wi][wj - 1]) {
        wi--;
      } else {
        wj--;
      }
    }
    wordPairs.reverse();

    // Map word indices back to character positions
    const result: [number, number][] = [];
    const posA = DiffViewerComponent.wordPositions(wordsA);
    const posB = DiffViewerComponent.wordPositions(wordsB);

    for (const [wai, wbi] of wordPairs) {
      const word = wordsA[wai];
      const startA = posA[wai];
      const startB = posB[wbi];
      for (let c = 0; c < word.length; c++) {
        result.push([startA + c, startB + c]);
      }
    }

    return result;
  }

  private static wordPositions(words: string[]): number[] {
    const positions: number[] = [];
    let pos = 0;
    for (const w of words) {
      positions.push(pos);
      pos += w.length;
    }
    return positions;
  }
}
