'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface AutocompleteProps {
  data: string[] | { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  onOptionSubmit?: (value: string) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  leftSection?: React.ReactNode;
}

const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(
  (
    {
      data,
      value,
      onChange,
      onOptionSubmit,
      placeholder,
      label,
      description,
      error,
      disabled,
      className,
      leftSection,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value ?? '');

    const normalizedData = data.map((item) =>
      typeof item === 'string' ? { value: item, label: item } : item
    );

    const filteredData = normalizedData.filter((item) =>
      item.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    React.useEffect(() => {
      setInputValue(value ?? '');
    }, [value]);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              {leftSection && (
                <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
                  {leftSection}
                </div>
              )}
              <input
                ref={ref}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  onChange?.(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm text-foreground',
                  'ring-offset-background placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  leftSection && 'pl-10',
                  error && 'border-destructive',
                  className
                )}
                style={{ backgroundColor: 'var(--color-input)' }}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {filteredData.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      onSelect={() => {
                        setInputValue(item.label);
                        onChange?.(item.value);
                        onOptionSubmit?.(item.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          inputValue === item.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
Autocomplete.displayName = 'Autocomplete';

export { Autocomplete };
