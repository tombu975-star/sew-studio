import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, CheckSquare, Scissors, Bus, UsersRound, Images, GraduationCap, Wrench, Contact, Settings as SettingsIcon, Zap, LayoutGrid, CalendarDays, Phone, History, UserCheck, TrendingUp, Info, Download, ScrollText, Package, MessagesSquare, BookOpen, Radio } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, staff: true, trainee: true },
  { to: '/customers', label: 'Customers', icon: Users, staff: false },
  { to: '/orders', label: 'Orders', icon: ShoppingBag, staff: true, trainee: true },
  { to: '/board', label: 'Production Board', icon: LayoutGrid, staff: true, trainee: true },
  { to: '/fittings', label: 'Fittings', icon: CalendarDays, staff: true, trainee: true },
  { to: '/quick-quote', label: 'Quotes', icon: Zap, staff: false },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, staff: true, trainee: true },
  { to: '/team', label: 'Team', icon: MessagesSquare, staff: true, trainer: true, trainee: true },
  { to: '/sops', label: 'SOPs', icon: BookOpen, staff: true, trainer: true, trainee: true },
  { to: '/training-log', label: 'Training Log', icon: GraduationCap, trainer: true, trainee: true },
  { to: '/webinars', label: 'Webinars & Classes', icon: Radio, staff: true, trainer: true, trainee: true },
  { to: '/trainees', label: 'Trainees', icon: UserCheck, trainer: true },
  { to: '/my-progress', label: 'My Progress', icon: TrendingUp, trainee: true },
  { to: '/accra-runs', label: 'Accra Runs', icon: Bus, staff: false },
  { to: '/assets', label: 'Assets', icon: Wrench, staff: false },
  { to: '/contacts', label: 'Contacts', icon: Contact, staff: false },
  { to: '/assisted-calls', label: 'Calls', icon: Phone, staff: false },
  { to: '/freelancers', label: 'Freelancers', icon: UsersRound, staff: false },
  { to: '/portfolio', label: 'Portfolio', icon: Images, staff: false },
  { to: '/history', label: 'History', icon: History, staff: false },
  { to: '/stock', label: 'Stock', icon: Package, staff: false },
  { to: '/policies', label: 'Policies', icon: ScrollText, staff: false },
  { to: '/data', label: 'Data', icon: Download, staff: false },
  { to: '/about', label: 'About', icon: Info, staff: true, trainer: true, trainee: true },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, staff: false },
];

const MODE_ROLES = {
  business: [['madam', 'ownerLabel'], ['staff', 'Staff']],
  training: [['trainer', 'Trainer'], ['trainee', 'Trainee']],
};

export default function AppLayout() {
  const { role, setRole, mode, setMode, isStaff, ownerLabel } = useRole();
  const { pathname, hash } = useLocation();
  const modeRoles = MODE_ROLES[mode].map(([r, label]) => [r, label === 'ownerLabel' ? ownerLabel : label]);
  const items = NAV.filter(n => {
    if (role === 'trainer') return !!n.trainer;
    if (role === 'trainee') return !!n.trainee;
    if (n.trainer) return role === 'madam';
    if (n.trainee) return false;
    return !isStaff || n.staff;
  });
  const isActive = item => item.to === '/' ? pathname === '/' && !hash : pathname.startsWith(item.to);

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-clip">
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[224px] flex-col border-r border-[#E7E5E4] bg-white z-40">
        <Link to="/" className="h-[76px] shrink-0 flex items-center gap-3 px-5 border-b border-[#F0EEEC]">
          <div className="w-10 h-10 rounded-full border border-[#800020] flex items-center justify-center"><Scissors className="w-4 h-4 text-[#800020]" /></div>
          <div className="min-w-0"><p className="font-display text-xl font-semibold text-[#1C1917] leading-none">Sewsiness</p><p className="text-[9px] uppercase tracking-[0.18em] text-stone-400 mt-1">Atelier Management</p></div>
        </Link>
        <div className="px-3 py-3 border-b border-[#F0EEEC]">
          <div className="grid grid-cols-2 gap-1 mb-2">{[['business', 'Business'], ['training', 'Training']].map(([m, label]) => <button key={m} onClick={() => setMode(m)} className={cn('py-2 text-[10px] font-semibold uppercase tracking-wide rounded-sm border', mode === m ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-stone-500 border-stone-200')}>{label}</button>)}</div>
          <div className="flex gap-1">{modeRoles.map(([r, label]) => <button key={r} onClick={() => setRole(r)} className={cn('flex-1 py-1.5 text-[10px] font-semibold rounded-sm border truncate px-1', role === r ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-stone-500 border-stone-200')}>{label}</button>)}</div>
        </div>
        <nav aria-label="Main navigation" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = isActive({ to });
            return <Link key={to} to={to} className={cn('flex items-center gap-3 w-full px-3 py-2.5 rounded-sm text-sm transition-colors', active ? 'bg-[#FBF2F4] text-[#800020] font-semibold' : 'text-stone-600 hover:bg-[#FBF9F7] hover:text-[#1C1917]')}><Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={active ? 2 : 1.6}/><span className="truncate">{label}</span></Link>;
          })}
        </nav>
        <div className="px-5 py-3 border-t border-[#F0EEEC] text-[10px] text-stone-400">Your studio, in good hands.</div>
      </aside>

      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E7E5E4]">
        <div className="flex items-center justify-between px-4 py-2.5"><Link to="/" className="font-display text-xl font-semibold text-[#1C1917]">Sewsiness</Link><div className="flex gap-1">{[['business', 'Business'], ['training', 'Training']].map(([m, label]) => <button key={m} onClick={() => setMode(m)} className={cn('px-2 py-1.5 text-[9px] font-semibold uppercase rounded-sm border', mode === m ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'text-stone-500 border-stone-200')}>{label}</button>)}</div></div>
        <div className="flex gap-1 px-3 pb-2">{modeRoles.map(([r, label]) => <button key={r} onClick={() => setRole(r)} className={cn('px-2 py-1 text-[9px] font-semibold rounded-sm border', role === r ? 'bg-[#800020] text-white border-[#800020]' : 'text-stone-500 border-stone-200')}>{label}</button>)}</div>
      </header>

      <main className="md:ml-[224px] min-w-0 w-auto pb-16 md:pb-0"><Outlet /></main>

      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch gap-1 h-[62px] px-2 border-t border-[#E7E5E4] bg-white overflow-x-auto">
        {items.map(({ to, label, icon: Icon }) => { const active = isActive({ to }); return <Link key={to} to={to} className={cn('flex min-w-[66px] shrink-0 flex-col items-center justify-center gap-1 px-2', active ? 'text-[#800020]' : 'text-stone-400')}><Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2 : 1.5}/><span className="text-[9px] whitespace-nowrap">{label}</span></Link>; })}
      </nav>
    </div>
  );
}
