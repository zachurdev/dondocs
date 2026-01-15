import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import type { NavmcForm10274Data } from '@/stores/formStore';

// Conversion: 1mm = 2.834645669 points
const MM_TO_PT = 2.834645669;

// Page dimensions (Letter size)
const PAGE_WIDTH = 612; // 8.5 inches
const PAGE_HEIGHT = 792; // 11 inches

// Content area from XFA: x=9.525mm, y=9.525mm, w=196.85mm, h=257.175mm
const CONTENT_X = 9.525 * MM_TO_PT; // ~27pt
const CONTENT_Y = 9.525 * MM_TO_PT;

// Border thickness from XFA: 0.1753mm = ~0.5pt
const BORDER_WIDTH = 0.5;

// Colors
const BLACK = rgb(0, 0, 0);

/**
 * Convert mm to points, with Y coordinate flipped for PDF (origin at bottom-left)
 */
function mmToX(mm: number): number {
  return CONTENT_X + (mm * MM_TO_PT);
}

function mmToY(mm: number): number {
  // XFA Y is from top, PDF Y is from bottom
  return PAGE_HEIGHT - CONTENT_Y - (mm * MM_TO_PT);
}

function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

/**
 * Draw a box with border
 */
function drawBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: {
    topBorder?: boolean;
    bottomBorder?: boolean;
    leftBorder?: boolean;
    rightBorder?: boolean;
  }
) {
  const { topBorder = true, bottomBorder = true, leftBorder = true, rightBorder = true } = options || {};

  if (topBorder) {
    page.drawLine({
      start: { x, y },
      end: { x: x + width, y },
      thickness: BORDER_WIDTH,
      color: BLACK,
    });
  }
  if (bottomBorder) {
    page.drawLine({
      start: { x, y: y - height },
      end: { x: x + width, y: y - height },
      thickness: BORDER_WIDTH,
      color: BLACK,
    });
  }
  if (leftBorder) {
    page.drawLine({
      start: { x, y },
      end: { x, y: y - height },
      thickness: BORDER_WIDTH,
      color: BLACK,
    });
  }
  if (rightBorder) {
    page.drawLine({
      start: { x: x + width, y },
      end: { x: x + width, y: y - height },
      thickness: BORDER_WIDTH,
      color: BLACK,
    });
  }
}

/**
 * Draw field label (Arial 8pt)
 */
function drawLabel(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number
) {
  page.drawText(text, {
    x: x + 3,
    y: y - 8,
    size: 8,
    font,
    color: BLACK,
  });
}

/**
 * Draw field value with word wrapping (Times New Roman)
 */
function drawValue(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  fontSize: number = 10
): number {
  if (!text) return y;

  const lineHeight = fontSize + 2;
  const lines = wrapText(text, maxWidth - 6, font, fontSize);
  let currentY = y - 11 - lineHeight; // Start below label

  for (const line of lines) {
    if (currentY < y - maxHeight + 4) break;
    page.drawText(line, {
      x: x + 3,
      y: currentY,
      size: fontSize,
      font,
      color: BLACK,
    });
    currentY -= lineHeight;
  }

  return currentY;
}

/**
 * Wrap text to fit within width
 */
function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Generates a pixel-perfect NAVMC 10274 PDF (pages 2-3 of original)
 */
