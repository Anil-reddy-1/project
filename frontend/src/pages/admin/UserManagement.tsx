import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import {
  StatsCard,
  DataTable,
  StatusBadge,
  SearchBar,
  FilterSelect,
  ActionButton,
  Modal,
  LoadingSpinner,
  EmptyState,
} from '../../components/ui';
import {
  Users,
  ShieldCheck,
  Monitor,
  UserPlus,
  Download,
  Eye,
  Edit,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { userService } from '../../services';
import type { User, CreateUserPayload, UpdateUserPayload } from '../../services';
import toast from 'react-hot-toast';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CreateUserPayload>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    status: 'active',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter, statusFilter, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({
        page: currentPage,
        limit: 20,
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.totalPages);
      setTotalUsers(response.data.pagination.total);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      await userService.createUser(formData);
      toast.success('User created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      const updateData: UpdateUserPayload = {
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        status: formData.status,
      };
      await userService.updateUser(selectedUser.id, updateData);
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await userService.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: '', // Don't populate password
      role: user.role,
      status: user.status,
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: '',
      status: 'active',
    });
    setSelectedUser(null);
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(users.map((u) => u.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const columns = [
    {
      key: 'name',
      header: 'Associate / Name',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary font-semibold text-sm flex items-center justify-center shrink-0 shadow-sm">
            {getInitials(user.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm text-on-surface truncate">{user.name}</span>
            <span className="text-xs text-on-surface-variant font-mono">EMP-{user.id.slice(0, 5)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Details',
      render: (user: User) => (
        <div className="flex flex-col">
          <span className="text-sm text-on-surface">{user.email}</span>
          <span className="text-xs text-on-surface-variant font-mono">{user.phone}</span>
        </div>
      ),
    },
    {
      key: 'station',
      header: 'Assigned Station',
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-secondary" />
          <span className="text-sm text-on-surface">
            Main Store #04 <span className="text-on-surface-variant text-xs">(Terminal {Math.floor(Math.random() * 8) + 1})</span>
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'System Role',
      render: (user: User) => (
        <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-primary text-xs font-semibold">
          {user.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Access Status',
      render: (user: User) => (
        <StatusBadge
          status={user.status}
          variant={user.status === 'active' ? 'success' : 'default'}
          dot
        />
      ),
    },
    {
      key: 'created',
      header: 'Audit / Created',
      render: (user: User) => (
        <div className="flex flex-col">
          <span className="text-xs text-on-surface">{formatDate(user.createdAt)}</span>
          <span className="text-xs text-on-surface-variant font-mono">Last: {Math.floor(Math.random() * 60)} mins ago</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (user: User) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="p-1 hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg transition-colors"
            title="View details"
            onClick={() => console.log('View', user.id)}
          >
            <Eye className="w-[18px] h-[18px]" />
          </button>
          <button
            className="p-1 hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg transition-colors"
            title="Edit permissions"
            onClick={() => openEditModal(user)}
          >
            <Edit className="w-[18px] h-[18px]" />
          </button>
          <button
            className="p-1 hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg transition-colors"
            title="Delete user"
            onClick={() => handleDeleteUser(user.id)}
          >
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      ),
    },
  ];

  const activeUsers = users.filter((u) => u.status === 'active').length;
  const inactiveUsers = users.filter((u) => u.status === 'inactive').length;

  return (
    <DashboardLayout title="OPS HUB" subtitle="Console">
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-on-surface">User Management</h1>
              <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-primary text-xs font-mono font-semibold">
                {totalUsers} ACCOUNTS
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Manage system access, seller credentials, store associates, and administrative accounts.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ActionButton variant="secondary" icon={Download}>
              Export Directory
            </ActionButton>
            <ActionButton variant="primary" icon={UserPlus} onClick={() => setIsCreateModalOpen(true)}>
              + Add User
            </ActionButton>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Directory"
            value={totalUsers}
            subtitle="Registered Personnel"
            icon={Users}
            iconColor="text-secondary"
          >
            <div className="flex items-center gap-2 flex-wrap text-xs pt-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-success-100 text-success-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success-700"></span>
                {activeUsers} Active
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-secondary-100 text-secondary-700 font-medium">
                3 Pending
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-danger-100 text-danger-700 font-medium">
                {inactiveUsers} Suspended
              </span>
            </div>
          </StatsCard>

          <StatsCard
            title="Role Profiles"
            value="5 Active Profiles"
            icon={ShieldCheck}
            iconColor="text-primary"
          >
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant pt-2">
              <span className="bg-surface-container px-2 py-0.5 rounded-lg font-mono">Admin</span>
              <span className="bg-surface-container px-2 py-0.5 rounded-lg font-mono">Manager</span>
              <span className="bg-surface-container px-2 py-0.5 rounded-lg font-mono">Cashier</span>
              <span className="bg-surface-container px-2 py-0.5 rounded-lg font-mono">Inventory</span>
              <span className="bg-surface-container px-2 py-0.5 rounded-lg font-mono">Dispatch</span>
            </div>
          </StatsCard>

          <StatsCard
            title="Active Store Sessions"
            value="14"
            icon={Monitor}
            iconColor="text-secondary"
          >
            <div className="flex items-center gap-1 text-xs text-success-700 pt-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              Live On-Shift
            </div>
            <div className="flex items-center justify-between text-on-surface-variant text-xs pt-1">
              <span>4 Hardware POS Terminals</span>
              <span className="font-mono font-medium text-on-surface">10 Handheld/Apps</span>
            </div>
          </StatsCard>
        </div>

        {/* Filters and Table */}
        <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="p-4 bg-surface-container-lowest flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name, email, terminal, or employee ID..."
                className="flex-1 max-w-md"
              />
              <FilterSelect
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'Admin', label: 'Administrator' },
                  { value: 'Store Manager', label: 'Store Manager' },
                  { value: 'Cashier', label: 'Cashier' },
                  { value: 'Inventory Specialist', label: 'Inventory Clerk' },
                  { value: 'Dispatch Driver', label: 'Dispatch Driver' },
                ]}
              />
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container text-on-surface text-sm rounded-lg flex items-center gap-1 transition-colors">
                <MoreVertical className="w-4 h-4 text-outline" />
                <span>Columns</span>
              </button>
              <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container text-on-surface text-sm rounded-lg flex items-center gap-1 transition-colors">
                <svg className="w-4 h-4 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <div className="p-12">
              <LoadingSpinner size="lg" text="Loading users..." />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="Try adjusting your search or filters"
              action={
                <ActionButton variant="primary" icon={UserPlus} onClick={() => setIsCreateModalOpen(true)}>
                  Add First User
                </ActionButton>
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={users}
              keyExtractor={(user) => user.id}
              selectable
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
            />
          )}
        </div>

        {/* Create User Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            resetForm();
          }}
          title="Create New User"
          footer={
            <>
              <ActionButton variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </ActionButton>
              <ActionButton variant="primary" onClick={handleCreateUser}>
                Create User
              </ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a role</option>
                <option value="Administrator">Administrator</option>
                <option value="Store Manager">Store Manager</option>
                <option value="Cashier">Cashier</option>
                <option value="Inventory Specialist">Inventory Specialist</option>
                <option value="Delivery Partner">Delivery Partner</option>
              </select>
            </div>
          </div>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            resetForm();
          }}
          title="Edit User"
          footer={
            <>
              <ActionButton variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </ActionButton>
              <ActionButton variant="primary" onClick={handleUpdateUser}>
                Save Changes
              </ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Administrator">Administrator</option>
                <option value="Store Manager">Store Manager</option>
                <option value="Cashier">Cashier</option>
                <option value="Inventory Specialist">Inventory Specialist</option>
                <option value="Delivery Partner">Delivery Partner</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
