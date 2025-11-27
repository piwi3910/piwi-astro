'use client';

import * as React from 'react';
import { format, setHours, setMinutes } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DateTimePickerProps {
  value?: Date | null;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const DateTimePicker = React.forwardRef<HTMLButtonElement, DateTimePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Pick date and time',
      label,
      description,
      error,
      disabled,
      minDate,
      maxDate,
      className,
    },
    ref
  ) => {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
      value ?? undefined
    );
    const [hours, setHoursValue] = React.useState(
      value ? value.getHours().toString().padStart(2, '0') : '12'
    );
    const [minutes, setMinutesValue] = React.useState(
      value ? value.getMinutes().toString().padStart(2, '0') : '00'
    );

    React.useEffect(() => {
      if (value) {
        setSelectedDate(value);
        setHoursValue(value.getHours().toString().padStart(2, '0'));
        setMinutesValue(value.getMinutes().toString().padStart(2, '0'));
      }
    }, [value]);

    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        const newDate = setMinutes(
          setHours(date, parseInt(hours)),
          parseInt(minutes)
        );
        setSelectedDate(newDate);
        onChange?.(newDate);
      } else {
        setSelectedDate(undefined);
        onChange?.(undefined);
      }
    };

    const handleTimeChange = (newHours: string, newMinutes: string) => {
      setHoursValue(newHours);
      setMinutesValue(newMinutes);
      if (selectedDate) {
        const newDate = setMinutes(
          setHours(selectedDate, parseInt(newHours)),
          parseInt(newMinutes)
        );
        setSelectedDate(newDate);
        onChange?.(newDate);
      }
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-full justify-start text-left font-normal border-input',
                !selectedDate && 'text-muted-foreground',
                error && 'border-destructive',
                className
              )}
              style={{ backgroundColor: 'var(--color-input)' }}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, 'PPP HH:mm')
              ) : (
                <span>{placeholder}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
            />
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) =>
                    handleTimeChange(
                      e.target.value.padStart(2, '0'),
                      minutes
                    )
                  }
                  className="w-14 rounded-md border border-input px-2 py-1 text-center text-sm"
                  style={{ backgroundColor: 'var(--color-input)' }}
                />
                <span className="text-muted-foreground">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) =>
                    handleTimeChange(
                      hours,
                      e.target.value.padStart(2, '0')
                    )
                  }
                  className="w-14 rounded-md border border-input px-2 py-1 text-center text-sm"
                  style={{ backgroundColor: 'var(--color-input)' }}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
DateTimePicker.displayName = 'DateTimePicker';

export { DateTimePicker };
