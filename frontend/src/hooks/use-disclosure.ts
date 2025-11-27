'use client';

import { useState, useCallback } from 'react';

export function useDisclosure(
  initialState = false,
  callbacks?: {
    onOpen?: () => void;
    onClose?: () => void;
  }
): [boolean, { open: () => void; close: () => void; toggle: () => void }] {
  const [opened, setOpened] = useState(initialState);

  const open = useCallback(() => {
    setOpened(true);
    callbacks?.onOpen?.();
  }, [callbacks]);

  const close = useCallback(() => {
    setOpened(false);
    callbacks?.onClose?.();
  }, [callbacks]);

  const toggle = useCallback(() => {
    if (opened) {
      close();
    } else {
      open();
    }
  }, [opened, open, close]);

  return [opened, { open, close, toggle }];
}
