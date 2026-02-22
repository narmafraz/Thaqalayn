import { Injectable } from '@angular/core';

export interface ShareCardData {
  arabicText: string;
  translationText: string;
  reference: string;
  bookTitle?: string;
  grading?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShareCardService {

  private static readonly WIDTH = 1200;
  private static readonly PADDING = 60;
  private static readonly BG_COLOR = '#1a1f36';
  private static readonly TEXT_COLOR = '#e8e6e3';
  private static readonly ACCENT_COLOR = '#7b8cde';
  private static readonly ARABIC_FONT = '"Scheherazade New", "Traditional Arabic", serif';
  private static readonly LATIN_FONT = '"Georgia", "Times New Roman", serif';

  async generateCardBlob(data: ShareCardData): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const W = ShareCardService.WIDTH;
    const P = ShareCardService.PADDING;
    const contentW = W - P * 2;

    // Pre-calculate heights
    ctx.canvas.width = W;
    ctx.canvas.height = 2000; // temporary large height

    const arabicLines = this.wrapText(ctx, data.arabicText, contentW, `28px ${ShareCardService.ARABIC_FONT}`);
    const transLines = this.wrapText(ctx, data.translationText, contentW, `20px ${ShareCardService.LATIN_FONT}`);

    const arabicH = arabicLines.length * 48;
    const transH = transLines.length * 32;
    const refH = 30;
    const headerH = 20;
    const dividerH = 40;
    const footerH = 50;

    const totalH = P + headerH + 20 + arabicH + dividerH + transH + dividerH + refH + 20 + footerH + P;
    canvas.height = totalH;

    // Background
    ctx.fillStyle = ShareCardService.BG_COLOR;
    ctx.fillRect(0, 0, W, totalH);

    // Decorative top line
    ctx.fillStyle = ShareCardService.ACCENT_COLOR;
    ctx.fillRect(0, 0, W, 4);

    let y = P;

    // Book title / header
    if (data.bookTitle) {
      ctx.font = `14px ${ShareCardService.LATIN_FONT}`;
      ctx.fillStyle = ShareCardService.ACCENT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText(data.bookTitle.toUpperCase(), W / 2, y + 14);
      y += headerH + 20;
    }

    // Arabic text (right-to-left)
    ctx.font = `28px ${ShareCardService.ARABIC_FONT}`;
    ctx.fillStyle = ShareCardService.TEXT_COLOR;
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    for (const line of arabicLines) {
      y += 44;
      ctx.fillText(line, W - P, y);
    }

    // Divider
    y += 20;
    ctx.strokeStyle = ShareCardService.ACCENT_COLOR + '60';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(P + contentW * 0.3, y);
    ctx.lineTo(P + contentW * 0.7, y);
    ctx.stroke();
    y += 20;

    // Translation text (left-to-right)
    ctx.font = `20px ${ShareCardService.LATIN_FONT}`;
    ctx.fillStyle = ShareCardService.TEXT_COLOR + 'cc';
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    for (const line of transLines) {
      y += 30;
      ctx.fillText(line, P, y);
    }

    // Divider
    y += 20;
    ctx.strokeStyle = ShareCardService.ACCENT_COLOR + '40';
    ctx.beginPath();
    ctx.moveTo(P, y);
    ctx.lineTo(W - P, y);
    ctx.stroke();
    y += 20;

    // Reference + grading
    ctx.font = `14px ${ShareCardService.LATIN_FONT}`;
    ctx.fillStyle = ShareCardService.ACCENT_COLOR;
    ctx.textAlign = 'left';
    let refText = data.reference;
    if (data.grading) {
      refText += `  |  ${data.grading}`;
    }
    ctx.fillText(refText, P, y + 14);

    // Footer: branding
    y = totalH - P;
    ctx.font = `12px ${ShareCardService.LATIN_FONT}`;
    ctx.fillStyle = ShareCardService.TEXT_COLOR + '80';
    ctx.textAlign = 'center';
    ctx.fillText('thaqalayn.netlify.app', W / 2, y);

    // Bottom decorative line
    ctx.fillStyle = ShareCardService.ACCENT_COLOR;
    ctx.fillRect(0, totalH - 4, W, 4);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image'));
      }, 'image/png');
    });
  }

  async shareAsImage(data: ShareCardData): Promise<void> {
    const blob = await this.generateCardBlob(data);
    const file = new File([blob], 'verse-card.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: data.reference,
        files: [file],
      });
    } else {
      // Fallback: download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'verse-card.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string): string[] {
    ctx.font = font;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }
}
