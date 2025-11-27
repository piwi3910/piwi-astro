import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: React.ReactNode;
  labelPosition?: 'left' | 'center' | 'right';
  my?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  (
    {
      className,
      orientation = 'horizontal',
      label,
      labelPosition = 'center',
      my = 'md',
      ...props
    },
    ref
  ) => {
    const marginClasses = {
      xs: 'my-1',
      sm: 'my-2',
      md: 'my-4',
      lg: 'my-6',
      xl: 'my-8',
    };

    if (orientation === 'vertical') {
      return (
        <div
          ref={ref}
          className={cn('h-full w-px bg-border', className)}
          {...props}
        />
      );
    }

    if (label) {
      const labelPositionClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
      };

      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center',
            marginClasses[my],
            labelPositionClasses[labelPosition],
            className
          )}
          {...props}
        >
          {labelPosition !== 'left' && (
            <div className={cn('h-px flex-1 bg-border', labelPosition === 'center' && 'mr-4')} />
          )}
          <span className="text-sm text-muted-foreground">{label}</span>
          {labelPosition !== 'right' && (
            <div className={cn('h-px flex-1 bg-border', labelPosition === 'center' && 'ml-4')} />
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('h-px w-full bg-border', marginClasses[my], className)}
        {...props}
      />
    );
  }
);
Divider.displayName = 'Divider';

export { Divider };
