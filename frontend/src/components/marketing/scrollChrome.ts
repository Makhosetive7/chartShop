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

/** Pixels scrolled before the back-to-top control appears. */
export const BACK_TO_TOP_THRESHOLD = 480;

export function shouldShowBackToTop(
  scrollTop = window.scrollY || document.documentElement.scrollTop,
  threshold = BACK_TO_TOP_THRESHOLD,
): boolean {
  return scrollTop >= threshold;
}
