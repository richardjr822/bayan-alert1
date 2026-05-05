export type UserRole = "resident" | "admin";

export type UserSession = {
  id: string;
  fullName: string;
  role: UserRole;
};

export type UserRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  contact_number: string;
  role: UserRole;
  created_at: string;
};
