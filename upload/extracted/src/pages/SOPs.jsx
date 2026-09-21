import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchUsers } from '@/lib/data';
import { useRole } from '@/lib/roles';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AllSOPsTab from '@/components/sop/AllSOPsTab';
import MySOPsTab from '@/components/sop/MySOPsTab';
import TeamComplianceTab from '@/components/sop/TeamComplianceTab';
import ExceptionsTab from '@/components/sop/ExceptionsTab';
import InsightsRecommendationsTab from '@/components/sop/InsightsRecommendationsTab';

export default function SOPs() {
  const { role, user: currentUser, isTrainer } = useRole();
  const canManage = role === 'madam' || isTrainer;
  const [sops, setSops] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    base44.entities.SOP.list('-created_date', 300).then(setSops).catch(() => setSops([]));
    base44.entities.SOPAssignment.list('-created_date', 500).then(setAssignments).catch(() => setAssignments([]));
    base44.entities.SOPException.list('-created_date', 300).then(setExceptions).catch(() => setExceptions([]));
    fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  if (sops === null) return <div className="p-10 text-stone-400 text-sm">Loading SOPs…</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <BookOpen className="w-5 h-5 text-[#800020]" />
        <h1 className="font-display text-2xl text-[#1C1917]">SOP Hub</h1>
      </div>

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1 mb-5 bg-transparent p-0 justify-start">
          <TabsTrigger value="library" className="text-xs">Library</TabsTrigger>
          <TabsTrigger value="mine" className="text-xs">My SOPs</TabsTrigger>
          {canManage && <TabsTrigger value="team" className="text-xs">Team & Compliance</TabsTrigger>}
          <TabsTrigger value="exceptions" className="text-xs">Exceptions & Problems</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">Insights & Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <AllSOPsTab sops={sops} setSops={setSops} canManage={canManage} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="mine">
          <MySOPsTab assignments={assignments} setAssignments={setAssignments} currentUser={currentUser} />
        </TabsContent>

        {canManage && (
          <TabsContent value="team">
            <TeamComplianceTab sops={sops} assignments={assignments} setAssignments={setAssignments} users={users} isTrainer={isTrainer && role !== 'madam'} />
          </TabsContent>
        )}

        <TabsContent value="exceptions">
          <ExceptionsTab exceptions={role === 'madam' || isTrainer ? exceptions : exceptions.filter(e => e.reported_by === currentUser?.id)} setExceptions={setExceptions} canManage={canManage} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsRecommendationsTab role={role} sops={sops} exceptions={exceptions} isTrainer={isTrainer} />
        </TabsContent>
      </Tabs>
    </div>
  );
}