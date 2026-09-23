import { MapPin, Plus } from 'lucide-react';
import { DashboardLayout } from '../../components/layout';

export function Addresses() {
  return (
    <DashboardLayout title="Store" subtitle="Addresses">
      <div className="max-w-2xl mx-auto py-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Delivery Addresses</h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage your saved delivery locations</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700 mb-1">No addresses saved</h2>
          <p className="text-sm text-slate-400 max-w-xs mb-6">
            Add your business delivery address to speed up checkout.
          </p>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add First Address
          </button>
        </div>

        {/* Address fields guide */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-700 mb-3">Address fields</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {['Contact Name', 'Phone Number', 'Address Line', 'Area / Locality', 'City', 'State', 'Postal Code', 'Landmark (Optional)'].map((field) => (
              <div key={field} className="flex items-center gap-2 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="text-xs text-slate-600">{field}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800 text-sm">Address management coming soon</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Save, edit, and set default delivery addresses will be available shortly.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
