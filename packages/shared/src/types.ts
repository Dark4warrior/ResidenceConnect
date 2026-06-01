export type UserRole = 'tenant' | 'manager' | 'technician';

export type TicketStatus = 'pending' | 'in_progress' | 'resolved';

export type TicketCategory = 'plumbing' | 'electricity' | 'elevator' | 'other';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export type NotificationType =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'status_changed'
  | 'ticket_resolved';

export type Platform = 'ios' | 'android';

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  created_at: string;
}

export interface Residence {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  manager_id: string;
  created_at: string;
}

export interface Apartment {
  id: string;
  residence_id: string;
  unit_number: string;
  floor: string | null;
  tenant_id: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  apartment_id: string;
  reported_by: string;
  assigned_to: string | null;
  title: string;
  description: string;
  category: TicketCategory;
  urgency_level: UrgencyLevel;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface TicketPhoto {
  id: string;
  ticket_id: string;
  storage_path: string;
  url: string;
  created_at: string;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  changed_by: string;
  old_status: TicketStatus;
  new_status: TicketStatus;
  comment: string | null;
  changed_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  ticket_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: Platform;
  created_at: string;
}

export interface TicketWithDetails extends Ticket {
  apartment: Apartment & { residence: Residence };
  reporter: Profile;
  assignee: Profile | null;
  photos: TicketPhoto[];
}
