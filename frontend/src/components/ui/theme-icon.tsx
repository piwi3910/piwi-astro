import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ThemeIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'filled' | 'light' | 'outline' | 'transparent';
  color?: 'primary' | 'secondary' | 'destructive' | 'muted' | 'blue' | 'grape' | 'cyan' | 'orange' | 'green' | 'violet' | 'gray';
}

const ThemeIcon = React.forwardRef<HTMLDivElement, ThemeIconProps>(
  (
    {
      className,
      size = 'md',
      radius = 'md',
      variant = 'filled',
      color = 'primary',
      ...props
    },
    ref
  ) => {
    const sizeClasses: Record<string, string> = {
      xs: 'h-6 w-6 [&>svg]:h-3 [&>svg]:w-3',
      sm: 'h-8 w-8 [&>svg]:h-4 [&>svg]:w-4',
      md: 'h-10 w-10 [&>svg]:h-5 [&>svg]:w-5',
      lg: 'h-12 w-12 [&>svg]:h-6 [&>svg]:w-6',
      xl: 'h-14 w-14 [&>svg]:h-7 [&>svg]:w-7',
    };

    // Handle numeric sizes
    const sizeStyle = typeof size === 'number' ? { width: size, height: size } : undefined;
    const sizeClass = typeof size === 'string' ? sizeClasses[size] : '';

    const radiusClasses = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    };

    const variantColorClasses: Record<string, Record<string, string>> = {
      filled: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        muted: 'bg-muted text-muted-foreground',
        blue: 'bg-blue-500 text-white',
        grape: 'bg-purple-500 text-white',
        cyan: 'bg-cyan-500 text-white',
        orange: 'bg-orange-500 text-white',
        green: 'bg-green-500 text-white',
        violet: 'bg-violet-500 text-white',
        gray: 'bg-gray-500 text-white',
      },
      light: {
        primary: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary/50 text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        muted: 'bg-muted/50 text-muted-foreground',
        blue: 'bg-blue-500/10 text-blue-500',
        grape: 'bg-purple-500/10 text-purple-500',
        cyan: 'bg-cyan-500/10 text-cyan-500',
        orange: 'bg-orange-500/10 text-orange-500',
        green: 'bg-green-500/10 text-green-500',
        violet: 'bg-violet-500/10 text-violet-500',
        gray: 'bg-gray-500/10 text-gray-500',
      },
      outline: {
        primary: 'border border-primary text-primary bg-transparent',
        secondary: 'border border-secondary text-secondary-foreground bg-transparent',
        destructive: 'border border-destructive text-destructive bg-transparent',
        muted: 'border border-muted text-muted-foreground bg-transparent',
        blue: 'border border-blue-500 text-blue-500 bg-transparent',
        grape: 'border border-purple-500 text-purple-500 bg-transparent',
        cyan: 'border border-cyan-500 text-cyan-500 bg-transparent',
        orange: 'border border-orange-500 text-orange-500 bg-transparent',
        green: 'border border-green-500 text-green-500 bg-transparent',
        violet: 'border border-violet-500 text-violet-500 bg-transparent',
        gray: 'border border-gray-500 text-gray-500 bg-transparent',
      },
      transparent: {
        primary: 'text-primary bg-transparent',
        secondary: 'text-secondary-foreground bg-transparent',
        destructive: 'text-destructive bg-transparent',
        muted: 'text-muted-foreground bg-transparent',
        blue: 'text-blue-500 bg-transparent',
        grape: 'text-purple-500 bg-transparent',
        cyan: 'text-cyan-500 bg-transparent',
        orange: 'text-orange-500 bg-transparent',
        green: 'text-green-500 bg-transparent',
        violet: 'text-violet-500 bg-transparent',
        gray: 'text-gray-500 bg-transparent',
      },
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          sizeClass,
          radiusClasses[radius],
          variantColorClasses[variant][color],
          className
        )}
        style={sizeStyle}
        {...props}
      />
    );
  }
);
ThemeIcon.displayName = 'ThemeIcon';

export { ThemeIcon };
