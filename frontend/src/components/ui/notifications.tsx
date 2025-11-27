'use client';

import { toast } from 'sonner';

export const notifications = {
  show: ({
    title,
    message,
    color,
    autoClose,
  }: {
    title?: string;
    message?: string;
    color?: 'green' | 'red' | 'blue' | 'yellow' | string;
    autoClose?: number | boolean;
  }) => {
    const duration = autoClose === false ? Infinity : typeof autoClose === 'number' ? autoClose : 4000;

    if (color === 'red') {
      toast.error(title, { description: message, duration });
    } else if (color === 'green') {
      toast.success(title, { description: message, duration });
    } else if (color === 'yellow') {
      toast.warning(title, { description: message, duration });
    } else {
      toast(title, { description: message, duration });
    }
  },
  success: (title: string, message?: string) => {
    toast.success(title, { description: message });
  },
  error: (title: string, message?: string) => {
    toast.error(title, { description: message });
  },
  warning: (title: string, message?: string) => {
    toast.warning(title, { description: message });
  },
  info: (title: string, message?: string) => {
    toast.info(title, { description: message });
  },
};

export { toast };
