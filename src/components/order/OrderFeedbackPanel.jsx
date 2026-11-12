import React, { useEffect, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import CommentThread from '@/components/board/CommentThread';
import FeedbackEntries from '@/components/board/FeedbackEntries';

const todayISO = () => new Date().toISOString().slice(0, 10);
const actionBtn = 'bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm w-full h-8 text-xs';

function ImageAttach({ imageUrl, uploading, onPick, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 border border-[#E7E5E4] rounded-sm px-2 py-1 cursor-pointer hover:bg-stone-50">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
        {imageUrl ? 'Change photo' : 'Add photo'}
        <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={uploading} />
      </label>
      {imageUrl && (
        <div className="relative">
          <img src={imageUrl} alt="Attachment" className="h-8 w-8 rounded-sm object-cover border border-[#E7E5E4]" />
          <button type="button" onClick={onRemove} className="absolute -top-1.5 -right-1.5 bg-white border border-[#E7E5E4] rounded-full p-0.5">
            <X className="w-2.5 h-2.5 text-stone-500" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrderFeedbackPanel({ order, customerName, users, currentUser, isStaff }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [noteImage, setNoteImage] = useState('');
  const [noteUploading, setNoteUploading] = useState(false);
  const [noteTo, setNoteTo] = useState(isStaff ? '@Madam' : '@Staff');
  const [clientText, setClientText] = useState('');
  const [clientImage, setClientImage] = useState('');
  const [clientUploading, setClientUploading] = useState(false);

  useEffect(() => {
    if (!order?.id) return;
    base44.entities.BoardFeedback.filter({ order_id: order.id }, '-created_date', 200).then(setFeedbacks).catch(() => setFeedbacks([]));
  }, [order?.id]);

  const userName = (id) => users.find(u => u.id === id)?.full_name || users.find(u => u.id === id)?.email || '';

  const uploadImage = async (file, setUrl, setUploading) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUrl(file_url);
    setUploading(false);
  };

  const addFeedback = async (kind, text, imageUrl, clear, to) => {
    if (!text.trim() && !imageUrl) return;
    const tag = kind === 'Note' ? `${to} ` : '';
    const created = await base44.entities.BoardFeedback.create({
      order_id: order.id, kind, text: `${tag}${text.trim()}`, image_url: imageUrl || undefined, date: todayISO(), author_id: currentUser?.id || null,
    });
    setFeedbacks(prev => [created, ...prev]);
    clear();
    if (kind === 'Note') {
      const detail = `${customerName || 'Client'} — ${order.garment_design || 'Order'}\n\n"${text.trim()}"\n\n— ${currentUser?.full_name || 'A studio member'}`;
      const recipients = to === '@Madam'
        ? users.filter(u => u.role === 'admin')
        : users.filter(u => u.id === order.assigned_staff_id);
      recipients.forEach(r => {
        base44.functions.invoke('notifyStaff', { kind: 'production_note', user_id: r.id, detail }).catch(() => {});
      });
    }
  };

  const notes = feedbacks.filter(f => f.kind === 'Note').map(f => ({ ...f, authorName: userName(f.author_id) }));
  const clientFeedback = feedbacks.filter(f => f.kind === 'Client Feedback').map(f => ({ ...f, authorName: userName(f.author_id) }));

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4]"><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Handover & Feedback</h3></div>
      <div className="p-5">
        <Tabs defaultValue="notes">
          <TabsList className="w-full">
            <TabsTrigger value="notes" className="flex-1 text-xs">Comments</TabsTrigger>
            <TabsTrigger value="client" className="flex-1 text-xs">Client</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-2.5 mt-3">
            <CommentThread entries={notes} currentUserId={currentUser?.id} emptyLabel="No comments yet — log an update." />
            <div className="flex gap-1.5">
              {['@Madam', '@Staff'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setNoteTo(opt)}
                  className={`text-[11px] px-2.5 py-1 rounded-sm border font-medium ${noteTo === opt ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-stone-500 border-[#E7E5E4]'}`}
                >{opt}</button>
              ))}
            </div>
            <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder={`Log an update for ${noteTo}…`} className="text-xs min-h-[60px]" />
            <ImageAttach
              imageUrl={noteImage}
              uploading={noteUploading}
              onPick={e => e.target.files[0] && uploadImage(e.target.files[0], setNoteImage, setNoteUploading)}
              onRemove={() => setNoteImage('')}
            />
            <Button size="sm" disabled={noteUploading} onClick={() => addFeedback('Note', noteText, noteImage, () => { setNoteText(''); setNoteImage(''); }, noteTo)} className={actionBtn}>Post Comment</Button>
          </TabsContent>

          <TabsContent value="client" className="space-y-2.5 mt-3">
            <FeedbackEntries entries={clientFeedback} emptyLabel="No client feedback yet." />
            <Textarea value={clientText} onChange={e => setClientText(e.target.value)} placeholder="What the client said at fitting or collection…" className="text-xs min-h-[60px]" />
            <ImageAttach
              imageUrl={clientImage}
              uploading={clientUploading}
              onPick={e => e.target.files[0] && uploadImage(e.target.files[0], setClientImage, setClientUploading)}
              onRemove={() => setClientImage('')}
            />
            <Button size="sm" disabled={clientUploading} onClick={() => addFeedback('Client Feedback', clientText, clientImage, () => { setClientText(''); setClientImage(''); })} className={actionBtn}>Add Client Feedback</Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}