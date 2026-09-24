import { api } from './api.service';

export interface Permission {
  name: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
}

export interface RolesResponse {
  success: boolean;
  data: {
    roles: Role[];
  };
}

export interface PermissionsResponse {
  success: boolean;
  data: {
    permissions: Permission[];
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

  getAllRoles: async (): Promise<Role[]> => {
    const res = await api.get<RolesResponse>('/roles');
    return res.data.roles;
  },

  getAllPermissions: async (): Promise<Permission[]> => {
    const res = await api.get<PermissionsResponse>('/roles/permissions');
    return res.data.permissions;
  },

  createRole: async (payload: CreateRolePayload): Promise<Role> => {
    const res = await api.post<{ success: boolean; data: { role: Role } }>('/roles', payload);
    return res.data.role;
  },

  updateRole: async (id: string, payload: UpdateRolePayload): Promise<Role> => {
    const res = await api.put<{ success: boolean; data: { role: Role } }>(`/roles/${id}`, payload);
    return res.data.role;
  },

  deleteRole: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/roles/${id}`),
};
