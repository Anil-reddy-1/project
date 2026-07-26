'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Import wholesaler tracking page dynamically (reuse same component)
const LiveTrackingPage = dynamic(
  () => import('@/app/(wholesaler)/wholesaler/live-tracking/page'),
  { ssr: false }
);

export default function AdminLiveTrackingPage() {
  return <LiveTrackingPage />;
}
