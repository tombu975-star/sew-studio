import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import FeedbackEntries from '@/components/board/FeedbackEntries';
import CommentThread from '@/components/board/CommentThread';
import CheckEntries from '@/components/board/CheckEntries';

const CHECK_STAGES = ['Cutting', 'Sewing', 'Finishing', 'Final'];
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

export default function FeedbackDialog({ order, customerName, notes, clientFeedback, checks, currentUserId, onClose, onAddFeedback, onAddCheck }) {
  const [noteText, setNoteText] = useState('');
  const [noteImage, setNoteImage] = useState('');
  const [noteUploading, setNoteUploading] = useState(false);
  const [clientText, setClientText] = useState('');
  const [clientImage, setClientImage] = useState('');
  const [clientUploading, setClientUploading] = useState(false);
  const [stage, setStage] = useState('Sewing');
  const [checkResult, setCheckResult] = useState('Pass');
  const [checkNote, setCheckNote] = useState('');

  const uploadImage = async (file, setUrl, setUploading) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUrl(file_url);
    setUploading(false);
  };

  const submitFeedback = async (kind, text, imageUrl, clear) => {
    if (!text.trim() && !imageUrl) return;
    await onAddFeedback(kind, text.trim(), imageUrl || null);
    clear();
  };

  const submitCheck = async () => {
    await onAddCheck(stage, checkResult, checkNote.trim() || null);
    setCheckNote('');
    setCheckResult('Pass');
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl leading-tight pr-6">{order.garment_design || 'Order'}</DialogTitle>
          <DialogDescription className="text-xs">{customerName}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="notes">
          <TabsList className="w-full">
            <TabsTrigger value="notes" className="flex-1 text-xs">Comments</TabsTrigger>
            <TabsTrigger value="client" className="flex-1 text-xs">Client</TabsTrigger>
            <TabsTrigger value="checks" className="flex-1 text-xs">Check-ins</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-2.5 mt-3">
            <CommentThread entries={notes} currentUserId={currentUserId} emptyLabel="No comments yet — log an update for Madam." />
            <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Log an update or feedback for Madam…" className="text-xs min-h-[60px]" />
            <ImageAttach
              imageUrl={noteImage}
              uploading={noteUploading}
              onPick={e => e.target.files[0] && uploadImage(e.target.files[0], setNoteImage, setNoteUploading)}
              onRemove={() => setNoteImage('')}
            />
            <Button size="sm" disabled={noteUploading} onClick={() => submitFeedback('Note', noteText, noteImage, () => { setNoteText(''); setNoteImage(''); })} className={actionBtn}>Post Comment</Button>
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
            <Button size="sm" disabled={clientUploading} onClick={() => submitFeedback('Client Feedback', clientText, clientImage, () => { setClientText(''); setClientImage(''); })} className={actionBtn}>Add Client Feedback</Button>
          </TabsContent>

          <TabsContent value="checks" className="space-y-2.5 mt-3">
            <CheckEntries checks={checks} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHECK_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-1.5">
                {['Pass', 'Needs Rework'].map(r => (
                  <button key={r} type="button" onClick={() => setCheckResult(r)}
                    className={`flex-1 text-[11px] rounded-sm border px-2 font-medium transition ${checkResult === r
                      ? (r === 'Pass' ? 'bg-[#15803D] text-white border-[#15803D]' : 'bg-orange-600 text-white border-orange-600')
                      : 'bg-white text-stone-500 border-[#E7E5E4]'}`}>
                    {r === 'Pass' ? 'Pass' : 'Rework'}
                  </button>
                ))}
              </div>
            </div>
            <Textarea value={checkNote} onChange={e => setCheckNote(e.target.value)} placeholder="Optional note…" className="text-xs min-h-[50px]" />
            <Button size="sm" onClick={submitCheck} className={actionBtn}>Record Check-in</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}