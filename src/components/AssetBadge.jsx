import React from 'react';
import { cn } from '@/lib/utils';

export const ASSET_CATEGORIES = ['Machine', 'Mannequin', 'Iron', 'Table', 'Chair', 'Other'];
export const ASSET_CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair', 'Out of Service'];
export const ASSET_STATUSES = ['In Use', 'In Storage', 'Under Repair', 'Retired'];

const CONDITION_STYLES = {
  New: 'bg-green-50 text-green-800 border-green-200',
  Good: 'bg-green-50 text-green-800 border-green-200',
  Fair: 'bg-amber-50 text-amber-800 border-amber-200',
  'Needs Repair': 'bg-red-50 text-red-800 border-red-200',
  'Out of Service': 'bg-stone-100 text-stone-600 border-stone-200',
};

const STATUS_STYLES = {
  'In Use': 'bg-green-50 text-green-800 border-green-200',
  'In Storage': 'bg-stone-100 text-stone-600 border-stone-200',
  'Under Repair': 'bg-amber-50 text-amber-800 border-amber-200',
  Retired: 'bg-stone-100 text-stone-500 border-stone-200',
};

export default function AssetBadge({ value, kind = 'condition' }) {
  const styles = kind === 'status' ? STATUS_STYLES : CONDITION_STYLES;
  return (
    <span className={cn('inline-block px-2 py-0.5 text-[10px] font-medium border rounded-full whitespace-nowrap', styles[value] || 'bg-stone-100 text-stone-500 border-stone-200')}>
      {value}
    </span>
  );
}