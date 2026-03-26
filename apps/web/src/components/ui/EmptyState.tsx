import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-throne-200 bg-throne-50 px-6 py-16 text-center',
        className
      )}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-throne-100 text-2xl">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="font-semibold text-throne-800">{title}</h3>
        {description && <p className="text-sm text-throne-500">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
