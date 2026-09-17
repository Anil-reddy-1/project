import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import {
  StatsCard,
  DataTable,
  StatusBadge,
  SearchBar,
  PageHeader,
  ActionButton,
  Modal,
  LoadingSpinner,
  EmptyState,
} from '../../components/ui';
import { roleService } from '../../services';
import type { Role, Permission, CreateRolePayload, UpdateRolePayload } from '../../services/role.service';

// Permission categories for organized display
const PERMISSION_CATEGORIES = {
  'User & Staff Management': [
    'users.view',
    'users.create',
    'users.update',
    'users.delete',
    'staff.view',
    'staff.create',
    'staff.update',
    'staff.delete',
  ],
  'Stock Management': [
    'stock.view',
    'stock.manage',
    'stock.adjust',
  ],
  'Pricing & Discounts': [
    'pricing.view',
    'pricing.update',
  ],
  'Orders': [
    'orders.view',
    'orders.process',
    'orders.cancel',
  ],
  'Delivery & Shipments': [
    'delivery.view',
    'delivery.assign',
    'delivery.manage',
  ],
  'Debt Management': [
    'debt.view',
    'debt.manage',
  ],
  'Reports': [
    'reports.view',
    'reports.export',
  ],
  'Role Management': [
    'roles.view',
    'roles.manage',
  ],
};

