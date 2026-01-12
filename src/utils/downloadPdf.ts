/**
 * Cross-platform PDF download utility
 * Handles iOS Safari, iOS Chrome, Android Chrome, and desktop browsers
 *
 * References:
 * - https://github.com/eligrey/FileSaver.js/pull/612 (Chrome iOS FileReader fix)
 * - https://github.com/eligrey/FileSaver.js/issues/686 (Chrome iOS blob issues)
 * - https://copyprogramming.com/howto/how-to-open-blob-url-on-chrome-ios
 */

interface DeviceInfo {
  isIOS: boolean;
  isIPad: boolean;
  isSafari: boolean;
  isRealSafari: boolean;
  isAndroid: boolean;
  isChrome: boolean;
  isChromeIOS: boolean;
  isFirefoxIOS: boolean;
  isGoogleApp: boolean;
  isInAppBrowser: boolean;
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  const isIPad = /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) && 'ontouchstart' in window);
  const isIOS = /iPhone|iPod/i.test(ua) || isIPad;
  const isAndroid = /Android/i.test(ua);

  // Chrome on iOS uses "CriOS", Chrome desktop/Android uses "Chrome"
  // Edge uses "Edg", Firefox uses "FxiOS" on iOS
  const isChromeIOS = /CriOS/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua);
  const isFirefoxIOS = /FxiOS/i.test(ua);
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  
  // Google Search App (GSA) on iOS - has its own in-app browser
  const isGoogleApp = /GSA\//i.test(ua);
  
  // Other in-app browsers on iOS (Facebook, Instagram, Twitter, LinkedIn, etc.)
  // These use WebKit but have their own quirks
  const isFacebookApp = /FBAN|FBAV/i.test(ua);
  const isInstagramApp = /Instagram/i.test(ua);
  const isTwitterApp = /Twitter/i.test(ua);
  const isLinkedInApp = /LinkedInApp/i.test(ua);
  const isInAppBrowser = isGoogleApp || isFacebookApp || isInstagramApp || isTwitterApp || isLinkedInApp;

  // Safari is true only if it says Safari AND is not Chrome/Firefox/Edge
  const isSafari = /Safari/i.test(ua) && !isChrome && !isFirefox && !isEdge;
  
  // "Real" Safari = Safari app, not an in-app browser pretending to be Safari
  const isRealSafari = isSafari && !isInAppBrowser;

  console.log('[downloadPdf] UA:', ua);
  console.log('[downloadPdf] isIOS:', isIOS, 'isAndroid:', isAndroid, 'isSafari:', isSafari, 'isRealSafari:', isRealSafari, 'isChrome:', isChrome, 'isChromeIOS:', isChromeIOS, 'isGoogleApp:', isGoogleApp, 'isInAppBrowser:', isInAppBrowser);

  return { isIOS, isIPad, isSafari, isRealSafari, isAndroid, isChrome, isChromeIOS, isFirefoxIOS, isGoogleApp, isInAppBrowser };
}

/**
 * Download using FileReader -> Data URL approach
 * More reliable on Chrome Android where blob URLs can fail
 */
