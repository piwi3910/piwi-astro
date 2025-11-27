'use client';

import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(
  value: T,
  wait: number,
  options?: { leading?: boolean }
): [T, () => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [cancelTimeout, setCancelTimeout] = useState<() => void>(() => () => {});

  useEffect(() => {
    if (options?.leading && debouncedValue !== value) {
      setDebouncedValue(value);
    }

    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, wait);

    const cancel = () => {
      clearTimeout(timeoutId);
    };

    setCancelTimeout(() => cancel);

    return cancel;
  }, [value, wait, options?.leading]);

  return [debouncedValue, cancelTimeout];
}
