import { api } from './api.service';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Manager' | 'Seller' | 'Delivery Partner';
  status: 'active' | 'inactive';
  availability?: 'available' | 'busy' | 'offline';
  activeDeliveries?: number;
  createdAt: string;
}

export interface StaffResponse {
  success: boolean;
  data: {
    staff: Staff[];
  };
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone: string;
  role: 'Manager' | 'Seller' | 'Delivery Partner';
  status: 'active' | 'inactive';
}

export interface UpdateStaffAvailabilityPayload {
  availability: 'available' | 'busy' | 'offline';
}

export const staffService = {
  getStaff: (params?: {
    role?: string;
    status?: string;
    availability?: string;
  }) => api.get<StaffResponse>('/staff', params),

  createStaff: (payload: CreateStaffPayload) =>
    api.post<{ success: boolean; data: { staff: Staff } }>('/staff', payload),

  updateStaffAvailability: (id: string, payload: UpdateStaffAvailabilityPayload) =>
    api.patch<{ success: boolean; data: { staff: Staff } }>(
      `/staff/${id}/availability`,
      payload
    ),
};
