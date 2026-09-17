import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ShoppingCart, Package, History, CreditCard, TrendingUp, HeadphonesIcon } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-headline-xl font-semibold">Buyer Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="font-medium text-foreground">{user?.name || user?.email}</span>. Manage your orders and purchases.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buyerMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-headline-sm">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
