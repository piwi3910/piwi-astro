import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  c?: 'dimmed' | 'muted' | 'primary' | 'destructive' | 'inherit';
  fw?: 'normal' | 'medium' | 'semibold' | 'bold';
  ta?: 'left' | 'center' | 'right';
  span?: boolean;
  as?: 'p' | 'span' | 'div' | 'label';
  truncate?: boolean | 'start' | 'end';
  lineClamp?: number;
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  (
    {
      className,
      size = 'md',
      c,
      fw,
      ta,
      span = false,
      as,
      truncate,
      lineClamp,
      style,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    };

    const colorClasses = {
      dimmed: 'text-muted-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      destructive: 'text-destructive',
      inherit: 'text-inherit',
    };

    const weightClasses = {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    };

    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };

    const Tag = as || (span ? 'span' : 'p');

    const combinedStyle = lineClamp
      ? {
          ...style,
          display: '-webkit-box',
          WebkitLineClamp: lineClamp,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }
      : style;

    return React.createElement(
      Tag,
      {
        ref,
        className: cn(
          sizeClasses[size],
          c && colorClasses[c],
          fw && weightClasses[fw],
          ta && alignClasses[ta],
          truncate === true && 'truncate',
          className
        ),
        style: combinedStyle,
        ...props,
      }
    );
  }
);
Text.displayName = 'Text';

export { Text };
