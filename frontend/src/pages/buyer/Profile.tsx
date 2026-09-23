import { User, Mail, Phone, ShieldCheck, Edit } from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';

export function Profile() {
  const { user } = useAuth();

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <DashboardLayout title="Store" subtitle="My Profile">
      <div className="max-w-2xl mx-auto py-2 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage your account information</p>
        </div>

        {/* Avatar & name card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white text-2xl font-black flex items-center justify-center shadow-md shrink-0">
            {user?.name ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-800">{user?.name ?? '—'}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{user?.email ?? '—'}</p>
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 capitalize">
                {user?.role ?? 'Buyer'}
              </span>
              {user?.isActive && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                  <ShieldCheck className="w-3 h-3" />
                  Active Account
                </span>
              )}
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0">
            <Edit className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>

        {/* Info fields */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <p className="text-sm font-semibold text-slate-700 mb-4">Account Information</p>
          {[
            { icon: User, label: 'Full Name', value: user?.name ?? '—' },
            { icon: Mail, label: 'Email Address', value: user?.email ?? '—' },
            { icon: Phone, label: 'Phone', value: user?.phone ?? 'Not provided' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                <p className="text-sm text-slate-700 font-medium mt-0.5 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800 text-sm">Profile editing coming soon</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Full profile update, password change, and account management will be available shortly.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
