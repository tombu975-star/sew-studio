import React, { useState } from 'react';
import { Plus, CalendarClock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import AppointmentDialog from '@/components/customer/AppointmentDialog';

const ATTENDANCE = ['Scheduled', 'Attended', 'Cancelled', 'Rescheduled', 'No-show'];

export default function AppointmentsTab({ appointments, customerId, users, uMap, orders, onReload }) {
  const [open, setOpen] = useState(false);

  const updateAttendance = async (id, attendance) => {
    await base44.entities.Appointment.update(id, { attendance });
    onReload();
  };

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2"><CalendarClock className="w-3.5 h-3.5" /> Appointments</h3>
        <Button size="sm" className="gap-1.5 rounded-sm bg-[#800020] hover:bg-[#6b0018] text-white" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> New</Button>
      </div>
      <div className="p-5">
        {appointments.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No appointments scheduled.</p> : (
          <div className="divide-y divide-[#E7E5E4]">
            {appointments.map(a => (
              <div key={a.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#1C1917]">{a.type} · {formatDate(a.date)}{a.time ? ` at ${a.time}` : ''}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{a.location || 'No location'}{a.staff_id && uMap[a.staff_id] ? ` · ${uMap[a.staff_id].full_name || uMap[a.staff_id].email}` : ''}</p>
                  {a.purpose && <p className="text-xs text-stone-500 mt-1">{a.purpose}</p>}
                </div>
                <Select value={a.attendance} onValueChange={v => updateAttendance(a.id, v)}>
                  <SelectTrigger className="rounded-sm h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ATTENDANCE.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
      <AppointmentDialog open={open} onOpenChange={setOpen} customerId={customerId} users={users} orders={orders} onSaved={onReload} />
    </div>
  );
}