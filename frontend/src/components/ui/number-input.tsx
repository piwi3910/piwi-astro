'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { Button } from './button';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  description?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  allowDecimal?: boolean;
  hideControls?: boolean;
  onChange?: (value: number | undefined) => void;
  value?: number | '';
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      label,
      description,
      error,
      min,
      max,
      step = 1,
      precision,
      allowDecimal = true,
      hideControls = false,
      onChange,
      value,
      disabled,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === '') {
        onChange?.(undefined);
        return;
      }
      const num = allowDecimal ? parseFloat(val) : parseInt(val, 10);
      if (!isNaN(num)) {
        onChange?.(num);
      }
    };

    const increment = () => {
      const current = typeof value === 'number' ? value : 0;
      const newValue = current + step;
      if (max === undefined || newValue <= max) {
        onChange?.(precision !== undefined ? parseFloat(newValue.toFixed(precision)) : newValue);
      }
    };

    const decrement = () => {
      const current = typeof value === 'number' ? value : 0;
      const newValue = current - step;
      if (min === undefined || newValue >= min) {
        onChange?.(precision !== undefined ? parseFloat(newValue.toFixed(precision)) : newValue);
      }
    };

    const displayValue = value === '' ? '' : value?.toString() ?? '';

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className="relative flex items-center">
          <input
            type="number"
            ref={ref}
            value={displayValue}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm text-foreground',
              'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              !hideControls && 'pr-20',
              error && 'border-destructive',
              className
            )}
            style={{ backgroundColor: 'var(--color-input)' }}
            {...props}
          />
          {!hideControls && (
            <div className="absolute right-1 flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={decrement}
                disabled={disabled || (min !== undefined && typeof value === 'number' && value <= min)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={increment}
                disabled={disabled || (max !== undefined && typeof value === 'number' && value >= max)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
NumberInput.displayName = 'NumberInput';

export { NumberInput };
