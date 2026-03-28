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
   submitted_by?: string | null;
  featured: boolean;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  user_vote?: number | null;
  comment_count?: number;
  metadata?: WebsiteMetadata | null;
  owner_name?: string | null;
  created_at: string;
}

export interface WebsiteMetadata {
  author?: string | null;
  launch_date?: string | null;
  launch_precision?: 'exact' | 'month' | 'year' | 'unknown';
  languages?: string[];
  images?: string[];
  is_open_source?: boolean;
  source_url?: string | null;
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

export interface Comment {
  id: string;
  website_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  status: string;
  kind?: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote?: number | null;
  replies: Comment[];
}

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  status: string;
  suggested_by?: string | null;
  claimed_by?: string | null;
  claimed_user_name?: string | null;
  claimed_user_avatar?: string | null;
  claimed_at?: string | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
  feature_count: number;
  comment_count: number;
}

export interface IdeaFeature {
  id: string;
  idea_id: string;
  description: string;
  created_by?: string | null;
  created_at: string;
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
}
