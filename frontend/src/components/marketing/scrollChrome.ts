/** Fraction of document scrolled (0–1). */
export function getScrollProgress(
  scrollTop = window.scrollY || document.documentElement.scrollTop,
  scrollHeight = document.documentElement.scrollHeight,
  viewportHeight = window.innerHeight,
): number {
  const docHeight = scrollHeight - viewportHeight;
  if (docHeight <= 0) return 0;
  return Math.min(1, Math.max(0, scrollTop / docHeight));
}

/** Routes that show scroll progress and back-to-top. */
export const SCROLL_CHROME_ROUTES = new Set(['/']);

export function isScrollChromeRoute(pathname: string): boolean {
  return SCROLL_CHROME_ROUTES.has(pathname);
}

/** Viewport fraction scrolled before back-to-top appears. */
export const BACK_TO_TOP_VIEWPORT_RATIO = 0.45;

export function getBackToTopThreshold(viewportHeight = window.innerHeight): number {
  return Math.round(viewportHeight * BACK_TO_TOP_VIEWPORT_RATIO);
}

export function shouldShowBackToTop(
  scrollTop = window.scrollY || document.documentElement.scrollTop,
  viewportHeight = window.innerHeight,
): boolean {
  return scrollTop >= getBackToTopThreshold(viewportHeight);
}
