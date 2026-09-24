import { api } from './api.service';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Manager' | 'Seller' | 'Delivery Partner';
  department?: string;
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
  department?: string;
  status: 'active' | 'inactive';
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'Manager' | 'Seller' | 'Delivery Partner';
  department?: string;
  status?: 'active' | 'inactive';
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

  getAllStaff: async (): Promise<Staff[]> => {
    const res = await api.get<StaffResponse>('/staff');
    return res.data.staff;
  },

  createStaff: async (payload: CreateStaffPayload): Promise<Staff> => {
    const res = await api.post<{ success: boolean; data: { staff: Staff } }>('/staff', payload);
    return res.data.staff;
  },

  updateStaff: async (id: string, payload: UpdateStaffPayload): Promise<Staff> => {
    const res = await api.put<{ success: boolean; data: { staff: Staff } }>(`/staff/${id}`, payload);
    return res.data.staff;
  },

  deleteStaff: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/staff/${id}`),

  updateStaffAvailability: (id: string, payload: UpdateStaffAvailabilityPayload) =>
    api.patch<{ success: boolean; data: { staff: Staff } }>(
      `/staff/${id}/availability`,
      payload
    ),
};
