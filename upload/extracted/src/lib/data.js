import { base44 } from '@/api/base44Client';

const listAll = (entity, sort = '-updated_date', limit = 500) =>
  base44.entities[entity].list(sort, limit);

export const fetchOrders = () => listAll('Order', '-order_date');
export const fetchCustomers = () => listAll('Customer', '-created_date');
export const fetchMeasurements = () => listAll('Measurement', '-date_taken');
export const fetchPayments = () => listAll('Payment', '-date');
export const fetchFittings = () => listAll('Fitting', '-date');
export const fetchTasks = () => listAll('Task', '-due_date');
export const fetchUsers = () => base44.functions.invoke('listUsers').then(res => res.data);
export const fetchMaterials = () => listAll('OrderMaterial', '-created_date');
export const fetchLabour = () => listAll('OrderLabour', '-created_date');
export const fetchAdditional = () => listAll('OrderAdditionalCost', '-created_date');
export const fetchTrips = () => listAll('AccraRunTrip', '-date');
export const fetchTripItems = () => listAll('AccraRunItem', '-created_date');

export function userMap(users) {
  return Object.fromEntries((users || []).map(u => [u.id, u]));
}

export function customerMap(customers) {
  return Object.fromEntries((customers || []).map(c => [c.id, c]));
}

// Sum of all costs for a single order
export function orderCostTotal(orderId, materials, labour, additional) {
  const m = (materials || []).filter(x => x.order_id === orderId).reduce((s, x) => s + (Number(x.total_cost) || 0), 0);
  const l = (labour || []).filter(x => x.order_id === orderId).reduce((s, x) => s + (Number(x.cost) || 0), 0);
  const a = (additional || []).filter(x => x.order_id === orderId).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  return m + l + a;
}

export function orderPaidTotal(orderId, payments) {
  return (payments || []).filter(p => p.order_id === orderId).reduce((s, p) => s + (Number(p.amount) || 0), 0);
}