export async function generateNavmc10274Pdf(data: NavmcForm10274Data): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Embed fonts
  const arial = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const arialBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // ==================== PAGE 2 ====================
  const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Outer border for entire form
  const formTop = mmToY(0);
  const formHeight = mmToPt(257.175);
  drawBox(page2, mmToX(0), formTop, mmToPt(196.85), formHeight);

  // ----- Title: "ADMINISTRATIVE ACTION (5216)" -----
  const titleY = mmToY(0);
  const titleHeight = mmToPt(9.948);
  drawBox(page2, mmToX(0), titleY, mmToPt(197.06), titleHeight);

  const titleText = 'ADMINISTRATIVE ACTION (5216)';
  const titleWidth = arialBold.widthOfTextAtSize(titleText, 10);
  page2.drawText(titleText, {
    x: mmToX(0) + (mmToPt(197.06) - titleWidth) / 2,
    y: titleY - titleHeight + 3,
    size: 10,
    font: arialBold,
    color: BLACK,
  });

  // ----- Row: Action No (1), SSIC/File No (2), Date (3) -----
  // These are in the right portion of the form, above FROM

  // Field 1: ACTION NO. - x=133.35mm, y=9.948mm, w=28.575mm, h=9.525mm
  const actionNoX = mmToX(133.35);
  const actionNoY = mmToY(9.948);
  const actionNoW = mmToPt(28.575);
  const actionNoH = mmToPt(9.525);
  drawBox(page2, actionNoX, actionNoY, actionNoW, actionNoH);
  drawLabel(page2, arial, '1.  ACTION NO.', actionNoX, actionNoY);
  if (data.actionNo) {
    page2.drawText(data.actionNo, {
      x: actionNoX + 3,
      y: actionNoY - actionNoH + 3,
      size: 9,
      font: times,
      color: BLACK,
    });
  }

  // Field 2: SSIC/FILE NO. - x=161.925mm, y=9.948mm, w=34.925mm, h=9.525mm
  const ssicX = mmToX(161.925);
  const ssicY = mmToY(9.948);
  const ssicW = mmToPt(34.925);
  const ssicH = mmToPt(9.525);
  drawBox(page2, ssicX, ssicY, ssicW, ssicH, { leftBorder: false });
  drawLabel(page2, arial, '2.  SSIC/FILE NO.', ssicX, ssicY);
  if (data.ssicFileNo) {
    page2.drawText(data.ssicFileNo, {
      x: ssicX + 3,
      y: ssicY - ssicH + 3,
      size: 9,
      font: times,
      color: BLACK,
    });
  }

  // Field 3: DATE - x=133.35mm, y=19.473mm, w=63.5mm, h=9.102mm
  const dateX = mmToX(133.35);
  const dateY = mmToY(19.473);
  const dateW = mmToPt(63.5);
  const dateH = mmToPt(9.102);
  drawBox(page2, dateX, dateY, dateW, dateH, { topBorder: false });
  drawLabel(page2, arial, '3.  DATE', dateX, dateY);
  if (data.date) {
    page2.drawText(data.date, {
      x: dateX + dateW / 2 - times.widthOfTextAtSize(data.date, 9) / 2,
      y: dateY - dateH + 3,
      size: 9,
      font: times,
      color: BLACK,
    });
  }

  // ----- Field 4: FROM - x=0.298mm, y=28.759mm (after date row), w=98.549mm, h=12.7mm -----
  // Actually positioned at y=9.948mm in the left side, extending down
  const fromX = mmToX(0);
  const fromY = mmToY(9.948);
  const fromW = mmToPt(133.35); // Left side up to Action No
  const fromH = mmToPt(18.811); // Down to y=28.759mm
  drawBox(page2, fromX, fromY, fromW, fromH, { rightBorder: false });
  drawLabel(page2, arial, '4.  FROM (Grade, Name, EDIPI, MOS or CO, Pers. O., etc.)', fromX, fromY);
  drawValue(page2, times, data.from, fromX, fromY, fromW, fromH, 9);

  // ----- Field 5: ORGANIZATION AND STATION - x=98.847mm, y=28.575mm, w=98.113mm, h=25.4mm -----
  const orgX = mmToX(98.535);
  const orgY = mmToY(28.575);
  const orgW = mmToPt(98.425);
  const orgH = mmToPt(25.4);
  drawBox(page2, orgX, orgY, orgW, orgH, { leftBorder: false, topBorder: false });
  drawLabel(page2, arial, '5.  ORGANIZATION AND STATION (Complete address)', orgX, orgY);
  drawValue(page2, times, data.orgStation, orgX, orgY, orgW, orgH, 9);

  // ----- Field 6: VIA - x=0.11mm, y=28.575mm, w=98.737mm, h=25.4mm -----
  const viaX = mmToX(0);
  const viaY = mmToY(28.575);
  const viaW = mmToPt(98.535);
  const viaH = mmToPt(25.4);
  drawBox(page2, viaX, viaY, viaW, viaH, { topBorder: false, rightBorder: false });
  drawLabel(page2, arial, '6.  VIA (As required)', viaX, viaY);
  drawValue(page2, times, data.via, viaX, viaY, viaW, viaH, 9);

  // ----- Field 7: TO - The "7. TO:" box with diagonal corners -----
  const toBoxX = mmToX(0);
  const toBoxY = mmToY(53.975);
  const toBoxW = mmToPt(114.3);
  const toBoxH = mmToPt(34.925);

  // Draw "7." and "TO:" labels
  page2.drawText('7.', {
    x: toBoxX + 3,
    y: toBoxY - 10,
    size: 8,
    font: arial,
    color: BLACK,
  });
  page2.drawText('TO:', {
    x: toBoxX + 15,
    y: toBoxY - toBoxH + 14,
    size: 8,
    font: arial,
    color: BLACK,
  });

  // Draw box borders
  drawBox(page2, toBoxX, toBoxY, toBoxW, toBoxH, { rightBorder: false });

  // Draw TO address value
  if (data.to) {
    const toLines = wrapText(data.to, mmToPt(95), times, 10);
    let toTextY = toBoxY - 24;
    for (const line of toLines) {
      if (toTextY < toBoxY - toBoxH + 8) break;
      page2.drawText(line, {
        x: toBoxX + mmToPt(15),
        y: toTextY,
        size: 10,
        font: times,
        color: BLACK,
      });
      toTextY -= 12;
    }
  }

  // ----- Field 8: NATURE OF ACTION - x=114.41mm, y=53.975mm, w=82.55mm, h=19.05mm -----
  const natX = mmToX(114.3);
  const natY = mmToY(53.975);
  const natW = mmToPt(82.55);
  const natH = mmToPt(19.05);
  drawBox(page2, natX, natY, natW, natH, { leftBorder: false });
  drawLabel(page2, arial, '8.  NATURE OF ACTION/SUBJECT', natX, natY);
  drawValue(page2, times, data.natureOfAction, natX, natY, natW, natH, 9);

  // ----- Field 9: COPY TO - x=114.41mm, y=73.025mm, w=82.55mm, h=15.875mm -----
  const copyX = mmToX(114.3);
  const copyY = mmToY(73.025);
  const copyW = mmToPt(82.55);
  const copyH = mmToPt(15.875);
  drawBox(page2, copyX, copyY, copyW, copyH, { leftBorder: false, topBorder: false });
  drawLabel(page2, arial, '9.  COPY TO (As required)', copyX, copyY);
  drawValue(page2, times, data.copyTo, copyX, copyY, copyW, copyH, 9);

  // ----- Field 10: REFERENCE OR AUTHORITY - x=0.11mm, y=88.9mm, w=98.425mm, h=31.75mm -----
  const refX = mmToX(0);
  const refY = mmToY(88.9);
  const refW = mmToPt(98.425);
  const refH = mmToPt(31.75);
  drawBox(page2, refX, refY, refW, refH, { topBorder: false, rightBorder: false });
  drawLabel(page2, arial, '10.  REFERENCE OR AUTHORITY (if applicable)', refX, refY);
  drawValue(page2, times, data.references, refX, refY, refW, refH, 9);

  // ----- Field 11: ENCLOSURES - x=98.535mm, y=88.9mm, w=98.425mm, h=31.75mm -----
  const enclX = mmToX(98.535);
  const enclY = mmToY(88.9);
  const enclW = mmToPt(98.425);
  const enclH = mmToPt(31.75);
  drawBox(page2, enclX, enclY, enclW, enclH, { topBorder: false, leftBorder: false });
  drawLabel(page2, arial, '11.  ENCLOSURES (if any)', enclX, enclY);
  drawValue(page2, times, data.enclosures, enclX, enclY, enclW, enclH, 9);

  // ----- Field 12: SUPPLEMENTAL INFORMATION - y=120.86mm, w=196.96mm, h=129.965mm -----
  const suppX = mmToX(0);
  const suppY = mmToY(120.65);
  const suppW = mmToPt(196.96);
  const suppH = mmToPt(129.965);
  drawBox(page2, suppX, suppY, suppW, suppH, { topBorder: false });
  drawLabel(page2, arial, '12.  SUPPLEMENTAL INFORMATION (Reduce to minimum wording - type name of originator and sign 3 lines below text)', suppX, suppY);
  drawValue(page2, times, data.supplementalInfo, suppX, suppY, suppW, suppH, 10);

  // ----- Label 13: PROCESSING ACTION -----
  const procLabelX = mmToX(0);
  const procLabelY = mmToY(250.825);
  const procLabelW = mmToPt(196.85);
  const procLabelH = mmToPt(6.35);
  drawBox(page2, procLabelX, procLabelY, procLabelW, procLabelH, { topBorder: false });

  const procText = '13.  PROCESSING ACTION.  (Complete processing action in item 12 or on reverse.  Endorse by rubber stamp where practicable.)';
  const procTextWidth = arial.widthOfTextAtSize(procText, 8);
  page2.drawText(procText, {
    x: procLabelX + (procLabelW - procTextWidth) / 2,
    y: procLabelY - procLabelH + 2,
    size: 8,
    font: arial,
    color: BLACK,
  });

  // ==================== PAGE 3 ====================
  const page3 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Outer border
  drawBox(page3, mmToX(0), mmToY(0), mmToPt(196.85), mmToPt(257.175));

  // Title (no border, centered)
  const title3Y = mmToY(0);
  const title3Height = mmToPt(12.7);
  const title3Text = 'ADMINISTRATIVE ACTION (5216)';
  const title3Width = arialBold.widthOfTextAtSize(title3Text, 10);
  page3.drawText(title3Text, {
    x: mmToX(0) + (mmToPt(197.06) - title3Width) / 2,
    y: title3Y - title3Height / 2 - 3,
    size: 10,
    font: arialBold,
    color: BLACK,
  });

  // Processing Action field - y=12.7mm, w=196.85mm, h=244.475mm
  const procActX = mmToX(0);
  const procActY = mmToY(12.7);
  const procActW = mmToPt(196.85);
  const procActH = mmToPt(244.475);
  drawBox(page3, procActX, procActY, procActW, procActH, { topBorder: false });

  // Draw proposed action text
  if (data.proposedAction) {
    const procLines = wrapText(data.proposedAction, procActW - 10, times, 10);
    let procTextY = procActY - 14;
    for (const line of procLines) {
      if (procTextY < procActY - procActH + 10) break;
      page3.drawText(line, {
        x: procActX + 5,
        y: procTextY,
        size: 10,
        font: times,
        color: BLACK,
      });
      procTextY -= 12;
    }
  }

  return pdfDoc.save();
}
