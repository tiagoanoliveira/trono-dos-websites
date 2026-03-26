import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { truncate } from '@/lib/utils';
import type { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  className?: string;
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  const childCount = category.children?.length ?? 0;

  return (
    <Link
      to={`/categoria/${category.slug}`}
      className={cn(
        'card-hover group flex flex-col gap-3 p-5 focus:outline-none focus:ring-2 focus:ring-crown-500 focus:ring-offset-2',
        className
      )}
    >
      {/* Icon + Name */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {category.icon ? (
            <span className="text-3xl leading-none" aria-hidden="true">
              {category.icon}
            </span>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-crown-100 text-crown-600 text-lg font-bold">
              {category.name[0].toUpperCase()}
            </span>
          )}
          <h3 className="font-semibold text-throne-900 group-hover:text-crown-600 transition-colors leading-tight">
            {category.name}
          </h3>
        </div>
      </div>

      {/* Description */}
      {category.description && (
        <p className="text-sm text-throne-500 leading-relaxed flex-1">
          {truncate(category.description, 90)}
        </p>
      )}

      {/* Footer meta */}
      <div className="flex items-center gap-3 text-xs text-throne-400">
        {category.websiteCount !== undefined && (
          <span className="flex items-center gap-1">
            <GlobeIcon className="h-3.5 w-3.5" />
            {category.websiteCount} {category.websiteCount === 1 ? 'website' : 'websites'}
          </span>
        )}
        {childCount > 0 && (
          <span className="flex items-center gap-1">
            <FolderIcon className="h-3.5 w-3.5" />
            {childCount} {childCount === 1 ? 'subcategoria' : 'subcategorias'}
          </span>
        )}
      </div>
    </Link>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}
