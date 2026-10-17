import { User, Mail, Phone, ShieldCheck, Edit } from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';

export function Profile() {
  const { user } = useAuth();

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <DashboardLayout title="Store" subtitle="My Profile">
      <div className="max-w-2xl mx-auto py-2 space-y-8 text-ink">
        <div>
          <p className="shop-eyebrow">Your account</p>
          <h1 className="shop-title mt-2">My profile</h1>
          <p className="shop-subtitle mt-2">Manage your account information</p>
        </div>

        {/* Avatar & name card */}
        <div className="shop-card p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          <div className="w-20 h-20 rounded-full bg-ink text-brass-100 font-display text-2xl font-medium tracking-wide flex items-center justify-center ring-1 ring-brass-300 ring-offset-4 ring-offset-white shrink-0">
            {user?.name ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h2 className="font-display text-2xl font-medium tracking-tight text-ink break-words">{user?.name ?? '—'}</h2>
            <p className="text-sm text-stone-500 mt-1 break-all">{user?.email ?? '—'}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
              <span className="inline-flex items-center rounded-full border border-brass-100 bg-brass-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brass-700">
                {user?.role ?? 'Buyer'}
              </span>
              {user?.isActive && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  Active account
                </span>
              )}
            </div>
          </div>
          <button className="shop-btn-outline h-10 px-5 shrink-0">
            <Edit className="w-3.5 h-3.5" aria-hidden="true" />
            Edit
          </button>
        </div>

        {/* Info fields */}
        <div className="shop-card">
          <div className="shop-card-header">
            <h2 className="shop-heading text-lg">Account information</h2>
          </div>
          <dl className="px-6 divide-y divide-ivory-200">
            {[
              { icon: User, label: 'Full Name', value: user?.name ?? '—' },
              { icon: Mail, label: 'Email Address', value: user?.email ?? '—' },
              { icon: Phone, label: 'Phone', value: user?.phone ?? 'Not provided' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-ivory-100 border border-ivory-200 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-brass-600" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <dt className="text-[11px] text-stone-400 font-semibold uppercase tracking-[0.16em]">{label}</dt>
                  <dd className="text-sm text-ink font-medium mt-0.5 truncate">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-brass-100 bg-brass-50 px-5 py-4 sm:px-6">
          <p className="font-display font-medium text-ink">Profile editing coming soon</p>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Full profile update, password change, and account management will be available shortly.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
