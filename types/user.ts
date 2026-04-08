export const USER_ROLES = ["owner", "manager", "driver"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  operator_id: string;
  role: UserRole;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}
