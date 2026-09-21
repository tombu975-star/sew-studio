import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const RoleContext = createContext(null);

// Every specific role belongs to one of two everyday "modes" — this powers the Business/Training toggle.
const ROLE_MODE = { madam: 'business', staff: 'business', trainer: 'training', trainee: 'training' };

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    const saved = localStorage.getItem('ms_role');
    // Apprentice and Trainee are one role — anyone who had Apprentice selected lands on Trainee.
    return saved === 'apprentice' ? 'trainee' : (saved || 'madam');
  });
  const [user, setUser] = useState(null);
  const [ownerLabel, setOwnerLabel] = useState('Madam');

  useEffect(() => {
    localStorage.setItem('ms_role', role);
    // Remember the last specific role picked within each mode, so switching modes returns to it.
    localStorage.setItem(`ms_role_${ROLE_MODE[role]}`, role);
  }, [role]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.gender === 'Male') {
        setOwnerLabel('Master');
      } else if (u?.gender === 'Female') {
        setOwnerLabel('Madam');
      } else {
        // No gender set on profile yet — fall back to the studio's saved default.
        base44.entities.Settings.list('-created_date', 1).then(rows => {
          if (rows[0]?.owner_gender) setOwnerLabel(rows[0].owner_gender);
        }).catch(() => {});
      }
    }).catch(() => setUser(null));
  }, []);

  const setRole = (r) => setRoleState(r);

  const mode = ROLE_MODE[role];
  const setMode = (m) => {
    if (m === mode) return;
    const lastForMode = localStorage.getItem(`ms_role_${m}`);
    setRoleState(lastForMode || (m === 'business' ? 'madam' : 'trainer'));
  };

  return (
    <RoleContext.Provider value={{ role, setRole, mode, setMode, user, ownerLabel, setOwnerLabel, isStaff: role === 'staff' || role === 'trainee', isApprentice: role === 'trainee', isTrainer: role === 'trainer', isTrainee: role === 'trainee' }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}