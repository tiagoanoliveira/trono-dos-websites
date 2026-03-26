import { cn } from '@/lib/utils';

type StarSize = 'sm' | 'md' | 'lg';

interface StarRatingProps {
  score: number;
  count?: number;
  size?: StarSize;
  showCount?: boolean;
  className?: string;
}

const sizeClasses: Record<StarSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const textSizeClasses: Record<StarSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={cn(filled ? 'text-crown-500' : 'text-throne-300', className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function StarRating({ score, count, size = 'md', showCount = true, className }: StarRatingProps) {
  const rounded = Math.round(score * 2) / 2; // round to nearest 0.5

  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={`${score.toFixed(1)} de 5 estrelas`}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} filled={star <= rounded} className={sizeClasses[size]} />
        ))}
      </div>
      {score > 0 && (
        <span className={cn('font-medium text-throne-700', textSizeClasses[size])}>
          {score.toFixed(1)}
        </span>
      )}
      {showCount && count !== undefined && (
        <span className={cn('text-throne-400', textSizeClasses[size])}>
          ({count})
        </span>
      )}
    </div>
  );
}
