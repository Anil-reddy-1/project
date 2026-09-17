import { api } from './api.service';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
}

export interface RolesResponse {
  success: boolean;
  data: {
    roles: Role[];
  };
}

export interface CreateRolePayload {
  name: string;
  description: string;
  permissions: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissions?: string[];
}

export const roleService = {
  getRoles: () => api.get<RolesResponse>('/roles'),

  createRole: (payload: CreateRolePayload) =>
    api.post<{ success: boolean; data: { role: Role } }>('/roles', payload),

  updateRole: (id: string, payload: UpdateRolePayload) =>
    api.put<{ success: boolean; data: { role: Role } }>(`/roles/${id}`, payload),

  deleteRole: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/roles/${id}`),
};
