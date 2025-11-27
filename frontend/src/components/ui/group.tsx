import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GroupProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean | 'wrap' | 'nowrap';
  grow?: boolean;
}

const Group = React.forwardRef<HTMLDivElement, GroupProps>(
  ({ className, gap = 'md', align = 'center', justify = 'start', wrap = false, grow = false, ...props }, ref) => {
    const gapClasses = {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    };

    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-row',
          gapClasses[gap],
          alignClasses[align],
          justifyClasses[justify],
          (wrap === true || wrap === 'wrap') && 'flex-wrap',
          wrap === 'nowrap' && 'flex-nowrap',
          grow && '[&>*]:flex-1',
          className
        )}
        {...props}
      />
    );
  }
);
Group.displayName = 'Group';

export { Group };
