import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * When the URL has `?{param}=id` and that id is in `ids`, highlight the row,
 * scroll it into view, then strip the param so refresh doesn't re-flash.
 */
export function useDeepLinkHighlight(
  param: string,
  ids: Array<string | null | undefined> | null | undefined,
): string | null {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramValue = searchParams.get(param);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const handledRef = useRef<string | null>(null);

  const idKey = useMemo(
    () =>
      (ids || [])
        .filter((id): id is string => Boolean(id))
        .map(String)
        .join('\0'),
    [ids],
  );

  const idSet = useMemo(() => {
    const set = new Set<string>();
    if (!idKey) return set;
    for (const id of idKey.split('\0')) set.add(id);
    return set;
  }, [idKey]);

  useEffect(() => {
    if (!paramValue) return;
    if (!idSet.has(paramValue)) return;
    if (handledRef.current === paramValue) return;
    handledRef.current = paramValue;
    setHighlightId(paramValue);

    const next = new URLSearchParams(searchParams);
    next.delete(param);
    setSearchParams(next, { replace: true });

    const scrollTimer = window.setTimeout(() => {
      const el = document.querySelector(
        `[data-hl="${CSS.escape(paramValue)}"]`,
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);

    const clearTimer = window.setTimeout(() => setHighlightId(null), 4000);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [paramValue, idSet, param, searchParams, setSearchParams]);

  return highlightId;
}
