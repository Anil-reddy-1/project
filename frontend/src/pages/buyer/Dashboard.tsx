import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, Package, History, CreditCard, TrendingUp, HeadphonesIcon, ArrowRight } from 'lucide-react';

const buyerMenuItems = [
  { title: 'My Orders', description: 'View and track your purchase orders', icon: ShoppingCart },
  { title: 'Products', description: 'Browse available products and catalog', icon: Package },
  { title: 'Order History', description: 'Review past orders and invoices', icon: History },
  { title: 'Payments', description: 'Manage payment methods and invoices', icon: CreditCard },
  { title: 'Analytics', description: 'View purchase trends and insights', icon: TrendingUp },
  { title: 'Support', description: 'Contact support and get help', icon: HeadphonesIcon },
];

export function BuyerDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <Navbar />
      <main className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12 max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="shop-eyebrow">Your account</p>
          <h1 className="shop-title mt-2">Buyer dashboard</h1>
          <p className="shop-subtitle mt-2">
            Welcome back, <span className="font-medium text-ink">{user?.name || user?.email}</span>. Manage your orders and purchases.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buyerMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="shop-card group cursor-pointer p-6 transition-[border-color,box-shadow] duration-300 hover:border-ivory-300 hover:shadow-[0_6px_20px_rgba(20,33,61,0.06)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ivory-200 bg-ivory-100 transition-colors group-hover:border-brass-300">
                    <Icon className="h-5 w-5 text-brass-600" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h2 className="shop-heading text-lg flex-1">{item.title}</h2>
                  <ArrowRight className="h-4 w-4 text-stone-400 transition-all group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
                </div>
                <p className="shop-subtitle mt-3">{item.description}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
