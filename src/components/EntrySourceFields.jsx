import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fetchUsers } from '@/lib/data';
import { shortDate } from '@/lib/format';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export const ENTRY_SOURCES = ['Self-Entered', 'Apprentice-Logged', 'Assisted Call', 'Assisted WhatsApp'];

// Shared entry-source control: how this record got into the app, who logged it,
// and (for assisted entries) which Assisted Call it belongs to.
// Expects/returns { entry_log, logged_by, assisted_call_id } via onChange(patch).
export default function EntrySourceFields({ value, onChange }) {
  const [users, setUsers] = useState([]);
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => setUsers([]));
    base44.entities.AssistedCallLog.list('-date', 100).then(setCalls).catch(() => setCalls([]));
  }, []);

  const notSelf = value.entry_log && value.entry_log !== 'Self-Entered';
  const assisted = value.entry_log === 'Assisted Call' || value.entry_log === 'Assisted WhatsApp';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <Label>Entry Source</Label>
        <Select
          value={value.entry_log || 'Self-Entered'}
          onValueChange={v => onChange(v === 'Self-Entered' ? { entry_log: v, logged_by: '', assisted_call_id: '' } : { entry_log: v })}
        >
          <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{ENTRY_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {notSelf && (
        <div>
          <Label>Logged By</Label>
          <Select value={value.logged_by || undefined} onValueChange={v => onChange({ logged_by: v })}>
            <SelectTrigger className="rounded-sm"><SelectValue placeholder="Who entered it" /></SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.full_name || u.email}>{u.full_name || u.email}</SelectItem>)}
              <SelectItem value="Sewsiness Assisted">Sewsiness Assisted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {assisted && (
        <div>
          <Label>Assisted Call</Label>
          <Select value={value.assisted_call_id || undefined} onValueChange={v => onChange({ assisted_call_id: v === 'none' ? '' : v })}>
            <SelectTrigger className="rounded-sm"><SelectValue placeholder="Link to a call (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not linked</SelectItem>
              {calls.map(c => <SelectItem key={c.id} value={c.id}>{shortDate(c.date)} · {c.agent_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// Turns form fields into the entry fields to store on a record.
export function entryFields(value) {
  return {
    entry_log: value.entry_log || 'Self-Entered',
    ...(value.logged_by ? { logged_by: value.logged_by } : {}),
    ...(value.assisted_call_id ? { assisted_call_id: value.assisted_call_id } : {}),
  };
}