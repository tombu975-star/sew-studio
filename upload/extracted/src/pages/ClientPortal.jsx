import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PortalOrder from '@/components/portal/PortalOrder';
import PortalPolicies from '@/components/portal/PortalPolicies';

export default function ClientPortal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    base44.functions.invoke('clientPortal', { token })
      .then(res => setData(res.data))
      .catch(() => setFailed(true));
  }, [token]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FBF9F7' }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full border border-[#800020] flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-[#800020]" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-[#1C1917] leading-none">Madam's Studio</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mt-1">Client Portal</p>
          </div>
        </div>

        {failed ? (
          <div className="bg-white border border-[#E7E5E4] rounded-sm p-8 text-center">
            <p className="text-sm text-stone-500">This link isn't valid — please contact the studio for a fresh one.</p>
          </div>
        ) : !data ? (
          <div className="bg-white border border-[#E7E5E4] rounded-sm p-8 text-center">
            <p className="text-sm text-stone-400">Loading your orders…</p>
          </div>
        ) : (
          <>
            <h1 className="font-display font-semibold text-[#1C1917] mb-1" style={{ fontSize: 'clamp(28px, 5vw, 38px)' }}>Hello {data.name}</h1>
            <p className="text-sm text-stone-500 mb-6">Here's where your orders stand — the studio updates this automatically, so no need to chase anyone.</p>
            {data.orders.length === 0 ? (
              <div className="bg-white border border-[#E7E5E4] rounded-sm p-8 text-center">
                <p className="text-sm text-stone-400">No orders yet — they'll appear here as soon as the studio starts one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.orders.map((o, i) => <PortalOrder key={i} order={o} />)}
              </div>
            )}
            <PortalPolicies policy={data.policy} />
          </>
        )}
      </div>
    </div>
  );
}