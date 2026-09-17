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
import { debtService } from '../../services';
import type { Debt, RecordPaymentPayload } from '../../services/debt.service';

export function DebtManagement() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentData, setPaymentData] = useState<{
    amount: string;
    paymentMethod: string;
    notes: string;
  }>({
    amount: '',
    paymentMethod: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    try {
      setLoading(true);
      const data = await debtService.getAllDebts();
      setDebts(data);
    } catch (error) {
      console.error('Failed to load debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDebts = debts.filter((debt) => {
    const matchesSearch =
      debt.creditorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || debt.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!paymentData.amount || Number(paymentData.amount) <= 0) {
      errors.amount = 'Payment amount must be greater than 0';
    }
    if (selectedDebt && Number(paymentData.amount) > selectedDebt.remainingAmount) {
      errors.amount = 'Payment amount cannot exceed remaining amount';
    }
    if (!paymentData.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRecordPayment = async () => {
    if (!selectedDebt || !validateForm()) return;

    try {
      setSubmitting(true);
      const payload: RecordPaymentPayload = {
        debtId: selectedDebt.id,
        amount: Number(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        notes: paymentData.notes,
      };
      const updated = await debtService.recordPayment(payload);
      setDebts(debts.map((d) => (d.id === updated.id ? updated : d)));
      setIsPaymentModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to record payment:', error);
      setFormErrors({ submit: 'Failed to record payment. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentData({
      amount: debt.remainingAmount.toString(),
      paymentMethod: '',
      notes: '',
    });
    setFormErrors({});
    setIsPaymentModalOpen(true);
  };

  const resetForm = () => {
    setPaymentData({
      amount: '',
      paymentMethod: '',
      notes: '',
    });
    setFormErrors({});
    setSelectedDebt(null);
  };

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'pending':
        return { status: 'warning' as const, label: 'Pending' };
      case 'partially_paid':
        return { status: 'info' as const, label: 'Partially Paid' };
      case 'overdue':
        return { status: 'danger' as const, label: 'Overdue' };
      case 'cleared':
        return { status: 'success' as const, label: 'Cleared' };
      default:
        return { status: 'neutral' as const, label: status };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <StatusBadge status="danger" label="High" />;
      case 'medium':
        return <StatusBadge status="warning" label="Medium" />;
      case 'low':
        return <StatusBadge status="neutral" label="Low" />;
      default:
        return null;
    }
  };

  const columns = [
    {
      key: 'select',
      label: '',
      render: (debt: Debt) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      key: 'ref',
      label: 'REF',
      render: (debt: Debt) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{debt.referenceNumber || 'N/A'}</div>
          <div className="text-gray-500">{debt.invoiceNumber || ''}</div>
        </div>
      ),
    },
    {
      key: 'creditor',
      label: 'PAYABLE TO',
      render: (debt: Debt) => (
        <div>
          <div className="font-medium text-gray-900">{debt.creditorName}</div>
          <div className="text-sm text-gray-500">{debt.description || 'No description'}</div>
        </div>
      ),
    },
    {
      key: 'original',
      label: 'ORIGINAL',
      render: (debt: Debt) => (
        <div className="font-semibold text-gray-900">₹{debt.originalAmount.toFixed(2)}</div>
      ),
    },
    {
      key: 'paid',
      label: 'PAID',
      render: (debt: Debt) => (
        <div className="text-sm">
          <div className="font-medium text-green-600">₹{debt.paidAmount.toFixed(2)}</div>
          {debt.originalAmount > 0 && (
            <div className="text-gray-500">
              {((debt.paidAmount / debt.originalAmount) * 100).toFixed(0)}%
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'balance',
      label: 'DUE/BALANCE',
      render: (debt: Debt) => (
        <div>
          <div className="font-semibold text-red-600">₹{debt.remainingAmount.toFixed(2)}</div>
          {debt.status === 'overdue' && (
            <div className="text-xs text-red-600 font-medium">OVERDUE</div>
          )}
        </div>
      ),
    },
    {
      key: 'dueDate',
      label: 'DUE DATE (EST.)',
      render: (debt: Debt) => (
        <div className="text-sm text-gray-700">
          {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : 'Not set'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (debt: Debt) => {
        const { status, label } = getStatusBadgeProps(debt.status);
        return <StatusBadge status={status} label={label} />;
      },
    },
    {
      key: 'priority',
      label: 'PRIORITY',
      render: (debt: Debt) => getPriorityBadge(debt.priority),
    },
    {
      key: 'actions',
      label: '',
      render: (debt: Debt) => (
        <div className="flex items-center justify-end gap-2">
          {debt.status !== 'cleared' && (
            <ActionButton variant="primary" size="sm" onClick={() => openPaymentModal(debt)}>
              Pay
            </ActionButton>
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

  const totalOutstanding = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalSettledAmount = debts
    .filter((d) => d.status === 'cleared')
    .reduce((sum, d) => sum + d.originalAmount, 0);
  const overdueAccounts = debts.filter((d) => d.status === 'overdue').length;
  const clearanceRate = debts.length > 0
    ? ((debts.filter((d) => d.status === 'cleared').length / debts.length) * 100).toFixed(1)
    : '0';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Pending Debts & Supplier Payables"
          description="Track outstanding payables to suppliers and manage payment commitments"
        >
          <div className="flex gap-3">
            <ActionButton variant="secondary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export Report
            </ActionButton>
            <ActionButton variant="primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record Payment
            </ActionButton>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <StatsCard
            title="OUTSTANDING TOTAL"
            value={`₹${(totalOutstanding / 1000).toFixed(1)}k`}
            subtitle={`₹${totalOutstanding.toFixed(2)} total negative`}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            trend="down"
            trendValue="-₹5k"
          />
          <StatsCard
            title="SETTLED AND FTD"
            value={`₹${(totalSettledAmount / 1000).toFixed(1)}k`}
            subtitle="Full settlements • None"
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
            trendValue="+12%"
          />
          <StatsCard
            title="OVERDUE ACCOUNTS"
            value={overdueAccounts.toString()}
            subtitle="Invoices past due"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            trend="neutral"
          />
          <StatsCard
            title="CLEARANCE RATE TO MONTH"
            value={`${clearanceRate}%`}
            subtitle="bills cleared this period"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            }
            trend="up"
            trendValue="+8%"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
            <div className="flex-1 max-w-md">
              <SearchBar
                placeholder="Filter by creditor, invoice number..."
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
                { value: 'partially_paid', label: 'Partially Paid' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'cleared', label: 'Cleared' },
              ]}
            />
            <FilterSelect
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'high', label: 'High Priority' },
                { value: 'medium', label: 'Medium Priority' },
                { value: 'low', label: 'Low Priority' },
              ]}
            />
          </div>
        </div>

        {/* Debts Table */}
        {filteredDebts.length === 0 ? (
          <EmptyState
            title="No debts found"
            description={
              searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No outstanding debts or payables at this time'
            }
          />
        ) : (
          <DataTable columns={columns} data={filteredDebts} />
        )}

        {/* Record Payment Modal */}
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title="Record Payment"
          size="medium"
        >
          <div className="space-y-4">
            {selectedDebt && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Creditor:</span>
                  <span className="font-medium text-gray-900">{selectedDebt.creditorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Original Amount:</span>
                  <span className="text-sm text-gray-900">₹{selectedDebt.originalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Paid So Far:</span>
                  <span className="text-sm text-green-600">₹{selectedDebt.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold text-gray-900">Remaining Balance:</span>
                  <span className="font-semibold text-red-600">
                    ₹{selectedDebt.remainingAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedDebt?.remainingAmount}
                  value={paymentData.amount}
                  onChange={(e) => {
                    setPaymentData({ ...paymentData, amount: e.target.value });
                    if (formErrors.amount) setFormErrors({ ...formErrors, amount: '' });
                  }}
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {formErrors.amount && <p className="mt-1 text-sm text-red-500">{formErrors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentData.paymentMethod}
                onChange={(e) => {
                  setPaymentData({ ...paymentData, paymentMethod: e.target.value });
                  if (formErrors.paymentMethod)
                    setFormErrors({ ...formErrors, paymentMethod: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select payment method</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="credit_card">Credit Card</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
              {formErrors.paymentMethod && (
                <p className="mt-1 text-sm text-red-500">{formErrors.paymentMethod}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                rows={3}
                placeholder="Add payment notes or reference..."
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
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </ActionButton>
              <ActionButton variant="primary" onClick={handleRecordPayment} disabled={submitting}>
                {submitting ? 'Recording...' : 'Record Payment'}
              </ActionButton>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