function downloadViaDataUrl(blob: Blob, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(event) {
      const dataUrl = event.target?.result as string;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      resolve(true);
    };
    reader.onerror = function() {
      console.error('[downloadPdf] FileReader failed');
      resolve(false);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Open PDF in new window using FileReader -> Data URL
 * For browsers that don't support blob URL downloads (Chrome iOS, in-app browsers)
 * User will see the PDF and can use share button to save
 */
function openViaDataUrlInNewWindow(blob: Blob, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = function() {
      const dataUrl = reader.result as string;
      console.log('[downloadPdf] Data URL created, length:', dataUrl.length);
      
      // Try method 1: window.open
      const newWindow = window.open(dataUrl, '_blank');
      if (newWindow) {
        console.log('[downloadPdf] window.open succeeded');
        resolve(true);
        return;
      }
      
      console.log('[downloadPdf] window.open failed/blocked, trying anchor with data URL');
      
      // Try method 2: anchor tag with data URL
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Give it a moment, then try location.href as last resort
      setTimeout(() => {
        console.log('[downloadPdf] Trying location.href as final fallback');
        window.location.href = dataUrl;
      }, 500);
      
      resolve(true);
    };
    reader.onerror = function() {
      console.error('[downloadPdf] FileReader failed');
      resolve(false);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Downloads a PDF blob with platform-specific handling
 * 
 * Strategy by platform:
 * - iOS Real Safari: anchor download with octet-stream (works great)
 * - iOS Chrome (CriOS): FileReader -> Data URL -> window.open (blob URLs broken)
 * - iOS Google App (GSA): FileReader -> Data URL -> window.open (in-app browser)
 * - iOS Firefox (FxiOS): FileReader -> Data URL -> window.open
 * - iOS Other in-app browsers: FileReader -> Data URL -> window.open
 * - Android Chrome: FileReader -> Data URL anchor download
 * - Desktop: standard blob URL download
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
  const { isIOS, isRealSafari, isAndroid, isChrome, isChromeIOS, isFirefoxIOS, isInAppBrowser } = getDeviceInfo();

  // iOS Real Safari: use anchor download with octet-stream (this works perfectly)
  if (isIOS && isRealSafari) {
    console.log('[downloadPdf] iOS Real Safari detected - using octet-stream anchor download');
    if (preOpenedWindow) preOpenedWindow.close();

    // Re-create blob with octet-stream MIME type to force download
    const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
    const downloadUrl = URL.createObjectURL(downloadBlob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.click();

    setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    return true;
  }

  // iOS Chrome (CriOS): Use FileReader -> Data URL -> window.open
  // Chrome iOS does NOT support blob URL downloads - this is a known long-standing issue
  if (isIOS && isChromeIOS) {
    console.log('[downloadPdf] iOS Chrome detected - using FileReader + window.open approach');
    if (preOpenedWindow) preOpenedWindow.close();

    // Keep as PDF type so Chrome iOS renders it properly
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const success = await openViaDataUrlInNewWindow(pdfBlob, filename);
    
    if (!success) {
      // Ultimate fallback: try the anchor method anyway
      console.log('[downloadPdf] Data URL window.open failed, trying anchor fallback');
      const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
      const downloadUrl = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    }
    return true;
  }

  // iOS Firefox (FxiOS): Similar issues to Chrome iOS - use data URL approach
  if (isIOS && isFirefoxIOS) {
    console.log('[downloadPdf] iOS Firefox detected - using FileReader + window.open approach');
    if (preOpenedWindow) preOpenedWindow.close();

    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    await openViaDataUrlInNewWindow(pdfBlob, filename);
    return true;
  }

  // iOS In-App Browsers (Google App, Facebook, Instagram, Twitter, LinkedIn, etc.)
  // KNOWN LIMITATION: WKWebView-based in-app browsers do NOT support blob URL downloads
  // This is a WebKit bug that has existed since 2020: https://bugs.webkit.org/show_bug.cgi?id=216918
  // The only reliable solution is to tell users to open in Safari
  if (isIOS && isInAppBrowser) {
    console.log('[downloadPdf] iOS In-App Browser detected - blob downloads not supported');
    if (preOpenedWindow) preOpenedWindow.close();

    // Show alert with instructions to open in Safari
    // The user needs to long-press the link and choose "Open in Safari"
    // or copy the current URL and paste it in Safari
    const currentUrl = window.location.href;
    
    // Create a user-friendly message
    const message = `PDF downloads don't work in this app's browser.\n\nTo download your PDF:\n1. Tap the ⋮ or share button\n2. Select "Open in Safari"\n\nOr copy this link and paste in Safari:\n${currentUrl}`;
    
    alert(message);
    
    // Also try the blob URL approach as a last-ditch effort
    // It probably won't work, but doesn't hurt to try
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Try opening in a new window
    const newWindow = window.open(pdfUrl, '_blank');
    if (!newWindow) {
      // Try anchor click
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 30000);
    
    return true;
  }

  // iOS other browsers (Edge, unknown browsers): try data URL approach
  if (isIOS) {
    console.log('[downloadPdf] iOS other browser - using FileReader + window.open approach');
    if (preOpenedWindow) preOpenedWindow.close();

    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const success = await openViaDataUrlInNewWindow(pdfBlob, filename);
    
    if (!success) {
      // Fallback to anchor
      const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
      const downloadUrl = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    }
    return true;
  }

  // Android Chrome: use FileReader -> Data URL approach (blob URLs can fail on Android)
  // This triggers Chrome's native "Download" or "Save to Drive" UI
  if (isAndroid && isChrome) {
    console.log('[downloadPdf] Android Chrome detected - using Data URL approach');
    if (preOpenedWindow) preOpenedWindow.close();

    // Use octet-stream to force download behavior
    const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
    const success = await downloadViaDataUrl(downloadBlob, filename);
    if (success) return true;

    // Fallback to standard blob URL if data URL fails
    console.log('[downloadPdf] Data URL failed, falling back to blob URL');
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  }

  // Android non-Chrome: use Data URL approach as well (more reliable on mobile)
  if (isAndroid) {
    console.log('[downloadPdf] Android non-Chrome - using Data URL approach');
    if (preOpenedWindow) preOpenedWindow.close();

    const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
    const success = await downloadViaDataUrl(downloadBlob, filename);
    if (success) return true;

    // Fallback
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  }

  // Desktop: standard download
  console.log('[downloadPdf] Desktop browser - using standard blob URL download');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Pre-opens a window for iOS browsers to avoid popup blocker
 * Currently not needed - both Safari and Chrome use anchor download method
 * Keeping for potential future fallback needs
 * Must be called synchronously from a user gesture (click handler)
 */
export function preOpenWindowForIOS(): Window | null {
  // Both Safari and Chrome iOS now use anchor download - no pre-opened window needed
  return null;
}

export { getDeviceInfo };
