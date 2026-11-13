import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, CheckSquare, Scissors, Bus, UsersRound, Images, GraduationCap, Wrench, Contact, Settings as SettingsIcon, Zap, LayoutGrid, CalendarDays, Phone, History, UserCheck, TrendingUp, Info, Download, ScrollText, Package, MessagesSquare, BookOpen } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, staff: true, trainee: true },
  { to: '/customers', label: 'Customers', icon: Users, staff: false },
  { to: '/orders', label: 'Orders', icon: ShoppingBag, staff: true, trainee: true },
  { to: '/board', label: 'Board', icon: LayoutGrid, staff: true, trainee: true },
  { to: '/fittings', label: 'Fittings', icon: CalendarDays, staff: true, trainee: true },
  { to: '/quick-quote', label: 'Quotes', icon: Zap, staff: false },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, staff: true, trainee: true },
  { to: '/team', label: 'Team', icon: MessagesSquare, staff: true, trainer: true, trainee: true },
  { to: '/sops', label: 'SOPs', icon: BookOpen, staff: true, trainer: true, trainee: true },
  { to: '/training-log', label: 'Training', icon: GraduationCap, trainer: true, trainee: true },
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
  const { pathname } = useLocation();
  const modeRoles = MODE_ROLES[mode].map(([r, label]) => [r, label === 'ownerLabel' ? ownerLabel : label]);
  const items = NAV.filter(n => {
    if (role === 'trainer') return !!n.trainer;
    if (role === 'trainee') return !!n.trainee;
    if (n.trainer) return role === 'madam';
    if (n.trainee) return false;
    return !isStaff || n.staff;
  });

  return (
    <div className="min-h-screen">
      {/* Desktop rail */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center border-r border-[#E7E5E4] bg-white z-30">
        <div className="h-20 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border border-[#800020] flex items-center justify-center">
            <Scissors className="w-4 h-4 text-[#800020]" />
          </div>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 pt-4 overflow-y-auto">
          {items.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link key={to} to={to} className="group flex flex-col items-center gap-1 w-16 py-2.5 rounded-md hover:bg-[#FBF9F7]">
                <Icon className={cn('w-5 h-5', active ? 'text-[#800020]' : 'text-stone-400 group-hover:text-stone-600')} strokeWidth={active ? 2 : 1.5} />
                <span className={cn('text-[10px] tracking-wide', active ? 'text-[#800020] font-semibold' : 'text-stone-400')}>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="pb-4 flex flex-col items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] uppercase tracking-widest text-stone-400">Mode</span>
            <div className="flex flex-col gap-1 w-16">
              {[['business', 'Business'], ['training', 'Training']].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn('py-1 text-[8px] font-semibold uppercase tracking-wide rounded-md border transition', mode === m ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-stone-400 border-stone-200')}
                >{label}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] uppercase tracking-widest text-stone-400">View</span>
            {modeRoles.map(([r, label]) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn('w-16 py-1 text-[8px] font-semibold uppercase tracking-wide rounded-md border transition', role === r ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-stone-400 border-stone-200')}
              >{label}</button>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex flex-col gap-1.5 px-4 py-2 border-b border-[#E7E5E4] bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-semibold text-[#1C1917]">Sew Studio</Link>
          <div className="flex items-center gap-1">
            {[['business', 'Business'], ['training', 'Training']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} className={cn('px-2 py-1 text-[9px] font-semibold uppercase rounded border', mode === m ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'text-stone-400 border-stone-200')}>{label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-stone-400">View</span>
          {modeRoles.map(([r, label]) => (
            <button key={r} onClick={() => setRole(r)} className={cn('px-1.5 py-1 text-[8px] font-semibold uppercase rounded border', role === r ? 'bg-[#800020] text-white border-[#800020]' : 'text-stone-400 border-stone-200')}>{label}</button>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="md:pl-20 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around h-14 border-t border-[#E7E5E4] bg-white">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
          return (
            <Link key={to} to={to} className="flex flex-col items-center gap-0.5 px-3 py-1.5">
              <Icon className={cn('w-5 h-5', active ? 'text-[#800020]' : 'text-stone-400')} strokeWidth={active ? 2 : 1.5} />
              <span className={cn('text-[9px]', active ? 'text-[#800020] font-semibold' : 'text-stone-400')}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}