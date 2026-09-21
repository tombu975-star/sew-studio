import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from '@/lib/format';

const BURGUNDY = [128, 0, 32];
const INK = [28, 25, 23];
const GREY = [120, 113, 108];
const LINE = [231, 229, 228];

export function generateOrderPdf({ order, customer, payments, fittings }) {
  const doc = new jsPDF();
  const M = 20;
  let y = 24;

  const ensureSpace = (needed) => {
    if (y + needed > 275) { doc.addPage(); y = 24; }
  };

  // Header
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BURGUNDY);
  doc.text("MADAM'S STUDIO", M, y, { charSpace: 1.5 });
  y += 12;
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...INK);
  doc.text(order.garment_design || 'Custom Order', M, y);
  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text('Order Summary', M, y);
  y += 5;
  doc.setDrawColor(...LINE);
  doc.line(M, y, 210 - M, y);
  y += 12;

  // Details
  const details = [
    ['Client', customer?.name || '—'],
    ['Order Date', formatDate(order.order_date)],
    ['Delivery Date', formatDate(order.delivery_date)],
    ['Status', order.status],
  ];
  details.forEach(([label, value]) => {
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text(label, M, y);
    doc.setTextColor(...INK);
    doc.text(String(value), 210 - M, y, { align: 'right' });
    y += 7;
  });
  y += 4;

  // Financial summary
  const selling = Number(order.selling_price) || 0;
  const paid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = selling - paid;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BURGUNDY);
  doc.text('PAYMENT SUMMARY', M, y, { charSpace: 1.2 });
  y += 9;
  const money = [
    ['Total Price', formatCurrency(selling)],
    ['Paid To Date', formatCurrency(paid)],
    ['Outstanding Balance', formatCurrency(balance)],
  ];
  money.forEach(([label, value], i) => {
    doc.setFont('times', i === 2 ? 'bold' : 'normal');
    doc.setFontSize(i === 2 ? 13 : 12);
    doc.setTextColor(...GREY);
    doc.text(label, M, y);
    doc.setTextColor(i === 2 ? (balance > 0 ? BURGUNDY : [21, 128, 61]) : INK);
    doc.text(value, 210 - M, y, { align: 'right' });
    y += 8;
  });
  y += 6;

  // Payment history
  if ((payments || []).length > 0) {
    ensureSpace(40);
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BURGUNDY);
    doc.text('PAYMENT HISTORY', M, y, { charSpace: 1.2 });
    y += 8;
    (payments || []).forEach((p) => {
      ensureSpace(8);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(formatDate(p.date), M, y);
      doc.setTextColor(...GREY);
      doc.text(`${p.type} · ${p.method}`, M + 45, y);
      doc.setTextColor(...INK);
      doc.text(formatCurrency(p.amount), 210 - M, y, { align: 'right' });
      y += 6;
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.1);
      doc.line(M, y - 2, 210 - M, y - 2);
    });
    y += 6;
  }

  // Fittings
  if ((fittings || []).length > 0) {
    ensureSpace(40);
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BURGUNDY);
    doc.text('FITTINGS', M, y, { charSpace: 1.2 });
    y += 8;
    (fittings || []).forEach((f) => {
      ensureSpace(8);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(formatDate(f.date), M, y);
      doc.setTextColor(...GREY);
      doc.text(f.status, M + 45, y);
      y += 6;
    });
    y += 6;
  }

  // Footer
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text('Thank you for choosing Madam\u2019s Studio.', M, 285);

  const name = (customer?.name || 'client').replace(/\s+/g, '-').toLowerCase();
  doc.save(`${name}-order-summary.pdf`);
}