import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  order?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const Title = React.forwardRef<HTMLHeadingElement, TitleProps>(
  ({ className, order = 1, size, children, ...props }, ref) => {
    const sizeClasses = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    };

    const defaultSizeByOrder = {
      1: 'text-4xl',
      2: 'text-3xl',
      3: 'text-2xl',
      4: 'text-xl',
      5: 'text-lg',
      6: 'text-base',
    };

    const Tag = `h${order}` as const;
    const sizeClass = size ? sizeClasses[size] : defaultSizeByOrder[order];

    return React.createElement(
      Tag,
      {
        ref,
        className: cn('font-bold tracking-tight text-foreground', sizeClass, className),
        ...props,
      },
      children
    );
  }
);
Title.displayName = 'Title';

export { Title };
