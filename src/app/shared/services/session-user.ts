/** The authenticated user as the backend exposes it (never includes the password hash). */
export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}
