/**
 * Open documents in a new tab after async signed-URL fetch.
 *
 * Do NOT pass `noopener` on the placeholder window.open — browsers return null
 * while still opening about:blank, so location.href can never be set (blank tab).
 */

export function openPlaceholderDocumentTab() {
  if (typeof window === 'undefined' || !window.open) {
    return null;
  }
  return window.open('about:blank', '_blank');
}

export function navigateDocumentTab(tab, url) {
  if (!url || !tab || tab.closed) {
    return false;
  }
  tab.location.href = url;
  try {
    tab.opener = null;
  } catch {
    // ignore cross-origin restrictions before navigation completes
  }
  return true;
}

/** Fallback when popup reference was lost or blocked after async work. */
export function openUrlViaAnchorClick(url) {
  if (typeof document === 'undefined' || !url) {
    return false;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  return true;
}
