import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import FreelancerDialog from '@/components/freelancers/FreelancerDialog';
import JobDialog from '@/components/freelancers/JobDialog';

const JOB_STATUSES = ['Commissioned', 'In Progress', 'Delivered', 'Paid'];

export default function Freelancers() {
  const [freelancers, setFreelancers] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [freelancerDialog, setFreelancerDialog] = useState(false);
  const [jobDialogFor, setJobDialogFor] = useState(null);

  const load = () => {
    base44.entities.Freelancer.list('-created_date', 200).then(setFreelancers).catch(console.error);
    base44.entities.FreelancerJob.list('-created_date', 500).then(setJobs).catch(console.error);
    base44.entities.Order.list('-order_date', 200).then(setOrders).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const orderMap = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);

  const addFreelancer = async (data) => {
    await base44.entities.Freelancer.create(data);
    setFreelancerDialog(false);
    load();
  };
  const addJob = async (data) => {
    await base44.entities.FreelancerJob.create(data);
    setJobDialogFor(null);
    load();
  };
  const advance = async (job) => {
    const i = JOB_STATUSES.indexOf(job.status);
    if (i < 0 || i >= JOB_STATUSES.length - 1) return;
    await base44.entities.FreelancerJob.update(job.id, { status: JOB_STATUSES[i + 1] });
    load();
  };

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2">External Specialists</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(32px, 5vw, 44px)' }}>Freelancers</h1>
          <p className="text-sm text-stone-500 mt-2">Beaders, embroiderers and pattern cutters you commission per order. Tap a status to move a job along.</p>
        </div>
        <Button onClick={() => setFreelancerDialog(true)} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5 self-start md:self-auto"><Plus className="w-4 h-4" /> Add Freelancer</Button>
      </div>

      {freelancers === null ? (
        <p className="text-stone-400 text-sm">Loading freelancers…</p>
      ) : freelancers.length === 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-10 text-center">
          <p className="text-sm text-stone-400">No freelancers yet — add the specialists you commission for beading, embroidery and more.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {freelancers.map(f => {
            const myJobs = jobs.filter(j => j.freelancer_id === f.id);
            const openJobs = myJobs.filter(j => j.status !== 'Paid');
            const totalValue = myJobs.reduce((s, j) => s + (Number(j.cost) || 0), 0);
            return (
              <div key={f.id} className="bg-white border border-[#E7E5E4] rounded-sm">
                <div className="p-4 md:p-5 border-b border-[#E7E5E4] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-sm font-semibold text-[#800020] shrink-0">
                    {(f.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1917]">{f.name}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5 truncate">{[f.specialty, f.phone].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={() => setJobDialogFor(f)}><Plus className="w-3.5 h-3.5" /> Job</Button>
                </div>
                <div className="grid grid-cols-2 border-b border-[#E7E5E4]">
                  <div className="px-4 md:px-5 py-3 border-r border-[#E7E5E4]">
                    <div className="font-display text-xl font-semibold text-[#1C1917] leading-none">{openJobs.length}</div>
                    <div className="text-[10px] text-stone-400 mt-1.5">open job{openJobs.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="px-4 md:px-5 py-3">
                    <div className="font-display text-xl font-semibold text-[#800020] leading-none">{formatCurrency(totalValue)}</div>
                    <div className="text-[10px] text-stone-400 mt-1.5">commissioned value</div>
                  </div>
                </div>
                <div className="px-4 md:px-5 py-2">
                  {myJobs.length === 0 ? (
                    <p className="text-xs text-stone-400 py-3 text-center">No jobs commissioned yet.</p>
                  ) : myJobs.slice(0, 4).map(j => {
                    const order = j.order_id ? orderMap.get(j.order_id) : null;
                    return (
                      <div key={j.id} className="flex items-center gap-3 py-2.5 border-b border-[#F3F1EF] last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1C1917] truncate">{j.task_description}</p>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            {formatCurrency(j.cost)}{j.due_date ? ` · due ${formatDate(j.due_date)}` : ''}
                            {order && <> · <Link to={`/orders/${order.id}`} className="text-[#800020] hover:underline inline-flex items-center gap-0.5">{(order.garment_design || 'Order').slice(0, 24)}<ChevronRight className="w-3 h-3" /></Link></>}
                          </p>
                        </div>
                        <button onClick={() => advance(j)} title={j.status !== 'Paid' ? `Mark ${JOB_STATUSES[JOB_STATUSES.indexOf(j.status) + 1]}` : 'Paid'} className="shrink-0 disabled:cursor-default" disabled={j.status === 'Paid'}>
                          <StatusBadge status={j.status} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FreelancerDialog open={freelancerDialog} onClose={() => setFreelancerDialog(false)} onSave={addFreelancer} />
      {jobDialogFor && <JobDialog freelancer={jobDialogFor} orders={orders} open onClose={() => setJobDialogFor(null)} onSave={addJob} />}
    </div>
  );
}