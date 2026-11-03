/**
 * Lightweight cross-component cache invalidation.
 *
 * Project ini tidak memakai React Query, sehingga "invalidateQueries" diganti
 * dengan CustomEvent di `window`. Komponen yang memuat data terkait cukup
 * subscribe via `onDataInvalidated` dan memanggil ulang loader-nya.
 */
export type InvalidationKey = 'materials' | 'product_packages';

const EVENT_NAME = 'app:data-invalidated';

export const invalidateData = (keys: InvalidationKey[]): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<InvalidationKey[]>(EVENT_NAME, { detail: keys }));
};

export const onDataInvalidated = (
  keys: InvalidationKey[],
  callback: () => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<InvalidationKey[]>).detail || [];
    if (detail.some((k) => keys.includes(k))) callback();
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};
