import { Link } from 'react-router-dom';
import { cn, truncate, getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import type { Website } from '@/types';

interface WebsiteCardProps {
  website: Website;
  className?: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function WebsiteCard({ website, className }: WebsiteCardProps) {
  const domain = getDomain(website.url);

  return (
    <div className={cn('card-hover flex flex-col gap-4 p-5', className)}>
      {/* Header: logo + info + badges */}
      <div className="flex items-start gap-3">
        {/* Logo */}
        <div className="shrink-0">
          {website.logo_url ? (
            <img
              src={website.logo_url}
              alt={`${website.name} logo`}
              className="h-12 w-12 rounded-lg object-cover border border-throne-100"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={cn(
              'h-12 w-12 rounded-lg bg-crown-100 text-crown-700 font-bold text-lg items-center justify-center',
              website.logo_url ? 'hidden' : 'flex'
            )}
          >
            {getInitials(website.name)}
          </div>
        </div>

        {/* Name + domain + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={`/website/${website.id}`}
                className="font-semibold text-throne-900 hover:text-crown-600 transition-colors leading-tight line-clamp-1"
              >
                {website.name}
              </Link>
              <p className="text-xs text-throne-400 mt-0.5 truncate">{domain}</p>
            </div>
            {website.featured && (
              <Badge variant="warning" size="sm" className="shrink-0">
                ⭐ Destaque
              </Badge>
            )}
          </div>

          {/* Category */}
          {website.category_name && (
            <Link
              to={`/categoria/${website.category_slug ?? ''}`}
              className="mt-1.5 inline-block"
            >
              <Badge variant="default" size="sm">
                {website.category_name}
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Description */}
      {website.description && (
        <p className="text-sm text-throne-600 leading-relaxed flex-1 line-clamp-2">
          {truncate(website.description, 120)}
        </p>
      )}

      {/* Footer: rating + external link */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-throne-100">
        <StarRating
          score={website.avg_rating ?? 0}
          count={website.rating_count ?? 0}
          size="sm"
          showCount
        />
        <a
          href={website.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-crown-600 hover:text-crown-700 transition-colors"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Visitar ${website.name}`}
        >
          Visitar
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
