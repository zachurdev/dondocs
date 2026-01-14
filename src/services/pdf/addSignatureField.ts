import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFNumber } from 'pdf-lib';

// Signature field marker names (must match LaTeX \hypertarget names)
const SIGNATURE_MARKER_NAME = 'DIGSIG_FIELD_MARKER';
const SIGNATURE_MARKER_JUNIOR = 'DIGSIG_FIELD_MARKER_JUNIOR';
const SIGNATURE_MARKER_SENIOR = 'DIGSIG_FIELD_MARKER_SENIOR';

/**
 * Signature field configuration
 */
export interface SignatureFieldConfig {
  /** Field name (must be unique in the document) */
  name?: string;
  /** Width of signature field in points */
  width?: number;
  /** Height of signature field in points */
  height?: number;
}

// Default signature field dimensions
const DEFAULT_CONFIG = {
  name: 'Signature1',
  width: 144, // 2 inches
  height: 36, // 0.5 inches
};

// Fallback position if marker not found
// For typical single-page naval letters, signature is usually around 4-5" from bottom
const FALLBACK_POSITION = {
  x: 306, // 72pt margin + 234pt (3.25") = 306pt from page left edge
  y: 350, // ~4.8" from bottom - typical signature block position
};

// Dual signature positions for MOA/MOU
// Junior (LEFT) signs first, Senior (RIGHT) signs last
// Y=280 positions fields ~3.9" from bottom (typical for signature blocks)
const DUAL_SIGNATURE_POSITIONS = {
  junior: {
    x: 72,  // 1" margin from left edge
    y: 280, // ~3.9" from bottom
  },
  senior: {
    x: 396, // ~5.5" from left (positions right-side signature)
    y: 280, // Same height as junior
  },
};

/**
 * Finds a signature field marker in the PDF.
 * The marker is a TextField created by hyperref with the marker name.
 * We search the AcroForm fields for a field with matching name.
 *
 * @param pdfDoc - The PDF document
 * @param markerName - The marker name to search for (default: DIGSIG_FIELD_MARKER)
 * @returns Position info and field reference, or null if not found
 */
function findSignatureMarker(
  pdfDoc: PDFDocument,
  markerName: string = SIGNATURE_MARKER_NAME
): { pageIndex: number; x: number; y: number; fieldRef?: unknown; fieldIndex?: number } | null {
  try {
    const catalog = pdfDoc.catalog;
    const pages = pdfDoc.getPages();

    // Get the AcroForm dictionary
    const acroForm = catalog.lookup(PDFName.of('AcroForm')) as PDFDict | undefined;
    if (!acroForm) {
      console.log('No AcroForm found in PDF');
      return null;
    }

    // Get the Fields array
    const fields = acroForm.lookup(PDFName.of('Fields')) as PDFArray | undefined;
    if (!fields) {
      console.log('No Fields array found in AcroForm');
      return null;
    }

    console.log(`Found ${fields.size()} form fields in PDF`);

    // Search through fields for our marker
    for (let i = 0; i < fields.size(); i++) {
      const fieldRef = fields.get(i);
      const field = fields.lookup(i);

      if (!(field instanceof PDFDict)) {
        continue;
      }

      // Get the field name (T = Title/Name)
      const nameObj = field.lookup(PDFName.of('T'));
      let fieldName: string | null = null;

      if (nameObj instanceof PDFString) {
        fieldName = nameObj.decodeText();
      } else if (nameObj instanceof PDFName) {
        fieldName = nameObj.decodeText();
      }

      console.log(`Field ${i}: name="${fieldName}"`);

      if (fieldName === markerName) {
        // Found our marker! Get the position from Rect
        const rect = field.lookup(PDFName.of('Rect')) as PDFArray | undefined;
        if (!rect || rect.size() < 4) {
          console.log('Field found but no Rect');
          continue;
        }

        // Rect is [x1, y1, x2, y2]
        const x1 = rect.lookup(0);
        const y1 = rect.lookup(1);

        const x = x1 instanceof PDFNumber ? x1.asNumber() : FALLBACK_POSITION.x;
        const y = y1 instanceof PDFNumber ? y1.asNumber() : FALLBACK_POSITION.y;

        // Find which page this field is on
        const pageRef = field.lookup(PDFName.of('P'));
        let pageIndex = 0; // Default to first page
        if (pageRef) {
          for (let p = 0; p < pages.length; p++) {
            if (pages[p].ref === pageRef) {
              pageIndex = p;
              break;
            }
          }
        }

        console.log(`Found marker field '${markerName}' at page ${pageIndex + 1}, x=${x}, y=${y}`);
        return { pageIndex, x, y, fieldRef, fieldIndex: i };
      }
    }

    console.log(`Marker field '${markerName}' not found in AcroForm`);
    return null;
  } catch (error) {
    console.error('Error finding signature marker:', error);
    return null;
  }
}

