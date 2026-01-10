/**
 * Cross-platform PDF download utility
 * Handles iOS Safari, iOS Chrome, and desktop browsers
 */

interface DeviceInfo {
  isIOS: boolean;
  isIPad: boolean;
  isSafari: boolean;
}

function getDeviceInfo(): DeviceInfo {
  const isIPad = /iPad/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && 'ontouchstart' in window);
  const isIOS = /iPhone|iPod/i.test(navigator.userAgent) || isIPad;
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS/i.test(navigator.userAgent);

  return { isIOS, isIPad, isSafari };
}

/**
 * Downloads a PDF blob with platform-specific handling
 * For iOS Safari: opens instructions page, then PDF on button click
 * For iOS Chrome: opens PDF directly (Chrome has native download UI)
 * For Desktop: triggers standard download
 *
 * @param blob - The PDF blob to download
 * @param filename - The filename for the download (default: 'correspondence.pdf')
 * @param preOpenedWindow - Optional pre-opened window (for Safari popup blocker workaround)
 */
export async function downloadPdfBlob(
  blob: Blob,
  filename: string = 'correspondence.pdf',
  preOpenedWindow?: Window | null
): Promise<boolean> {
  const { isIOS, isSafari } = getDeviceInfo();
  const file = new File([blob], filename, { type: 'application/pdf' });

  // Try Web Share API first (best for iOS - shows native share sheet)
  if (isIOS && navigator.share && navigator.canShare) {
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        if (preOpenedWindow) preOpenedWindow.close();
        return true;
      } catch (shareErr) {
        if ((shareErr as Error).name === 'AbortError') {
          if (preOpenedWindow) preOpenedWindow.close();
          return true;
        }
        console.log('Share API failed, using fallback:', shareErr);
      }
    }
  }

  // iOS Safari: show instructions page, then navigate to PDF on button click
  if (isIOS && isSafari && preOpenedWindow) {
    const pdfBlobUrl = URL.createObjectURL(blob);
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Save PDF</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      height: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex; align-items: center; justify-content: center; padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .card {
      background: #fff; border-radius: 20px; padding: 32px 24px;
      max-width: 340px; width: 100%; text-align: center;
      box-shadow: 0 25px 80px rgba(0,0,0,0.4);
    }
    .icon { font-size: 56px; margin-bottom: 20px; }
    h1 { font-size: 22px; margin-bottom: 8px; color: #1a1a1a; font-weight: 700; }
    .subtitle { font-size: 14px; color: #666; margin-bottom: 24px; }
    .steps { text-align: left; margin-bottom: 28px; }
    .step { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
    .step-num {
      width: 28px; height: 28px; background: #007AFF; color: white;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 600; flex-shrink: 0;
    }
    .step-text { font-size: 15px; color: #333; line-height: 1.4; padding-top: 3px; }
    .step-text strong { color: #007AFF; }
    button {
      width: 100%; padding: 16px; background: #007AFF; color: white;
      border: none; border-radius: 12px; font-size: 17px; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    button:active { background: #0056b3; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📄</div>
    <h1>Ready to Save</h1>
    <p class="subtitle">After viewing the PDF, save it using these steps:</p>
    <div class="steps">
      <div class="step">
        <span class="step-num">1</span>
        <span class="step-text">Tap the <strong>Share button</strong> (↑) in the toolbar</span>
      </div>
      <div class="step">
        <span class="step-num">2</span>
        <span class="step-text">Select <strong>"Save to Files"</strong> or <strong>"Save PDF"</strong></span>
      </div>
    </div>
    <button onclick="window.location.href='${pdfBlobUrl}'">View PDF</button>
  </div>
</body>
</html>`;
    preOpenedWindow.document.open();
    preOpenedWindow.document.write(htmlContent);
    preOpenedWindow.document.close();
    return true;
  }

  // iOS Chrome: open PDF directly, Chrome shows native download UI
  if (isIOS && !isSafari) {
    const pdfBlobUrl = URL.createObjectURL(blob);
    if (preOpenedWindow) {
      preOpenedWindow.location.href = pdfBlobUrl;
    } else {
      window.open(pdfBlobUrl, '_blank');
    }
    return true;
  }

  // Desktop: standard download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Pre-opens a window for iOS to avoid popup blocker
 * Must be called synchronously from a user gesture (click handler)
 */
export function preOpenWindowForIOS(): Window | null {
  const { isIOS } = getDeviceInfo();
  if (isIOS) {
    return window.open('about:blank', '_blank');
  }
  return null;
}

export { getDeviceInfo };
