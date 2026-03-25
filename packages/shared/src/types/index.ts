// ============================================
// Entidades Base
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  googleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'user' | 'moderator' | 'admin';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  status: CategoryStatus;
  suggestedBy: string | null;
  createdAt: string;
  websiteCount?: number;
}

export type CategoryStatus = 'active' | 'pending' | 'rejected';

export interface Website {
  id: string;
  name: string;
  url: string;
  description: string | null;
  logoUrl: string | null;
  screenshotUrl: string | null;
  categoryId: string;
  status: WebsiteStatus;
  submittedBy: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  // Campos calculados
  averageRating?: number;
  totalRatings?: number;
  totalComments?: number;
}

export type WebsiteStatus = 'pending' | 'approved' | 'rejected';

export interface Rating {
  id: string;
  websiteId: string;
  userId: string;
  score: number; // 1-5
  createdAt: string;
}

export interface Comment {
  id: string;
  websiteId: string;
  userId: string;
  content: string;
  parentId: string | null;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  // Campos expandidos
  user?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  replies?: Comment[];
}

export type CommentStatus = 'visible' | 'hidden' | 'deleted';

export interface DailyComparison {
  id: string;
  date: string;
  categoryId: string;
  websiteAId: string;
  websiteBId: string;
  createdAt: string;
  // Campos expandidos
  category?: Category;
  websiteA?: Website;
  websiteB?: Website;
  votesA?: number;
  votesB?: number;
  userVote?: string | null;
}

export interface ComparisonVote {
  id: string;
  comparisonId: string;
  userId: string;
  votedFor: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export type ReportTargetType = 'website' | 'comment' | 'user';
export type ReportReason = 'spam' | 'inappropriate' | 'misleading' | 'broken' | 'duplicate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface CategorySuggestion {
  id: string;
  name: string;
  description: string | null;
  suggestedBy: string;
  status: CategoryStatus;
  reviewedBy: string | null;
  createdAt: string;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiMeta {
  page?: number;
  perPage?: number;
  total?: number;
  totalPages?: number;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface WebsiteFilters extends PaginationParams {
  categoryId?: string;
  status?: WebsiteStatus;
  featured?: boolean;
  search?: string;
  sortBy?: 'rating' | 'date' | 'name' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Auth Types
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface GoogleAuthData {
  credential: string;
}

// ============================================
// Form Types
// ============================================

export interface WebsiteSubmission {
  name: string;
  url: string;
  description: string;
  categoryId: string;
}

export interface CategorySuggestionForm {
  name: string;
  description: string;
}

export interface ReportForm {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
}
