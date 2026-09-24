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
import { reportService } from '../../services';
import type { Report, GenerateReportPayload } from '../../services/report.service';

export function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [reportData, setReportData] = useState<{
    reportType: string;
    startDate: string;
    endDate: string;
    format: string;
  }>({
    reportType: '',
    startDate: '',
    endDate: '',
    format: 'pdf',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await reportService.getAllReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = reportTypeFilter === 'all' || report.type === reportTypeFilter;
    return matchesSearch && matchesType;
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!reportData.reportType) {
      errors.reportType = 'Report type is required';
    }
    if (!reportData.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!reportData.endDate) {
      errors.endDate = 'End date is required';
    }
    if (reportData.startDate && reportData.endDate && reportData.startDate > reportData.endDate) {
      errors.endDate = 'End date must be after start date';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateReport = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: GenerateReportPayload = {
        type: reportData.reportType,
        startDate: reportData.startDate,
        endDate: reportData.endDate,
        format: reportData.format,
      };
      const newReport = await reportService.generateReport(payload);
      setReports([newReport, ...reports]);
      setIsGenerateModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to generate report:', error);
      setFormErrors({ submit: 'Failed to generate report. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      await reportService.downloadReport(reportId);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const openGenerateModal = () => {
    resetForm();
    setIsGenerateModalOpen(true);
  };

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    setReportData({
      reportType: '',
      startDate: thirtyDaysAgo,
      endDate: today,
      format: 'pdf',
    });
    setFormErrors({});
  };

  const columns = [
    {
      key: 'title',
      label: 'REPORT NAME',
      render: (report: Report) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <div className="font-medium text-gray-900">{report.title}</div>
            <div className="text-sm text-gray-500">{report.description || 'Business report'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'TYPE',
      render: (report: Report) => (
        <StatusBadge
          status="info"
          label={report.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        />
      ),
    },
    {
      key: 'period',
      label: 'PERIOD',
      render: (report: Report) => (
        <div className="text-sm text-gray-700">
          {new Date(report.startDate).toLocaleDateString()} -{' '}
          {new Date(report.endDate).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'generated',
      label: 'GENERATED',
      render: (report: Report) => (
        <div className="text-sm text-gray-700">
          {new Date(report.generatedAt).toLocaleString()}
        </div>
      ),
    },
    {
      key: 'size',
      label: 'SIZE',
      render: (report: Report) => (
        <div className="text-sm text-gray-700">{report.fileSize || 'N/A'}</div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (report: Report) => {
        if (report.status === 'completed') {
          return <StatusBadge status="success" label="Ready" />;
        } else if (report.status === 'processing') {
          return <StatusBadge status="warning" label="Processing" />;
        } else if (report.status === 'failed') {
          return <StatusBadge status="danger" label="Failed" />;
        }
        return <StatusBadge status="neutral" label={report.status} />;
      },
    },
    {
      key: 'actions',
      label: '',
      render: (report: Report) => (
        <div className="flex items-center justify-end gap-2">
          {report.status === 'completed' && (
            <ActionButton
              variant="primary"
              size="sm"
              onClick={() => handleDownloadReport(report.id)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
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


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Operational & Business Reports"
          description="Generate detailed analytics, export logs, and download pre-built reports"
          actions={
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
                Export CSV
              </ActionButton>
              <ActionButton variant="secondary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export Excel Ledger
              </ActionButton>
              <ActionButton variant="primary" onClick={openGenerateModal}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Print Custom Report
              </ActionButton>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <StatsCard
            title="GROSS REVENUE TALLY DB"
            value="₹12,480.50"
            subtitle="Sum total receivables • Calc"
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
            trend="up"
            trendValue="+15.2%"
          />
          <StatsCard
            title="INCOMING CHECK STOCK"
            value="₹9,850.00"
            subtitle="Merchandise value waiting fulfillment"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            }
            trend="neutral"
          />
          <StatsCard
            title="INTERNAL LIABILITIES"
            value="₹850.00"
            subtitle="Internal staff debt"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
            trend="down"
            trendValue="-5%"
          />
          <StatsCard
            title="INVENTORY CLEARING"
            value="₹42.50"
            subtitle="1 Items cleared • 33% net paid"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            }
            trend="neutral"
          />
        </div>

        {/* Report Type Quick Access */}
        <div className="grid gap-4 md:grid-cols-4">
          <ActionButton
            variant={reportTypeFilter === 'daily_operations' ? 'primary' : 'secondary'}
            onClick={() => setReportTypeFilter('daily_operations')}
            className="justify-start"
          >
            Daily Operations Report
          </ActionButton>
          <ActionButton
            variant={reportTypeFilter === 'stock_shrinkage' ? 'primary' : 'secondary'}
            onClick={() => setReportTypeFilter('stock_shrinkage')}
            className="justify-start"
          >
            Stock & Shrinkage Report
          </ActionButton>
          <ActionButton
            variant={reportTypeFilter === 'delivery_logistics' ? 'primary' : 'secondary'}
            onClick={() => setReportTypeFilter('delivery_logistics')}
            className="justify-start"
          >
            Delivery & Logistics Log
          </ActionButton>
          <ActionButton
            variant={reportTypeFilter === 'staff_performance' ? 'primary' : 'secondary'}
            onClick={() => setReportTypeFilter('staff_performance')}
            className="justify-start"
          >
            Staff Shift & Performance
          </ActionButton>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
            <div className="flex-1 max-w-md">
              <SearchBar
                placeholder="Search reports..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <FilterSelect
              value={reportTypeFilter}
              onChange={setReportTypeFilter}
              options={[
                { value: 'all', label: 'All Reports' },
                { value: 'daily_operations', label: 'Daily Operations' },
                { value: 'sales', label: 'Sales' },
                { value: 'stock', label: 'Stock' },
                { value: 'delivery', label: 'Delivery' },
                { value: 'staff', label: 'Staff' },
                { value: 'debt', label: 'Debt' },
              ]}
            />
          </div>
        </div>

        {/* Reports Table */}
        {filteredReports.length === 0 ? (
          <EmptyState
            title="No reports found"
            description={
              searchQuery || reportTypeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Generate your first report to get started'
            }
            actionLabel="Generate Report"
            onAction={openGenerateModal}
          />
        ) : (
          <DataTable columns={columns} data={filteredReports} />
        )}

        {/* Generate Report Modal */}
        <Modal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          title="Generate Custom Report"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type <span className="text-red-500">*</span>
              </label>
              <select
                value={reportData.reportType}
                onChange={(e) => {
                  setReportData({ ...reportData, reportType: e.target.value });
                  if (formErrors.reportType) setFormErrors({ ...formErrors, reportType: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.reportType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select report type</option>
                <option value="daily_operations">Daily Operations Report</option>
                <option value="sales">Sales Report</option>
                <option value="stock">Stock & Inventory Report</option>
                <option value="delivery">Delivery & Logistics Report</option>
                <option value="staff">Staff Performance Report</option>
                <option value="debt">Debt & Payables Report</option>
                <option value="financial">Financial Summary Report</option>
              </select>
              {formErrors.reportType && (
                <p className="mt-1 text-sm text-red-500">{formErrors.reportType}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={reportData.startDate}
                  onChange={(e) => {
                    setReportData({ ...reportData, startDate: e.target.value });
                    if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: '' });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.startDate && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={reportData.endDate}
                  onChange={(e) => {
                    setReportData({ ...reportData, endDate: e.target.value });
                    if (formErrors.endDate) setFormErrors({ ...formErrors, endDate: '' });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.endDate && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.endDate}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
              <select
                value={reportData.format}
                onChange={(e) => setReportData({ ...reportData, format: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pdf">PDF Document</option>
                <option value="excel">Excel Spreadsheet</option>
                <option value="csv">CSV File</option>
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
                onClick={() => setIsGenerateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </ActionButton>
              <ActionButton variant="primary" onClick={handleGenerateReport} disabled={submitting}>
                {submitting ? 'Generating...' : 'Generate Report'}
              </ActionButton>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
