import React from 'react';
import { Sparkles, Scissors, Wallet, HeartHandshake, Info } from 'lucide-react';
import AtelierCard from '@/components/AtelierCard';
import { useRole } from '@/lib/roles';

const PILLARS = [
  {
    icon: Scissors,
    title: 'Made to measure',
    text: 'Every enquiry becomes a quote, a costed order, and a finished garment — with measurements, fittings, and quality checks along the way, so nothing is ever left to memory.',
  },
  {
    icon: Wallet,
    title: 'The true cost of everything',
    text: 'Materials, labour, freelancers, overheads, and trips are all counted per order — so the price you quote is a price that protects you.',
  },
  {
    icon: HeartHandshake,
    title: 'Never drop a client',
    text: 'Stalled quotes, missed fittings, unpaid balances, and overdue tasks are surfaced on your dashboard before they become lost work.',
  },
];

const buildRoles = (ownerLabel) => [
  { name: ownerLabel, text: 'The owner view — money, orders, team workload, and the health of the whole business.' },
  { name: 'Staff', text: 'Your workbench — the orders, fittings, and tasks assigned to you.' },
  { name: 'Trainer', text: 'Your trainees and their sessions — nothing else to distract you.' },
  { name: 'Trainee', text: 'Your work, your training log, and your progress: your journey, your reflections, and your portfolio pieces.' },
];

const GLOSSARY = [
  { term: 'True Cost', def: 'Everything an order really costs — materials, labour, additional costs, and your monthly overheads — before you can see its margin.' },
  { term: 'Business Health', def: 'A monthly reading of the studio: margin, payments coming in, quality, workload, and fulfilment — On Track, Needs Attention, or At Risk.' },
  { term: 'Assisted Entry', def: 'Support for you, not your clients — if you call or WhatsApp Sewsiness for help getting set up or entering your data, we log it on your behalf, always marked so you know their source.' },
  { term: 'Accra Run', def: 'A sourcing trip with its own plan and costs — what was needed before you left, and what actually came back.' },
  { term: 'Client Portal', def: 'A private link a client can open anytime to see their order, measurements, and payment progress — no calls needed.' },
  { term: 'Year Close', def: 'Sealing a finished year — its revenue, margin, and streams locked away safely for the Business History.' },
];

export default function AboutSewsiness() {
  const { ownerLabel } = useRole();
  const ROLES = buildRoles(ownerLabel);
  return (
    <div className="p-5 md:p-8 max-w-[1000px] mx-auto">
      <div className="mb-8 md:mb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" />Sewsiness</p>
        <h1 className="font-display font-semibold text-[#1C1917] leading-[1.05]" style={{ fontSize: 'clamp(32px, 5vw, 46px)' }}>
          The quiet engine behind<br />{ownerLabel}'s Studio.
        </h1>
        <p className="text-sm md:text-base text-stone-500 mt-4 max-w-2xl leading-relaxed">
          Sewsiness is a companion for independent fashion designers — the part of the studio that never forgets a measurement, a balance, a fitting, or a trainee's last lesson. This app is where it all lives, built around the way an atelier actually works.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-5">
        {PILLARS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-white border border-[#E7E5E4] rounded-sm p-5">
            <div className="w-9 h-9 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-[#800020]" />
            </div>
            <h2 className="text-sm font-semibold text-[#1C1917]">{title}</h2>
            <p className="text-xs text-stone-500 mt-2 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 md:mb-5">
        <AtelierCard title="One app, four views">
          <p className="text-xs text-stone-400 mb-4">The same studio, seen by the person using it — switch views with the buttons at the bottom of the menu.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROLES.map(r => (
              <div key={r.name} className="border border-[#E7E5E4] rounded-sm px-4 py-3">
                <p className="text-[11px] font-semibold text-[#800020] uppercase tracking-wide">{r.name}</p>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </AtelierCard>
      </div>

      <div className="mb-4 md:mb-5">
        <AtelierCard title="Words we use">
          <div className="divide-y divide-[#E7E5E4]">
            {GLOSSARY.map(g => (
              <div key={g.term} className="py-3 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-1 md:gap-4">
                <p className="text-sm font-medium text-[#1C1917]">{g.term}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{g.def}</p>
              </div>
            ))}
          </div>
        </AtelierCard>
      </div>

      <div className="border-l-2 border-amber-400 pl-4 py-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-1 flex items-center gap-2"><Info className="w-3 h-3" />Sewsiness Assisted</p>
        <p className="text-xs text-stone-500 leading-relaxed max-w-2xl">
          Too busy to type? If you call or WhatsApp Sewsiness for help getting onto the app or entering your studio's data, our team logs it here on your behalf — every record is marked 'Assisted' and linked to the call it came from, so you always know what was said and who entered it.
        </p>
      </div>
    </div>
  );
}