// Shared domain types — mirror the Prisma models (serialised for the client).

export type OrderStatus =
  | "Enquiry"
  | "Quoted"
  | "Consultation"
  | "Confirmed"
  | "Deposit Paid"
  | "In Production"
  | "Fitting"
  | "Alterations"
  | "Ready"
  | "Collected/Delivered"
  | "Completed";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  gender?: string | null;
  phone?: string | null;
  mentorId?: string | null;
  mentor?: { id: string; fullName: string } | null;
  trainingDurationWeeks?: number | null;
  trainingStartedAt?: string | null;
  programId?: string | null;
  program?: { id: string; name: string; level: string } | null;
  canAccessOrders?: boolean;
  canAccessBoard?: boolean;
  canManageFreelancers?: boolean;
}

export interface CompetencyUnit {
  id: string;
  programId: string;
  code?: string | null;
  title: string;
  learningOutcomes: string;
  assessmentCriteria: string;
  nominalHours?: number | null;
  order: number;
}

export interface TrainingProgram {
  id: string;
  name: string;
  level: string;
  durationWeeks: number;
  description?: string | null;
  createdBy?: { id: string; fullName: string } | null;
  units: CompetencyUnit[];
  _count?: { trainees: number };
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  gender?: string | null;
  occupation?: string | null;
  city?: string | null;
  country?: string | null;
  entrySource?: string | null;
  referredBy?: string | null;
  customerType?: string | null;
  preferredStyles?: string | null;
  favouriteColours?: string | null;
  coloursToAvoid?: string | null;
  favouriteFabrics?: string | null;
  preferredFit?: string | null;
  designPreferences?: string | null;
  styleNotes?: string | null;
  skinTone?: string | null;
  height?: number | null;
  weight?: number | null;
  loyaltyPoints: number;
  notes?: string | null;
  status: string;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer?: Customer;
  garmentDesign: string;
  designImage?: string | null;
  orderDate: string;
  deliveryDate?: string | null;
  status: OrderStatus;
  assignedStaffId?: string | null;
  assignedStaff?: User | null;
  sellingPrice: number;
  fabricCost: number;
  labourCost: number;
  notes?: string | null;
  priority: string;
  createdAt: string;
  payments?: Payment[];
  fittings?: Fitting[];
  tasks?: Task[];
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method?: string | null;
  date: string;
  note?: string | null;
}

export interface Fitting {
  id: string;
  orderId: string;
  date: string;
  status: string;
  notes?: string | null;
}

export interface Task {
  id: string;
  title: string;
  orderId?: string | null;
  order?: Order | null;
  staffId?: string | null;
  staff?: User | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  notes?: string | null;
  // Grading (school-portal style)
  maxScore?: number | null;
  score?: number | null;
  gradedById?: string | null;
  gradedBy?: { id: string; fullName: string } | null;
  gradedAt?: string | null;
  feedback?: string | null;
  competencyUnitId?: string | null;
  competencyUnit?: { id: string; title: string; programId: string } | null;
  createdAt: string;
}

export interface MeasurementSet {
  id: string;
  customerId: string;
  staffId?: string | null;
  unit: string;
  dateTaken: string;
  bust?: number | null;
  waist?: number | null;
  hip?: number | null;
  shoulder?: number | null;
  length?: number | null;
  sleeve?: number | null;
  notes?: string | null;
}

export interface StyleConcept {
  id: string;
  customerId: string;
  garmentType: string;
  occasion?: string | null;
  desiredLook?: string | null;
  season?: string | null;
  budget?: number | null;
  colourPreference?: string | null;
  conceptName: string;
  silhouette?: string | null;
  neckline?: string | null;
  sleeveStyle?: string | null;
  length?: string | null;
  fabric?: string | null;
  colour?: string | null;
  detailing?: string | null;
  embellishment?: string | null;
  whyThisMayWork?: string | null;
  fitConsiderations?: string | null;
  matchPercent?: number | null;
  designDirection?: string | null;
  imageUrl?: string | null;
  status: string;
  rejectionReason?: string | null;
  dataConfidence?: string | null;
  createdAt: string;
}

export interface CustomerFeedback {
  id: string;
  customerId: string;
  rating: number;
  type: string;
  feedback?: string | null;
  date: string;
}

export interface Settings {
  id: string;
  ownerGender: string;
  studioName: string;
  overheadAmount: number;
  selfPayout: number;
  currency: string;
}

export interface Freelancer {
  linkId: string; // this shop's link id — use for PATCH/DELETE on /api/freelancers
  id: string; // the freelancer's shared global account id
  name: string;
  specialty?: string | null;
  skills?: string | null;
  phone?: string | null;
  email?: string | null;
  rateNotes?: string | null;
  status: string; // Available | Busy | Unavailable
  createdAt: string;
}

export interface FreelanceJob {
  id: string;
  taskDescription: string;
  cost?: number | null;
  dueDate?: string | null;
  status: string; // Commissioned | In Progress | Delivered | Paid
  createdAt: string;
  freelancer?: { id: string; fullName: string };
  shop?: { name: string }; // present on the freelancer-facing API only
}

export type CommunityPostType =
  | "update"
  | "question"
  | "inspiration"
  | "announcement"
  | "showcase";

export interface CommunityComment {
  id: string;
  postId: string;
  authorName: string;
  authorId?: string | null;
  body: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId?: string | null;
  authorName: string;
  authorRole?: string | null;
  type: CommunityPostType;
  title?: string | null;
  body: string;
  imageUrl?: string | null;
  pinned: boolean;
  createdAt: string;
  comments: CommunityComment[];
  _count?: { likes: number };
  likedByMe?: boolean;
}

export type TrainingStatus = "Learning" | "Practicing" | "Proficient";

export interface TrainingLog {
  id: string;
  traineeId: string;
  trainee?: { id: string; fullName: string; role: string };
  mentorId?: string | null;
  mentor?: { id: string; fullName: string } | null;
  skill?: string | null;
  title: string;
  note?: string | null;
  status: TrainingStatus;
  date: string;
  createdAt: string;
}

export interface Certificate {
  id: string;
  traineeId: string;
  trainee?: { id: string; fullName: string; email: string; gender?: string | null };
  issuedById: string;
  issuedBy?: { id: string; fullName: string };
  programName: string;
  durationWeeks: number;
  skillsAchieved: string;
  honors?: string | null;
  certificateNo: string;
  issuedAt: string;
  createdAt: string;
}



