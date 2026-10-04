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
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { userService } from '../../services';
import type { User, CreateUserPayload, UpdateUserPayload } from '../../services';
import toast from 'react-hot-toast';

/* ─── Reusable form field ─── */
function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full h-10 px-3.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-400 shadow-sm';

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
      const response: any = await userService.getUsers({
        page: currentPage,
        limit: 20,
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });

      // Handle backend response format: { success: true, data: User[], meta: { pagination: { total, totalPages } } }
      // or legacy nested { data: { users, pagination } }
      let userList: User[] = [];
      let total = 0;
      let pages = 1;

      if (Array.isArray(response?.data)) {
        userList = response.data;
        total = response?.meta?.pagination?.total ?? response.data.length;
        pages = response?.meta?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / 20));
      } else if (response?.data?.users && Array.isArray(response.data.users)) {
        userList = response.data.users;
        total = response.data.pagination?.total ?? response.data.users.length;
        pages = response.data.pagination?.totalPages ?? 1;
      } else if (Array.isArray(response)) {
        userList = response;
        total = response.length;
        pages = 1;
      }

      setUsers(userList);
      setTotalPages(pages);
      setTotalUsers(total);
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
      // Only send fields that have actual values — empty strings fail backend validation
      const updateData: UpdateUserPayload = {};
      if (formData.name?.trim()) updateData.name = formData.name.trim();
      if (formData.phone?.trim()) updateData.phone = formData.phone.trim();
      if (formData.role) updateData.role = formData.role;
      if (formData.status) updateData.status = formData.status;

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
      password: '',
      role: user.role,
      status: user.status,
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '', role: '', status: 'active' });
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

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const columns = [
    {
      key: 'name',
      header: 'Associate',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
            {getInitials(user.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm text-slate-800 truncate">{user.name}</span>
            <span className="text-xs text-slate-400 font-mono">EMP-{user.id.slice(0, 5)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (user: User) => (
        <div className="flex flex-col">
          <span className="text-sm text-slate-700">{user.email}</span>
          <span className="text-xs text-slate-400 font-mono">{user.phone}</span>
        </div>
      ),
    },
    {
      key: 'station',
      header: 'Station',
      render: (_user: User) => (
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-600">Main Store #04</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
          {user.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: User) => (
        <StatusBadge
          status={user.status}
          variant={user.status === 'active' ? 'success' : 'neutral'}
          dot
          size="sm"
        />
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (user: User) => (
        <span className="text-xs text-slate-500 font-medium">
          {formatDate(user.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (user: User) => (
        <div className="flex items-center justify-end gap-0.5">
          <button
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
            title="View details"
            onClick={() => console.log('View', user.id)}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
            title="Edit"
            onClick={() => openEditModal(user)}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
            title="Delete"
            onClick={() => handleDeleteUser(user.id)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const activeUsers = users.filter((u) => u.status === 'active').length;
  const inactiveUsers = users.filter((u) => u.status === 'inactive').length;

  return (
    <DashboardLayout title="OPS HUB" subtitle="Users">
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <section className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold text-slate-800">User Management</h1>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-mono font-bold">
                {totalUsers} ACCOUNTS
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage system access, credentials, store associates, and admin accounts.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <ActionButton variant="secondary" icon={Download} size="md">
              Export
            </ActionButton>
            <ActionButton variant="primary" icon={UserPlus} onClick={() => setIsCreateModalOpen(true)}>
              Add User
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
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          >
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {activeUsers} Active
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 font-semibold">
                3 Pending
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 font-semibold">
                {inactiveUsers} Suspended
              </span>
            </div>
          </StatsCard>

          <StatsCard
            title="Role Profiles"
            value="5 Active Profiles"
            icon={ShieldCheck}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          >
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {['Admin', 'Manager', 'Cashier', 'Inventory', 'Dispatch'].map((r) => (
                <span key={r} className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {r}
                </span>
              ))}
            </div>
          </StatsCard>

          <StatsCard
            title="Active Sessions"
            value="14"
            icon={Monitor}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          >
            <div className="flex items-center gap-1.5 text-xs pt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-700">Live On-Shift</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 text-xs mt-1.5">
              <span>4 Hardware POS</span>
              <span className="font-mono font-semibold text-slate-600">10 Handheld</span>
            </div>
          </StatsCard>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Filters Toolbar */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2.5 flex-wrap">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name, email, or employee ID…"
                className="flex-1 min-w-[200px] max-w-sm"
              />
              <FilterSelect
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'admin', label: 'Administrator' },
                  { value: 'buyer', label: 'Buyer/Customer' },
                  { value: 'delivery', label: 'Delivery Partner' },
                  { value: 'supervisor', label: 'Supervisor' },
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
              {selectedRows.size > 0 && (
                <span className="text-xs text-slate-500 font-medium">
                  {selectedRows.size} selected
                </span>
              )}
              <button className="h-9 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-sm">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                Columns
              </button>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <div className="p-12">
              <LoadingSpinner size="lg" text="Loading users…" />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="Try adjusting your search or filter criteria to find users."
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

          {/* Pagination footer */}
          {!loading && users.length > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-400 text-xs">
                Showing {users.length} of {totalUsers} users
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => { setIsCreateModalOpen(false); resetForm(); }}
          title="Create New User"
          subtitle="Add a new system user and assign their role."
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
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls}
                  placeholder="Jane Doe"
                />
              </FormField>
              <FormField label="Phone">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputCls}
                  placeholder="+91 98765 43210"
                />
              </FormField>
            </div>
            <FormField label="Email Address">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputCls}
                placeholder="user@example.com"
              />
            </FormField>
            <FormField label="Password">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={inputCls}
                placeholder="Enter a strong password"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Role">
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select a role</option>
                  <option value="admin">Administrator</option>
                  <option value="buyer">Buyer/Customer</option>
                  <option value="delivery">Delivery Partner</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                  }
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </div>
          </div>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); resetForm(); }}
          title="Edit User"
          subtitle={selectedUser ? `Editing account for ${selectedUser.name}` : undefined}
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
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls}
                />
              </FormField>
              <FormField label="Phone">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputCls}
                />
              </FormField>
            </div>
            <FormField label="Email Address">
              <input
                type="email"
                value={formData.email}
                className={`${inputCls} cursor-not-allowed`}
                disabled
              />
              <p className="text-xs text-slate-400">Email cannot be changed after account creation.</p>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Role">
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={inputCls}
                >
                  <option value="admin">Administrator</option>
                  <option value="buyer">Buyer/Customer</option>
                  <option value="delivery">Delivery Partner</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                  }
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