/**
 * Adds an empty digital signature field to a PDF document.
 *
 * This function looks for a named destination created by LaTeX (\pdfdest name
 * {DIGSIG_FIELD_MARKER} xyz) to determine the exact position for the signature
 * field. If the marker is not found, it falls back to a default position.
 *
 * The signature field is a proper AcroForm widget that can be signed with
 * Adobe Acrobat, CAC/PIV cards, or other PKI tools.
 *
 * @param pdfBytes - The PDF document as a Uint8Array
 * @param config - Optional configuration for the signature field
 * @returns The modified PDF as a Uint8Array
 */
export async function addSignatureField(
  pdfBytes: Uint8Array,
  config: SignatureFieldConfig = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const {
    name = DEFAULT_CONFIG.name,
    width = DEFAULT_CONFIG.width,
    height = DEFAULT_CONFIG.height,
  } = config;

  // Try to find the signature marker TextField from LaTeX
  const markerPosition = findSignatureMarker(pdfDoc);

  let targetPageIndex: number;
  let x: number;
  let y: number;

  // Get or create the AcroForm first (we might need to remove marker field)
  const catalog = pdfDoc.catalog;
  let acroForm = catalog.lookup(PDFName.of('AcroForm')) as PDFDict | undefined;

  if (markerPosition) {
    // Use marker position - TextField gives us y1 (bottom) directly
    targetPageIndex = markerPosition.pageIndex;
    x = markerPosition.x;
    y = markerPosition.y; // y1 is already the bottom of the field
    console.log(`Using marker position: page ${targetPageIndex + 1}, x=${x}, y=${y}`);

    // Remove the marker TextField from the AcroForm fields
    if (acroForm && markerPosition.fieldIndex !== undefined) {
      const fields = acroForm.lookup(PDFName.of('Fields')) as PDFArray | undefined;
      if (fields && markerPosition.fieldIndex < fields.size()) {
        fields.remove(markerPosition.fieldIndex);
        console.log('Removed marker TextField from AcroForm');
      }
    }
  } else {
    // Fallback to last page with default position
    const pages = pdfDoc.getPages();
    targetPageIndex = pages.length - 1;
    x = FALLBACK_POSITION.x;
    y = FALLBACK_POSITION.y;
    console.log(`Using fallback position: page ${targetPageIndex + 1}, x=${x}, y=${y}`);
  }

  const pages = pdfDoc.getPages();
  const page = pages[targetPageIndex];
  const pageRef = page.ref;

  if (!acroForm) {
    acroForm = pdfDoc.context.obj({
      Fields: [],
      SigFlags: 3, // SignaturesExist | AppendOnly
    }) as PDFDict;
    catalog.set(PDFName.of('AcroForm'), acroForm);
  } else {
    // Ensure SigFlags is set
    acroForm.set(PDFName.of('SigFlags'), PDFNumber.of(3));
  }

  // Get or create the Fields array
  let fields = acroForm.lookup(PDFName.of('Fields')) as PDFArray | undefined;
  if (!fields) {
    fields = pdfDoc.context.obj([]) as PDFArray;
    acroForm.set(PDFName.of('Fields'), fields);
  }

  // Create the signature field widget annotation
  const sigField = pdfDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Widget'),
    FT: PDFName.of('Sig'), // Field Type: Signature
    T: PDFString.of(name), // Field name
    Rect: [x, y, x + width, y + height], // Position and size
    F: 4, // Print flag
    P: pageRef, // Parent page reference
    Border: [0, 0, 0], // No visible border
  }) as PDFDict;

  // Create appearance stream for the empty signature field
  const appearanceStream = createEmptySignatureAppearance(pdfDoc, width, height);

  // Set the normal appearance
  const apDict = pdfDoc.context.obj({
    N: appearanceStream,
  }) as PDFDict;
  sigField.set(PDFName.of('AP'), apDict);

  // Add the field to the AcroForm's Fields array
  const sigFieldRef = pdfDoc.context.register(sigField);
  fields.push(sigFieldRef);

  // Add the annotation to the page's Annots array
  let annots = page.node.lookup(PDFName.of('Annots')) as PDFArray | undefined;
  if (!annots) {
    annots = pdfDoc.context.obj([]) as PDFArray;
    page.node.set(PDFName.of('Annots'), annots);
  }
  annots.push(sigFieldRef);

  // Save and return
  return await pdfDoc.save();
}

