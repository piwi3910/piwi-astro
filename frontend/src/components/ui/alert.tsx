'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title?: string;
  color?: 'default' | 'blue' | 'yellow' | 'red' | 'green';
}

const colorClasses = {
  default: 'bg-card border-border text-foreground',
  blue: 'bg-blue-950/30 border-blue-900/50 text-blue-100',
  yellow: 'bg-yellow-950/30 border-yellow-900/50 text-yellow-100',
  red: 'bg-red-950/30 border-red-900/50 text-red-100',
  green: 'bg-green-950/30 border-green-900/50 text-green-100',
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, icon, title, color = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-md border p-4',
          colorClasses[color],
          className
        )}
        {...props}
      >
        <div className="flex gap-3">
          {icon && (
            <div className="flex-shrink-0 mt-0.5">
              {icon}
            </div>
          )}
          <div className="flex-1">
            {title && (
              <div className="font-medium mb-1">
                {title}
              </div>
            )}
            <div className="text-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export { Alert };
