import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout';
import { Package, ArrowRight } from 'lucide-react';

/**
 * Legacy Stock Management Page
 * This page has been replaced by Product Management
 * Redirects users to the new page
 */
export function StockManagement() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/admin/products');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleRedirect = () => {
    navigate('/admin/products');
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full mx-auto text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Stock Management Has Moved!
            </h2>
            
            <p className="text-gray-700 mb-6">
              This page has been replaced by the new <strong>Product Management</strong> system
              with enhanced features including:
            </p>

            <div className="bg-white rounded-lg p-6 mb-6 text-left">
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Multi-image upload with drag-and-drop</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Advanced filtering and search</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Category tags and organization</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Low stock alerts and statistics</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Bulk operations and CSV export</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Improved UI and performance</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              You will be redirected automatically in <strong>3 seconds</strong>...
            </p>

            <button
              onClick={handleRedirect}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Package className="w-5 h-5" />
              Go to Product Management Now
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
