import React, { useMemo, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

// A plain textarea that shows a "@name" picker when the user types "@",
// and tracks which users have been mentioned in the current draft.
export default function MentionTextarea({ value, onChange, users, mentionedIds, onMentionedChange, placeholder }) {
  const [showList, setShowList] = useState(false);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    if (!showList) return [];
    const q = query.toLowerCase();
    return users.filter(u => (u.full_name || u.email || '').toLowerCase().includes(q)).slice(0, 6);
  }, [showList, query, users]);

  const handleChange = (e) => {
    const text = e.target.value;
    onChange(text);
    const lastAt = text.lastIndexOf('@');
    if (lastAt === -1) { setShowList(false); return; }
    const after = text.slice(lastAt + 1);
    if (/\s/.test(after) && after.trim() !== '') { setShowList(false); return; }
    setQuery(after);
    setShowList(true);
  };

  const pickUser = (u) => {
    const name = u.full_name || u.email;
    const lastAt = value.lastIndexOf('@');
    const newText = `${value.slice(0, lastAt)}@${name} `;
    onChange(newText);
    setShowList(false);
    if (!mentionedIds.includes(u.id)) onMentionedChange([...mentionedIds, u.id]);
  };

  return (
    <div className="relative">
      <Textarea value={value} onChange={handleChange} placeholder={placeholder} className="text-xs min-h-[70px]" />
      {showList && matches.length > 0 && (
        <div className="absolute z-10 left-0 top-full mt-1 w-56 bg-white border border-[#E7E5E4] rounded-sm shadow-md overflow-hidden">
          {matches.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => pickUser(u)}
              className="w-full text-left px-3 py-1.5 text-xs text-[#1C1917] hover:bg-[#FBF9F7]"
            >
              {u.full_name || u.email}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}