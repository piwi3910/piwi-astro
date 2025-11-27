import * as React from 'react';
import { cn } from '@/lib/utils';

type ColsValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 12;

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: ColsValue | { base?: ColsValue; sm?: ColsValue; md?: ColsValue; lg?: ColsValue; xl?: ColsValue };
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gutter?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 12, gap, gutter = 'md', ...props }, ref) => {
    const colsClasses: Record<ColsValue, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      7: 'grid-cols-7',
      12: 'grid-cols-12',
    };

    const gapClasses = {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    const effectiveGap = gap ?? gutter;

    // Responsive cols class maps - must be static for Tailwind JIT
    const smColsClasses: Record<ColsValue, string> = {
      1: 'sm:grid-cols-1',
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-4',
      5: 'sm:grid-cols-5',
      6: 'sm:grid-cols-6',
      7: 'sm:grid-cols-7',
      12: 'sm:grid-cols-12',
    };

    const mdColsClasses: Record<ColsValue, string> = {
      1: 'md:grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
      5: 'md:grid-cols-5',
      6: 'md:grid-cols-6',
      7: 'md:grid-cols-7',
      12: 'md:grid-cols-12',
    };

    const lgColsClasses: Record<ColsValue, string> = {
      1: 'lg:grid-cols-1',
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
      7: 'lg:grid-cols-7',
      12: 'lg:grid-cols-12',
    };

    const xlColsClasses: Record<ColsValue, string> = {
      1: 'xl:grid-cols-1',
      2: 'xl:grid-cols-2',
      3: 'xl:grid-cols-3',
      4: 'xl:grid-cols-4',
      5: 'xl:grid-cols-5',
      6: 'xl:grid-cols-6',
      7: 'xl:grid-cols-7',
      12: 'xl:grid-cols-12',
    };

    // Handle responsive cols
    let colsClassName = '';
    if (typeof cols === 'object') {
      const baseCols = cols.base ?? 12;
      colsClassName = colsClasses[baseCols];

      if (cols.sm) colsClassName += ` ${smColsClasses[cols.sm]}`;
      if (cols.md) colsClassName += ` ${mdColsClasses[cols.md]}`;
      if (cols.lg) colsClassName += ` ${lgColsClasses[cols.lg]}`;
      if (cols.xl) colsClassName += ` ${xlColsClasses[cols.xl]}`;
    } else {
      colsClassName = colsClasses[cols];
    }

    return (
      <div
        ref={ref}
        className={cn('grid', colsClassName, gapClasses[effectiveGap], className)}
        {...props}
      />
    );
  }
);
Grid.displayName = 'Grid';

type SpanValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto';

export interface GridColProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: SpanValue | { base?: SpanValue; sm?: SpanValue; md?: SpanValue; lg?: SpanValue; xl?: SpanValue };
}

const GridCol = React.forwardRef<HTMLDivElement, GridColProps>(
  ({ className, span = 'auto', ...props }, ref) => {
    const spanClasses = {
      auto: 'col-auto',
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
      5: 'col-span-5',
      6: 'col-span-6',
      7: 'col-span-7',
      8: 'col-span-8',
      9: 'col-span-9',
      10: 'col-span-10',
      11: 'col-span-11',
      12: 'col-span-12',
    };

    // Responsive span class maps - must be static for Tailwind JIT
    const smSpanClasses: Record<SpanValue, string> = {
      auto: 'sm:col-auto',
      1: 'sm:col-span-1',
      2: 'sm:col-span-2',
      3: 'sm:col-span-3',
      4: 'sm:col-span-4',
      5: 'sm:col-span-5',
      6: 'sm:col-span-6',
      7: 'sm:col-span-7',
      8: 'sm:col-span-8',
      9: 'sm:col-span-9',
      10: 'sm:col-span-10',
      11: 'sm:col-span-11',
      12: 'sm:col-span-12',
    };

    const mdSpanClasses: Record<SpanValue, string> = {
      auto: 'md:col-auto',
      1: 'md:col-span-1',
      2: 'md:col-span-2',
      3: 'md:col-span-3',
      4: 'md:col-span-4',
      5: 'md:col-span-5',
      6: 'md:col-span-6',
      7: 'md:col-span-7',
      8: 'md:col-span-8',
      9: 'md:col-span-9',
      10: 'md:col-span-10',
      11: 'md:col-span-11',
      12: 'md:col-span-12',
    };

    const lgSpanClasses: Record<SpanValue, string> = {
      auto: 'lg:col-auto',
      1: 'lg:col-span-1',
      2: 'lg:col-span-2',
      3: 'lg:col-span-3',
      4: 'lg:col-span-4',
      5: 'lg:col-span-5',
      6: 'lg:col-span-6',
      7: 'lg:col-span-7',
      8: 'lg:col-span-8',
      9: 'lg:col-span-9',
      10: 'lg:col-span-10',
      11: 'lg:col-span-11',
      12: 'lg:col-span-12',
    };

    const xlSpanClasses: Record<SpanValue, string> = {
      auto: 'xl:col-auto',
      1: 'xl:col-span-1',
      2: 'xl:col-span-2',
      3: 'xl:col-span-3',
      4: 'xl:col-span-4',
      5: 'xl:col-span-5',
      6: 'xl:col-span-6',
      7: 'xl:col-span-7',
      8: 'xl:col-span-8',
      9: 'xl:col-span-9',
      10: 'xl:col-span-10',
      11: 'xl:col-span-11',
      12: 'xl:col-span-12',
    };

    // Handle responsive span
    let spanClassName = '';
    if (typeof span === 'object') {
      const baseSpan = span.base ?? 12;
      spanClassName = spanClasses[baseSpan];

      if (span.sm) spanClassName += ` ${smSpanClasses[span.sm]}`;
      if (span.md) spanClassName += ` ${mdSpanClasses[span.md]}`;
      if (span.lg) spanClassName += ` ${lgSpanClasses[span.lg]}`;
      if (span.xl) spanClassName += ` ${xlSpanClasses[span.xl]}`;
    } else {
      spanClassName = spanClasses[span];
    }

    return (
      <div
        ref={ref}
        className={cn(spanClassName, className)}
        {...props}
      />
    );
  }
);
GridCol.displayName = 'GridCol';

export { Grid, GridCol };