/**
 * Creates an appearance stream for an empty signature field.
 * Invisible - no border or text, just defines the clickable area.
 */
function createEmptySignatureAppearance(
  pdfDoc: PDFDocument,
  width: number,
  height: number
) {
  // Create an empty/invisible appearance - just the bounding box
  const stream = pdfDoc.context.stream(
    `q Q`, // Empty graphics state - nothing drawn
    {
      Type: PDFName.of('XObject'),
      Subtype: PDFName.of('Form'),
      FormType: 1,
      BBox: [0, 0, width, height],
    }
  );

  return pdfDoc.context.register(stream);
}

/**
 * Adds dual digital signature fields for joint letters, MOA/MOU documents.
 * Junior signs on LEFT (first), Senior signs on RIGHT (last).
 *
 * Looks for DIGSIG_FIELD_MARKER_JUNIOR and DIGSIG_FIELD_MARKER_SENIOR markers
 * placed by LaTeX to determine exact positions. Falls back to hardcoded
 * positions if markers are not found.
 *
 * @param pdfBytes - The PDF document as a Uint8Array
 * @param config - Optional configuration for the signature fields
 * @returns The modified PDF as a Uint8Array
 */
export async function addDualSignatureFields(
  pdfBytes: Uint8Array,
  config: SignatureFieldConfig = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const {
    width = DEFAULT_CONFIG.width,
    height = DEFAULT_CONFIG.height,
  } = config;

  // Get or create the AcroForm first (we need it to find and remove marker fields)
  const catalog = pdfDoc.catalog;
  let acroForm = catalog.lookup(PDFName.of('AcroForm')) as PDFDict | undefined;

  // Try to find the signature markers from LaTeX
  const juniorMarker = findSignatureMarker(pdfDoc, SIGNATURE_MARKER_JUNIOR);
  const seniorMarker = findSignatureMarker(pdfDoc, SIGNATURE_MARKER_SENIOR);

  // Remove marker TextFields from AcroForm (remove higher index first to avoid shifting)
  if (acroForm) {
    const fields = acroForm.lookup(PDFName.of('Fields')) as PDFArray | undefined;
    if (fields) {
      const indicesToRemove: number[] = [];
      if (juniorMarker?.fieldIndex !== undefined) indicesToRemove.push(juniorMarker.fieldIndex);
      if (seniorMarker?.fieldIndex !== undefined) indicesToRemove.push(seniorMarker.fieldIndex);
      // Sort descending so we remove higher indices first
      indicesToRemove.sort((a, b) => b - a);
      for (const idx of indicesToRemove) {
        if (idx < fields.size()) {
          fields.remove(idx);
          console.log(`Removed marker TextField at index ${idx}`);
        }
      }
    }
  }

  // Determine positions - use markers if found, otherwise fall back to hardcoded
  let juniorPageIndex: number;
  let juniorX: number;
  let juniorY: number;

  if (juniorMarker) {
    juniorPageIndex = juniorMarker.pageIndex;
    juniorX = juniorMarker.x;
    // TextField gives us y1 (bottom) directly
    juniorY = juniorMarker.y;
    console.log(`Found junior marker: page ${juniorPageIndex + 1}, x=${juniorX}, y=${juniorY}`);
  } else {
    const pages = pdfDoc.getPages();
    juniorPageIndex = pages.length - 1;
    juniorX = DUAL_SIGNATURE_POSITIONS.junior.x;
    juniorY = DUAL_SIGNATURE_POSITIONS.junior.y;
    console.log(`Junior marker not found, using fallback: page ${juniorPageIndex + 1}, x=${juniorX}, y=${juniorY}`);
  }

  let seniorPageIndex: number;
  let seniorX: number;
  let seniorY: number;

  if (seniorMarker) {
    seniorPageIndex = seniorMarker.pageIndex;
    seniorX = seniorMarker.x;
    // TextField gives us y1 (bottom) directly
    seniorY = seniorMarker.y;
    console.log(`Found senior marker: page ${seniorPageIndex + 1}, x=${seniorX}, y=${seniorY}`);
  } else {
    const pages = pdfDoc.getPages();
    seniorPageIndex = pages.length - 1;
    seniorX = DUAL_SIGNATURE_POSITIONS.senior.x;
    seniorY = DUAL_SIGNATURE_POSITIONS.senior.y;
    console.log(`Senior marker not found, using fallback: page ${seniorPageIndex + 1}, x=${seniorX}, y=${seniorY}`);
  }

  const pages = pdfDoc.getPages();

  if (!acroForm) {
    acroForm = pdfDoc.context.obj({
      Fields: [],
      SigFlags: 3, // SignaturesExist | AppendOnly
    }) as PDFDict;
    catalog.set(PDFName.of('AcroForm'), acroForm);
  } else {
    acroForm.set(PDFName.of('SigFlags'), PDFNumber.of(3));
  }

  // Get or create the Fields array
  let fields = acroForm.lookup(PDFName.of('Fields')) as PDFArray | undefined;
  if (!fields) {
    fields = pdfDoc.context.obj([]) as PDFArray;
    acroForm.set(PDFName.of('Fields'), fields);
  }

  // Create Junior signature field (LEFT - signs FIRST)
  const juniorPage = pages[juniorPageIndex];
  const juniorPageRef = juniorPage.ref;

  let juniorAnnots = juniorPage.node.lookup(PDFName.of('Annots')) as PDFArray | undefined;
  if (!juniorAnnots) {
    juniorAnnots = pdfDoc.context.obj([]) as PDFArray;
    juniorPage.node.set(PDFName.of('Annots'), juniorAnnots);
  }

  const juniorField = pdfDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Widget'),
    FT: PDFName.of('Sig'),
    T: PDFString.of('JuniorSignature'),
    Rect: [juniorX, juniorY, juniorX + width, juniorY + height],
    F: 4,
    P: juniorPageRef,
    Border: [0, 0, 0],
  }) as PDFDict;

  const juniorAppearance = createEmptySignatureAppearance(pdfDoc, width, height);
  juniorField.set(PDFName.of('AP'), pdfDoc.context.obj({ N: juniorAppearance }) as PDFDict);

  const juniorFieldRef = pdfDoc.context.register(juniorField);
  fields.push(juniorFieldRef);
  juniorAnnots.push(juniorFieldRef);

  // Create Senior signature field (RIGHT - signs LAST)
  const seniorPage = pages[seniorPageIndex];
  const seniorPageRef = seniorPage.ref;

  let seniorAnnots = seniorPage.node.lookup(PDFName.of('Annots')) as PDFArray | undefined;
  if (!seniorAnnots) {
    seniorAnnots = pdfDoc.context.obj([]) as PDFArray;
    seniorPage.node.set(PDFName.of('Annots'), seniorAnnots);
  }

  const seniorField = pdfDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Widget'),
    FT: PDFName.of('Sig'),
    T: PDFString.of('SeniorSignature'),
    Rect: [seniorX, seniorY, seniorX + width, seniorY + height],
    F: 4,
    P: seniorPageRef,
    Border: [0, 0, 0],
  }) as PDFDict;

  const seniorAppearance = createEmptySignatureAppearance(pdfDoc, width, height);
  seniorField.set(PDFName.of('AP'), pdfDoc.context.obj({ N: seniorAppearance }) as PDFDict);

  const seniorFieldRef = pdfDoc.context.register(seniorField);
  fields.push(seniorFieldRef);
  seniorAnnots.push(seniorFieldRef);

  console.log(`Added dual signature fields:`);
  console.log(`  Junior: page ${juniorPageIndex + 1}, x=${juniorX}, y=${juniorY}`);
  console.log(`  Senior: page ${seniorPageIndex + 1}, x=${seniorX}, y=${seniorY}`);

  return await pdfDoc.save();
}
