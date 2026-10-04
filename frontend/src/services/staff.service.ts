import { api } from './api.service';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'manager' | 'seller' | 'delivery_partner' | 'supervisor';
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
  role: 'manager' | 'seller' | 'delivery_partner' | 'supervisor';
  department?: string;
  status: 'active' | 'inactive';
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'manager' | 'seller' | 'delivery_partner' | 'supervisor';
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
    // Axios interceptor already returns response.data (the body)
    // Body shape: { success, message, data: [...], meta: {...} }
    return (res as any).data || [];
  },

  createStaff: async (payload: CreateStaffPayload): Promise<Staff> => {
    const res = await api.post<{ success: boolean; data: { staff: Staff } }>('/staff', payload);
    return (res as any).data;
  },

  updateStaff: async (id: string, payload: UpdateStaffPayload): Promise<Staff> => {
    const res = await api.put<{ success: boolean; data: { staff: Staff } }>(`/staff/${id}`, payload);
    return (res as any).data?.staff || (res as any).data;
  },

  deleteStaff: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/staff/${id}`),

  updateStaffAvailability: (id: string, payload: UpdateStaffAvailabilityPayload) =>
    api.patch<{ success: boolean; data: { staff: Staff } }>(
      `/staff/${id}/availability`,
      payload
    ),
};