export function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    permissions: string[];
  }>({
    name: '',
    description: '',
    permissions: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        roleService.getAllRoles(),
        roleService.getAllPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Failed to load roles and permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Role name is required';
    }
    
    if (formData.permissions.length === 0) {
      errors.permissions = 'At least one permission must be selected';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRole = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: CreateRolePayload = {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
      };
      const newRole = await roleService.createRole(payload);
      setRoles([...roles, newRole]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create role:', error);
      setFormErrors({ submit: 'Failed to create role. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole || !validateForm()) return;

    try {
      setSubmitting(true);
      const payload: UpdateRolePayload = {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
      };
      const updatedRole = await roleService.updateRole(selectedRole.id, payload);
      setRoles(roles.map((role) => (role.id === selectedRole.id ? updatedRole : role)));
      setIsEditModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to update role:', error);
      setFormErrors({ submit: 'Failed to update role. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    try {
      await roleService.deleteRole(role.id);
      setRoles(roles.filter((r) => r.id !== role.id));
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role. Please try again.');
    }
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions.map((p) => p.name),
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: [],
    });
    setFormErrors({});
    setSelectedRole(null);
  };

  const togglePermission = (permissionName: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionName)
        ? prev.permissions.filter((p) => p !== permissionName)
        : [...prev.permissions, permissionName],
    }));
    // Clear permissions error when user selects a permission
    if (formErrors.permissions) {
      setFormErrors((prev) => ({ ...prev, permissions: '' }));
    }
  };

  const toggleCategoryPermissions = (categoryPermissions: string[]) => {
    const allSelected = categoryPermissions.every((p) =>
      formData.permissions.includes(p)
    );
    
    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !categoryPermissions.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermissions])],
    }));
    
    if (formErrors.permissions) {
      setFormErrors((prev) => ({ ...prev, permissions: '' }));
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Role Name',
      render: (role: Role) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="font-medium text-gray-900">{role.name}</div>
            <div className="text-sm text-gray-500">{role.description || 'No description'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (role: Role) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {role.permissions.length} {role.permissions.length === 1 ? 'Permission' : 'Permissions'}
          </div>
          <div className="text-sm text-gray-500">
            {role.permissions.slice(0, 3).map((p) => p.name).join(', ')}
            {role.permissions.length > 3 && ` +${role.permissions.length - 3} more`}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (role: Role) => <StatusBadge status="active" label="Active" />,
    },
    {
      key: 'actions',
      label: '',
      render: (role: Role) => (
        <div className="flex items-center justify-end gap-2">
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => openEditModal(role)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </ActionButton>
          <ActionButton
            variant="danger"
            size="sm"
            onClick={() => handleDeleteRole(role)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </ActionButton>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const totalUsers = roles.reduce((sum, role) => sum + (role.userCount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Role & Permission Management"
          description="Define roles and assign granular permissions for your policy team"
        />

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <StatsCard
            title="Active Roles"
            value={roles.length.toString()}
            subtitle="Total roles defined"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            trend="neutral"
          />
          <StatsCard
            title="Total Users"
            value={totalUsers.toString()}
            subtitle="Users with assigned roles"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            trend="up"
            trendValue="+12%"
          />
          <StatsCard
            title="1000+ Strict"
            value={permissions.length.toString()}
            subtitle="Permissions available"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            trend="neutral"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 max-w-md">
            <SearchBar
              placeholder="Search roles..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <ActionButton variant="primary" onClick={openCreateModal}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Role
          </ActionButton>
        </div>

        {/* Roles Table */}
        {filteredRoles.length === 0 ? (
          <EmptyState
            title="No roles found"
            description={
              searchQuery
                ? 'Try adjusting your search query'
                : 'Get started by creating your first role'
            }
            actionLabel={!searchQuery ? 'Create Role' : undefined}
            onAction={!searchQuery ? openCreateModal : undefined}
          />
        ) : (
          <DataTable columns={columns} data={filteredRoles} />
        )}

        {/* Create Role Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Role"
          size="large"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                placeholder="e.g., Store Manager"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the role"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions <span className="text-red-500">*</span>
              </label>
              <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPerms]) => {
                  const availablePerms = categoryPerms.filter((p) =>
                    permissions.some((perm) => perm.name === p)
                  );
                  
                  if (availablePerms.length === 0) return null;

                  const allSelected = availablePerms.every((p) =>
                    formData.permissions.includes(p)
                  );
                  const someSelected = availablePerms.some((p) =>
                    formData.permissions.includes(p)
                  );

                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCategoryPermissions(availablePerms)}
                          className="flex items-center gap-2"
                        >
                          <div
                            className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                              allSelected
                                ? 'bg-blue-600 border-blue-600'
                                : someSelected
                                ? 'bg-blue-200 border-blue-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {allSelected && (
                              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{category}</span>
                        </button>
                        <span className="text-sm text-gray-500">
                          ({availablePerms.length} {availablePerms.length === 1 ? 'permission' : 'permissions'})
                        </span>
                      </div>
                      <div className="ml-7 space-y-2">
                        {availablePerms.map((permName) => {
                          const permission = permissions.find((p) => p.name === permName);
                          if (!permission) return null;

                          return (
                            <label
                              key={permission.name}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <button
                                type="button"
                                onClick={() => togglePermission(permission.name)}
                                className="flex items-center gap-2"
                              >
                                <div
                                  className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                                    formData.permissions.includes(permission.name)
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {formData.permissions.includes(permission.name) && (
                                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm text-gray-700">{permission.description || permission.name}</span>
                              </button>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {formErrors.permissions && (
                <p className="mt-1 text-sm text-red-500">{formErrors.permissions}</p>
              )}
            </div>

            {formErrors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{formErrors.submit}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <ActionButton
                variant="secondary"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleCreateRole}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Role'}
              </ActionButton>
            </div>
          </div>
        </Modal>

        {/* Edit Role Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Role"
          size="large"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                placeholder="e.g., Store Manager"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the role"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions <span className="text-red-500">*</span>
              </label>
              <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPerms]) => {
                  const availablePerms = categoryPerms.filter((p) =>
                    permissions.some((perm) => perm.name === p)
                  );
                  
                  if (availablePerms.length === 0) return null;

                  const allSelected = availablePerms.every((p) =>
                    formData.permissions.includes(p)
                  );
                  const someSelected = availablePerms.some((p) =>
                    formData.permissions.includes(p)
                  );

                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCategoryPermissions(availablePerms)}
                          className="flex items-center gap-2"
                        >
                          <div
                            className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                              allSelected
                                ? 'bg-blue-600 border-blue-600'
                                : someSelected
                                ? 'bg-blue-200 border-blue-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {allSelected && (
                              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{category}</span>
                        </button>
                        <span className="text-sm text-gray-500">
                          ({availablePerms.length} {availablePerms.length === 1 ? 'permission' : 'permissions'})
                        </span>
                      </div>
                      <div className="ml-7 space-y-2">
                        {availablePerms.map((permName) => {
                          const permission = permissions.find((p) => p.name === permName);
                          if (!permission) return null;

                          return (
                            <label
                              key={permission.name}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <button
                                type="button"
                                onClick={() => togglePermission(permission.name)}
                                className="flex items-center gap-2"
                              >
                                <div
                                  className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                                    formData.permissions.includes(permission.name)
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {formData.permissions.includes(permission.name) && (
                                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm text-gray-700">{permission.description || permission.name}</span>
                              </button>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {formErrors.permissions && (
                <p className="mt-1 text-sm text-red-500">{formErrors.permissions}</p>
              )}
            </div>

            {formErrors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{formErrors.submit}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <ActionButton
                variant="secondary"
                onClick={() => setIsEditModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleEditRole}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </ActionButton>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
