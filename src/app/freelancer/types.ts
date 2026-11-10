export interface FreelancerProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  specialty?: string | null;
  skills?: string | null;
}

export interface FreelanceJob {
  id: string;
  taskDescription: string;
  cost?: number | null;
  dueDate?: string | null;
  status: string;
  createdAt: string;
  shop?: { name: string };
}

export const JOB_STATUSES = ["Commissioned", "In Progress", "Delivered", "Paid"] as const;
