import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  // Order
  'Enquiry': 'bg-stone-100 text-stone-600 border-stone-200',
  'Quoted': 'bg-amber-50 text-amber-700 border-amber-200',
  'Consultation': 'bg-sky-50 text-sky-700 border-sky-200',
  'Confirmed': 'bg-blue-50 text-blue-700 border-blue-200',
  'Deposit Paid': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'In Production': 'bg-violet-50 text-violet-700 border-violet-200',
  'Fitting': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Alterations': 'bg-orange-50 text-orange-700 border-orange-200',
  'Ready': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Collected/Delivered': 'bg-teal-50 text-teal-700 border-teal-200',
  'Completed': 'bg-[#15803D]/10 text-[#15803D] border-[#15803d]/30',
  // Fitting
  'Scheduled': 'bg-amber-50 text-amber-700 border-amber-200',
  'Completed': 'bg-[#15803D]/10 text-[#15803D] border-[#15803d]/30',
  'Alterations Needed': 'bg-orange-50 text-orange-700 border-orange-200',
  // Task
  'To Do': 'bg-stone-100 text-stone-600 border-stone-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Done': 'bg-[#15803D]/10 text-[#15803D] border-[#15803d]/30',
  // Freelance job
  'Commissioned': 'bg-amber-50 text-amber-700 border-amber-200',
  'Delivered': 'bg-teal-50 text-teal-700 border-teal-200',
  'Paid': 'bg-[#15803D]/10 text-[#15803D] border-[#15803d]/30',
  // Priority
  'Low': 'bg-stone-100 text-stone-600 border-stone-200',
  'Medium': 'bg-amber-50 text-amber-700 border-amber-200',
  'High': 'bg-[#800020]/10 text-[#800020] border-[#800020]/30',
};

export default function StatusBadge({ status, className }) {
  const style = STATUS_STYLES[status] || 'bg-stone-100 text-stone-600 border-stone-200';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide border rounded-sm', style, className)}>
      {status}
    </span>
  );
}