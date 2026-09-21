export const EXPORT_GROUPS = [
  { title: 'Clients & Measurements', entities: ['Customer', 'Measurement'] },
  { title: 'Orders & Production', entities: ['Order', 'OrderStatusHistory', 'OrderMaterial', 'OrderLabour', 'OrderAdditionalCost', 'Payment', 'Fitting', 'QualityCheck', 'BoardFeedback', 'Task', 'Quote'] },
  { title: 'Income & Costs', entities: ['OtherIncome', 'OverheadItem', 'Freelancer', 'FreelancerJob', 'AccraRunTrip', 'AccraRunItem'] },
  { title: 'Training', entities: ['Trainee', 'TrainingLog', 'PortfolioItem'] },
  { title: 'Studio & Contacts', entities: ['Asset', 'AssetMaintenance', 'Supplier', 'Artisan', 'Reminder', 'AssistedCallLog'] },
  { title: 'Stock', entities: ['StockItem', 'StockMovement'] },
  { title: 'Planning & Insights', entities: ['MonthlyPlan', 'ClosedYear', 'HealthSnapshot', 'Policy', 'Settings'] },
];

export const ALL_EXPORT_ENTITIES = EXPORT_GROUPS.flatMap(g => g.entities);

export const EXPORT_LABELS = {
  Customer: 'Customers',
  Measurement: 'Measurements',
  Order: 'Orders',
  OrderStatusHistory: 'Order Status History',
  OrderMaterial: 'Order Materials',
  OrderLabour: 'Order Labour',
  OrderAdditionalCost: 'Order Additional Costs',
  Payment: 'Payments',
  Fitting: 'Fittings',
  QualityCheck: 'Quality Checks',
  BoardFeedback: 'Board Feedback',
  Task: 'Tasks',
  Quote: 'Quotes',
  OtherIncome: 'Other Income',
  OverheadItem: 'Overhead Items',
  Freelancer: 'Freelancers',
  FreelancerJob: 'Freelancer Jobs',
  AccraRunTrip: 'Accra Run Trips',
  AccraRunItem: 'Accra Run Items',
  Trainee: 'Trainees',
  TrainingLog: 'Training Logs',
  PortfolioItem: 'Portfolio Pieces',
  Asset: 'Assets',
  AssetMaintenance: 'Asset Maintenance',
  Supplier: 'Suppliers',
  Artisan: 'Artisans',
  Reminder: 'Reminders',
  AssistedCallLog: 'Assisted Call Logs',
  MonthlyPlan: 'Monthly Plans',
  ClosedYear: 'Closed Years',
  HealthSnapshot: 'Health Snapshots',
  Settings: 'Studio Settings',
  StockItem: 'Stock Items',
  StockMovement: 'Stock Movements',
  Policy: 'Studio Policies',
};

export function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
}

export function downloadFile(filename, content, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportFilename(key) {
  return `madams-studio-${key.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;
}