import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Truck, MapPin, CheckCircle, Clock, Star, Phone } from 'lucide-react';

const deliveryMenuItems = [
  { title: 'Active Deliveries', description: 'View and manage your ongoing deliveries', icon: Truck },
  { title: 'Route Map', description: 'Navigate and track your delivery routes', icon: MapPin },
  { title: 'Completed', description: 'History of completed delivery assignments', icon: CheckCircle },
  { title: 'Schedule', description: 'View your upcoming delivery schedule', icon: Clock },
  { title: 'Performance', description: 'Track your delivery ratings and metrics', icon: Star },
  { title: 'Contact', description: 'Get help or contact your dispatcher', icon: Phone },
];

export function DeliveryDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-headline-xl font-semibold">Delivery Partner Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="font-medium text-foreground">{user?.name || user?.email}</span>. Manage your deliveries and availability.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deliveryMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
                    <Icon className="h-5 w-5 text-warning-600" />
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
