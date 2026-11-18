export type UserRole = 'owner' | 'service_advisor' | 'mandor' | 'petugas_gudang' | 'kasir';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
  created_at: string;
}
