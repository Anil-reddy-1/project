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
import { deliveryService } from '../../services';
import type { Delivery, AssignDeliveryPayload } from '../../services/delivery.service';

export function DeliveryManagement() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [availablePartners, setAvailablePartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<string>('all');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deliveriesData, partnersData] = await Promise.all([
        deliveryService.getAllDeliveries(),
        deliveryService.getAvailablePartners(),
      ]);
      setDeliveries(deliveriesData);
      setAvailablePartners(partnersData);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.deliveryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    const matchesType = deliveryTypeFilter === 'all' || delivery.deliveryType === deliveryTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleAssignPartner = async () => {
    if (!selectedDelivery || !selectedPartner) {
      setFormErrors({ partner: 'Please select a delivery partner' });
      return;
    }

    try {
      setSubmitting(true);
      const payload: AssignDeliveryPayload = {
        deliveryId: selectedDelivery.id,
        partnerId: selectedPartner,
      };
      const updated = await deliveryService.assignDelivery(payload);
      setDeliveries(deliveries.map((d) => (d.id === updated.id ? updated : d)));
      setIsAssignModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to assign delivery:', error);
      setFormErrors({ submit: 'Failed to assign delivery partner. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignModal = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setSelectedPartner('');
    setFormErrors({});
    setIsAssignModalOpen(true);
  };

  const resetForm = () => {
    setSelectedPartner('');
    setFormErrors({});
    setSelectedDelivery(null);
  };

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'pending':
        return { status: 'warning' as const, label: 'Pending Assignment' };
      case 'assigned':
        return { status: 'info' as const, label: 'Assigned' };
      case 'in_transit':
        return { status: 'info' as const, label: 'In Transit' };
      case 'delivered':
        return { status: 'success' as const, label: 'Completed Today' };
      case 'failed':
        return { status: 'danger' as const, label: 'Failed' };
      default:
        return { status: 'neutral' as const, label: status };
    }
  };

  const columns = [
    {
      key: 'deliveryId',
      label: 'NUMBER',
      render: (delivery: Delivery) => (
        <div className="font-mono text-sm font-medium text-gray-900">{delivery.deliveryId}</div>
      ),
    },
    {
      key: 'deliveryType',
      label: 'DELIVERY TYPE',
      render: (delivery: Delivery) => (
        <div>
          <StatusBadge
            status={delivery.deliveryType === 'Scheduled Delivery' ? 'info' : 'neutral'}
            label={delivery.deliveryType}
          />
        </div>
      ),
    },
    {
      key: 'origin',
      label: 'ORIGIN TO DESTINATION',
      render: (delivery: Delivery) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{delivery.origin || 'Store'}</div>
          <div className="text-gray-500 max-w-xs truncate">{delivery.destination}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'CARRIED PACKAGES',
      render: (delivery: Delivery) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{delivery.customerName}</div>
          <div className="text-gray-500">{delivery.packageCount || 1} package(s)</div>
        </div>
      ),
    },
    {
      key: 'partner',
      label: 'ASSIGNED DRIVER OR COURIER OP',
      render: (delivery: Delivery) => (
        <div className="flex items-center gap-2">
          {delivery.partnerName ? (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                {delivery.partnerName.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{delivery.partnerName}</div>
                <div className="text-gray-500">
                  {delivery.partnerContact || delivery.partnerPhone || 'No contact'}
                </div>
              </div>
            </>
          ) : (
            <span className="text-sm text-gray-500">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'schedule',
      label: 'DELIVERY TIMELINE',
      render: (delivery: Delivery) => (
        <div className="text-sm text-gray-700">
          {delivery.scheduledDate
            ? new Date(delivery.scheduledDate).toLocaleDateString()
            : 'Not scheduled'}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (delivery: Delivery) => (
        <div className="flex items-center justify-end gap-2">
          {(delivery.status === 'pending' || !delivery.partnerName) && (
            <ActionButton variant="primary" size="sm" onClick={() => openAssignModal(delivery)}>
              Assign
            </ActionButton>
          )}
          {delivery.status === 'assigned' && (
            <StatusBadge status="info" label="Assigned" />
          )}
          {delivery.status === 'in_transit' && (
            <StatusBadge status="warning" label="In Transit" />
          )}
          {delivery.status === 'delivered' && (
            <StatusBadge status="success" label="Delivered" />
          )}
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

  const totalDeliveries = deliveries.length;
  const pendingAssignment = deliveries.filter((d) => d.status === 'pending').length;
  const inTransit = deliveries.filter((d) => d.status === 'in_transit').length;
  const completedToday = deliveries.filter((d) => {
    if (d.status !== 'delivered') return false;
    const today = new Date().toDateString();
    const deliveredDate = d.deliveredAt ? new Date(d.deliveredAt).toDateString() : null;
    return deliveredDate === today;
  }).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Delivery Management & Dispatch Assignment"
          description="Assign drivers to orders, monitor real-time dispatch status, and track completed deliveries"
        >
          <ActionButton variant="primary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Delivery Dispatch
          </ActionButton>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <StatsCard
            title="TOTAL ACTIVE DELIVERIES"
            value={totalDeliveries.toString()}
            subtitle="All orders • route plan"
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
            trend="up"
            trendValue="+12% from yesterday"
          />
          <StatsCard
            title="PENDING ASSIGNMENT"
            value={pendingAssignment.toString()}
            subtitle="Action needed"
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
            trend="down"
            trendValue="-3 from last hour"
          />
          <StatsCard
            title="IN DELIVERY IN TRANSIT"
            value={inTransit.toString()}
            subtitle="En route"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                />
              </svg>
            }
            trend="neutral"
          />
          <StatsCard
            title="COMPLETED TODAY"
            value={completedToday.toString()}
            subtitle="Avg delivery time 118h • 25m"
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
            trendValue="+8% efficiency"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
            <div className="flex-1 max-w-md">
              <SearchBar
                placeholder="Search by ID, name, or package info..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'in_transit', label: 'In Transit' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
            <FilterSelect
              value={deliveryTypeFilter}
              onChange={setDeliveryTypeFilter}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'Scheduled Delivery', label: 'Scheduled' },
                { value: 'Express Delivery', label: 'Express' },
                { value: 'Standard Delivery', label: 'Standard' },
                { value: 'Local Delivery', label: 'Local' },
              ]}
            />
          </div>
        </div>

        {/* Deliveries Table */}
        {filteredDeliveries.length === 0 ? (
          <EmptyState
            title="No deliveries found"
            description={
              searchQuery || statusFilter !== 'all' || deliveryTypeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first delivery dispatch'
            }
          />
        ) : (
          <DataTable columns={columns} data={filteredDeliveries} />
        )}

        {/* Assign Partner Modal */}
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Assign Delivery Partner"
          size="medium"
        >
          <div className="space-y-4">
            {selectedDelivery && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delivery ID:</span>
                  <span className="font-mono text-sm font-medium text-gray-900">
                    {selectedDelivery.deliveryId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Customer:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedDelivery.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Destination:</span>
                  <span className="text-sm text-gray-700 text-right max-w-xs truncate">
                    {selectedDelivery.destination}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Delivery Partner <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPartner}
                onChange={(e) => {
                  setSelectedPartner(e.target.value);
                  if (formErrors.partner) setFormErrors({ ...formErrors, partner: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.partner ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Choose a delivery partner</option>
                {availablePartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} - {partner.phone || partner.contact}
                    {partner.activeDeliveries !== undefined &&
                      ` (${partner.activeDeliveries} active)`}
                  </option>
                ))}
              </select>
              {formErrors.partner && <p className="mt-1 text-sm text-red-500">{formErrors.partner}</p>}
            </div>

            {availablePartners.length > 0 && selectedPartner && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Partner Info:</strong>{' '}
                  {availablePartners.find((p) => p.id === selectedPartner)?.name}
                  {' - '}
                  Available for delivery
                </p>
              </div>
            )}

            {formErrors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{formErrors.submit}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <ActionButton
                variant="secondary"
                onClick={() => setIsAssignModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </ActionButton>
              <ActionButton variant="primary" onClick={handleAssignPartner} disabled={submitting}>
                {submitting ? 'Assigning...' : 'Assign Partner'}
              </ActionButton>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
