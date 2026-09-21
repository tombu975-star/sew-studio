import React, { useEffect, useState } from 'react';
import { Download, Database } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { EXPORT_GROUPS, ALL_EXPORT_ENTITIES, EXPORT_LABELS, toCSV, downloadFile, exportFilename } from '@/lib/exportData';

export default function DataHandoff() {
  const [counts, setCounts] = useState(null);
  const [busy, setBusy] = useState(null);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    Promise.all(ALL_EXPORT_ENTITIES.map(k => base44.entities[k].list('-created_date', 10000).catch(() => [])))
      .then(lists => setCounts(Object.fromEntries(ALL_EXPORT_ENTITIES.map((k, i) => [k, lists[i].length]))))
      .catch(console.error);
  }, []);

  const downloadCsv = async (key) => {
    setBusy(key);
    try {
      const rows = await base44.entities[key].list('-created_date', 10000).catch(() => []);
      downloadFile(`${exportFilename(key)}.csv`, toCSV(rows));
    } finally {
      setBusy(null);
    }
  };

  const downloadBackup = async () => {
    setBackingUp(true);
    try {
      const backup = {};
      for (const key of ALL_EXPORT_ENTITIES) {
        backup[key] = await base44.entities[key].list('-created_date', 10000).catch(() => []);
      }
      downloadFile(
        `madams-studio-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify({ exported_at: new Date().toISOString(), studio: "Madam's Studio", data: backup }, null, 2),
        'application/json'
      );
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><Database className="w-3.5 h-3.5" />Your records, your property</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>Data Handoff</h1>
          <p className="text-sm text-stone-500 mt-2 max-w-xl leading-relaxed">
            Everything the studio has recorded can be taken with you — every client, order, measurement, and cedi — as spreadsheets that open in Excel or Google Sheets, or as one complete backup file.
          </p>
        </div>
        <Button onClick={downloadBackup} disabled={backingUp} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm gap-1.5 self-start md:self-auto shrink-0">
          <Download className="w-4 h-4" /> {backingUp ? 'Preparing…' : 'Full backup (JSON)'}
        </Button>
      </div>

      {EXPORT_GROUPS.map(group => (
        <div key={group.title} className="mb-4 md:mb-5">
          <AtelierCard title={group.title}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.entities.map(key => (
                <div key={key} className="flex items-center justify-between gap-3 border border-[#E7E5E4] rounded-sm px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">{EXPORT_LABELS[key] || key}</p>
                    <p className="text-[11px] text-stone-400">{counts === null ? '…' : `${counts[key] ?? 0} record${(counts[key] ?? 0) === 1 ? '' : 's'}`}</p>
                  </div>
                  <Button
                    onClick={() => downloadCsv(key)}
                    disabled={busy === key}
                    variant="outline"
                    className="rounded-sm h-7 px-2.5 text-[11px] gap-1 shrink-0"
                  >
                    <Download className="w-3 h-3" /> {busy === key ? '…' : 'CSV'}
                  </Button>
                </div>
              ))}
            </div>
          </AtelierCard>
        </div>
      ))}

      <p className="text-[11px] text-stone-400 leading-relaxed max-w-xl">
        Exports are generated on demand from today's records and downloaded straight to your device — nothing is emailed or stored elsewhere.
      </p>
    </div>
  );
}