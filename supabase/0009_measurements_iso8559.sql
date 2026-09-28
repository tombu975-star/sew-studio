-- Measurements aligned with ISO 8559-1 body dimensions.
-- Additive and idempotent. All lengths/girths in centimetres, weight in kg.
alter table public.measurement_sets
  add column if not exists height          double precision,
  add column if not exists weight          double precision,
  add column if not exists across_back     double precision,
  add column if not exists bust_point      double precision,
  add column if not exists shoulder_to_bust double precision,
  add column if not exists underbust       double precision,
  add column if not exists back_length     double precision,
  add column if not exists front_length    double precision,
  add column if not exists upper_arm       double precision,
  add column if not exists wrist           double precision,
  add column if not exists waist_to_hip    double precision,
  add column if not exists crotch_depth    double precision,
  add column if not exists thigh           double precision,
  add column if not exists knee            double precision,
  add column if not exists ankle           double precision,
  add column if not exists outseam         double precision,
  add column if not exists posture         text;

-- Newest-first history per customer is the hot read path.
create index if not exists measurement_sets_customer_date_idx
  on public.measurement_sets (customer_id, date_taken desc);
