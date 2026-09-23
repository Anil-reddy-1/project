import { api } from './api.service';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  success: boolean;
  message?: string;
  data: User[] | { users: User[]; pagination?: any };
  meta?: {
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage?: boolean;
      hasPrevPage?: boolean;
    };
  };
}

export interface CreateUserPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  status?: 'active' | 'inactive';
}

export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  role?: string;
  status?: 'active' | 'inactive';
}

export const userService = {
  getUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) => api.get<UsersResponse>('/users', params),

  createUser: (payload: CreateUserPayload) =>
    api.post<{ success: boolean; data: { user: User } }>('/users', payload),

  updateUser: (id: string, payload: UpdateUserPayload) =>
    api.put<{ success: boolean; data: { user: User } }>(`/users/${id}`, payload),

  deleteUser: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/users/${id}`),
};
