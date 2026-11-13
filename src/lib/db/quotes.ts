export const serializeQuote = (q: Record<string, any>) => ({
  id: q.id, customerId: q.customer_id, customerName: q.customer_name, garment: q.garment,
  inputs: q.inputs ?? {}, total: Number(q.total), deposit: Number(q.deposit), status: q.status,
  validUntil: q.valid_until, notes: q.notes, createdAt: q.created_at,
});
