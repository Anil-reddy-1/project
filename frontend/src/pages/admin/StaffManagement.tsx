import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import {
  StatsCard,
  DataTable,
  StatusBadge,
  SearchBar,
  FilterSelect,
  PageHeader,
  ActionButton,
  Modal,
  LoadingSpinner,
  EmptyState,
} from '../../components/ui';
import { staffService } from '../../services';
import type { Staff, CreateStaffPayload, UpdateStaffPayload } from '../../services/staff.service';

export function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: string;
    department: string;
    status: 'active' | 'inactive';
  }>({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await staffService.getAllStaff();
      setStaff(data);
    } catch (error) {
      console.error('Failed to load staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone is required';
    }
    if (!formData.role.trim()) {
      errors.role = 'Role is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateStaff = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: CreateStaffPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        status: formData.status,
      };
      const newStaff = await staffService.createStaff(payload);
      setStaff([...staff, newStaff]);
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create staff:', error);
      setFormErrors({ submit: 'Failed to create staff member. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStaff = async () => {
    if (!selectedStaff || !validateForm()) return;

    try {
      setSubmitting(true);
      const payload: UpdateStaffPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        status: formData.status,
      };
      const updatedStaff = await staffService.updateStaff(selectedStaff.id, payload);
      setStaff(staff.map((s) => (s.id === selectedStaff.id ? updatedStaff : s)));
      setIsEditModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to update staff:', error);
      setFormErrors({ submit: 'Failed to update staff member. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffMember: Staff) => {
    if (!confirm(`Are you sure you want to delete ${staffMember.name}?`)) {
      return;
    }

    try {
      await staffService.deleteStaff(staffMember.id);
      setStaff(staff.filter((s) => s.id !== staffMember.id));
    } catch (error) {
      console.error('Failed to delete staff:', error);
      alert('Failed to delete staff member. Please try again.');
    }
  };

  const openEditModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      role: staffMember.role,
      department: staffMember.department || '',
      status: staffMember.status,
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
      email: '',
      phone: '',
      role: '',
      department: '',
      status: 'active',
    });
    setFormErrors({});
    setSelectedStaff(null);
  };

  const columns = [
    {
      key: 'name',
      label: 'Staff Member',
      render: (s: Staff) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{s.name}</div>
            <div className="text-sm text-gray-500">{s.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role & Department',
      render: (s: Staff) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{s.role}</div>
          <div className="text-sm text-gray-500">{s.department || 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (s: Staff) => (
        <div className="text-sm text-gray-700">{s.phone}</div>
      ),
    },
    {
      key: 'availability',
      label: 'Availability for Tasks',
      render: (s: Staff) => {
        // Check if this is a delivery partner with availability status
        const availability = (s as any).availability || 'available';
        return (
          <StatusBadge
            status={availability === 'available' ? 'success' : availability === 'busy' ? 'warning' : 'inactive'}
            label={availability === 'available' ? 'Available' : availability === 'busy' ? 'On Task' : 'Offline'}
          />
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (s: Staff) => (
        <StatusBadge
          status={s.status === 'active' ? 'success' : 'inactive'}
          label={s.status === 'active' ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (s: Staff) => (
        <div className="flex items-center justify-end gap-2">
          <ActionButton variant="secondary" size="sm" onClick={() => openEditModal(s)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </ActionButton>
          <ActionButton variant="danger" size="sm" onClick={() => handleDeleteStaff(s)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
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

  const totalStaff = staff.length;
  const activeStaff = staff.filter((s) => s.status === 'active').length;
  const availableForTasks = staff.filter((s) => (s as any).availability === 'available').length;
  const onActiveShift = staff.filter((s) => (s as any).availability === 'busy').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Staff Management & Floor Supervision"
          description="Manage store associates and track real-time staff availability"
        />

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <StatsCard
            title="TOTAL STAFF"
            value={totalStaff.toString()}
            subtitle="All registered associates"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
            trend="neutral"
          />
          <StatsCard
            title="ON DUTY TODAY"
            value={activeStaff.toString()}
            subtitle="Staff actively clocked in"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            trend="up"
            trendValue="+2"
          />
          <StatsCard
            title="AVAILABLE FOR TASKS"
            value={availableForTasks.toString()}
            subtitle="Staff ready for new tasks"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            trend="neutral"
          />
          <StatsCard
            title="ON MEMORY SHIFT"
            value={onActiveShift.toString()}
            subtitle="Currently assigned tasks"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            trend="neutral"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
            <div className="flex-1 max-w-md">
              <SearchBar
                placeholder="Search staff by name..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <FilterSelect
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'Manager', label: 'Manager' },
                { value: 'Seller', label: 'Seller' },
                { value: 'Delivery Partner', label: 'Delivery Partner' },
                { value: 'Supervisor', label: 'Supervisor' },
              ]}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
          <ActionButton variant="primary" onClick={openCreateModal}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Staff Member
          </ActionButton>
        </div>

        {/* Staff Table */}
        {filteredStaff.length === 0 ? (
          <EmptyState
            title="No staff members found"
            description={
              searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first staff member'
            }
            actionLabel={!searchQuery && roleFilter === 'all' && statusFilter === 'all' ? 'Add Staff Member' : undefined}
            onAction={!searchQuery && roleFilter === 'all' && statusFilter === 'all' ? openCreateModal : undefined}
          />
        ) : (
          <DataTable columns={columns} data={filteredStaff} />
        )}

        {/* Create Staff Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Add Staff Member"
          size="medium"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                placeholder="e.g., Marcus Vance"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.name && <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                }}
                placeholder="e.g., marcus@store.com"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.email && <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                }}
                placeholder="e.g., +1 (555) 000-0000"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.phone && <p className="mt-1 text-sm text-red-500">{formErrors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => {
                  setFormData({ ...formData, role: e.target.value });
                  if (formErrors.role) setFormErrors({ ...formErrors, role: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.role ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a role</option>
                <option value="Manager">Manager</option>
                <option value="Seller">Seller</option>
                <option value="Delivery Partner">Delivery Partner</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Inventory Clerk">Inventory Clerk</option>
              </select>
              {formErrors.role && <p className="mt-1 text-sm text-red-500">{formErrors.role}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Store Operations"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
              <ActionButton variant="primary" onClick={handleCreateStaff} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Staff Member'}
              </ActionButton>
            </div>
          </div>
        </Modal>

        {/* Edit Staff Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Staff Member"
          size="medium"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                placeholder="e.g., Marcus Vance"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.name && <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                }}
                placeholder="e.g., marcus@store.com"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.email && <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                }}
                placeholder="e.g., +1 (555) 000-0000"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.phone && <p className="mt-1 text-sm text-red-500">{formErrors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => {
                  setFormData({ ...formData, role: e.target.value });
                  if (formErrors.role) setFormErrors({ ...formErrors, role: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.role ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a role</option>
                <option value="Manager">Manager</option>
                <option value="Seller">Seller</option>
                <option value="Delivery Partner">Delivery Partner</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Inventory Clerk">Inventory Clerk</option>
              </select>
              {formErrors.role && <p className="mt-1 text-sm text-red-500">{formErrors.role}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Store Operations"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
              <ActionButton variant="primary" onClick={handleEditStaff} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </ActionButton>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
