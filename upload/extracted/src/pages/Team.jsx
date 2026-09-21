import React, { useEffect, useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchUsers } from '@/lib/data';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import CommentThread from '@/components/board/CommentThread';
import MentionTextarea from '@/components/team/MentionTextarea';
import { useRole } from '@/lib/roles';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Team() {
  const { user: currentUser } = useRole();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [text, setText] = useState('');
  const [mentionedIds, setMentionedIds] = useState([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    base44.entities.TeamMessage.list('-created_date', 200).then(setMessages).catch(() => setMessages([]));
    fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const userName = (id) => users.find(u => u.id === id)?.full_name || users.find(u => u.id === id)?.email || 'Studio';

  const post = async () => {
    if (!text.trim()) return;
    setPosting(true);
    const created = await base44.entities.TeamMessage.create({
      text: text.trim(),
      author_id: currentUser?.id || null,
      mentioned_user_ids: mentionedIds,
      date: todayISO(),
    });
    setMessages(prev => [created, ...prev]);
    mentionedIds
      .filter(id => id !== currentUser?.id)
      .forEach(id => {
        base44.functions.invoke('notifyStaff', {
          kind: 'mention',
          user_id: id,
          detail: `${currentUser?.full_name || 'A studio member'} mentioned you:\n\n"${text.trim()}"`,
        }).catch(() => {});
      });
    setText('');
    setMentionedIds([]);
    setPosting(false);
  };

  const entries = messages.map(m => ({ ...m, authorName: userName(m.author_id) }));

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <MessagesSquare className="w-5 h-5 text-[#800020]" />
        <h1 className="font-display text-2xl text-[#1C1917]">Team Board</h1>
      </div>
      <AtelierCard title="Studio Messages">
        <CommentThread entries={entries} currentUserId={currentUser?.id} emptyLabel="No messages yet — say hello to the team." />
        <div className="mt-3 space-y-2.5">
          <MentionTextarea
            value={text}
            onChange={setText}
            users={users.filter(u => u.id !== currentUser?.id)}
            mentionedIds={mentionedIds}
            onMentionedChange={setMentionedIds}
            placeholder="Type a message — use @ to mention someone…"
          />
          <Button
            size="sm"
            disabled={posting || !text.trim()}
            onClick={post}
            className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm w-full h-8 text-xs"
          >
            Post Message
          </Button>
        </div>
      </AtelierCard>
    </div>
  );
}