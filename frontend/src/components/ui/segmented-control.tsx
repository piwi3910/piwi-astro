'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedControlItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  data: (string | SegmentedControlItem)[];
  value?: string;
  onChange?: (value: string) => void;
  fullWidth?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(
  ({ data, value, onChange, fullWidth = false, size = 'md', className }, ref) => {
    const normalizedData: SegmentedControlItem[] = data.map((item) =>
      typeof item === 'string' ? { value: item, label: item } : item
    );

    const sizeClasses = {
      xs: 'h-7 text-xs px-2',
      sm: 'h-8 text-sm px-3',
      md: 'h-9 text-sm px-4',
      lg: 'h-10 text-base px-5',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex rounded-md bg-muted p-1',
          fullWidth && 'w-full',
          className
        )}
      >
        {normalizedData.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={item.disabled}
            onClick={() => onChange?.(item.value)}
            className={cn(
              'inline-flex items-center justify-center rounded-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              sizeClasses[size],
              fullWidth && 'flex-1',
              value === item.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }
);
SegmentedControl.displayName = 'SegmentedControl';

export { SegmentedControl };
