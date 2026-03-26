export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  status: 'active' | 'pending' | 'rejected';
  websiteCount?: number;
  children?: Category[];
}

export interface Website {
  id: string;
  name: string;
  url: string;
  description: string | null;
  logo_url: string | null;
  screenshot_url: string | null;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  status: 'pending' | 'approved' | 'rejected';
  featured: boolean;
  avg_rating?: number;
  rating_count?: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
