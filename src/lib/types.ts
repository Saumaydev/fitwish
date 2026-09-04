/* ------------------------------------------------------------------ */
/* Fitwish shared types — data-transfer objects (API boundary)         */
/* ------------------------------------------------------------------ */

export type Role = "user" | "trainer" | "admin";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ThemePref = "system" | "light" | "dark";

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relation?: string;
}

export interface Measurements {
  chest?: number | null;
  waist?: number | null;
  arms?: number | null;
  thighs?: number | null;
  hips?: number | null;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string | number;
  weight: string | number | null;
  time: number | null; // exercise duration in seconds
  rest: number; // rest duration in seconds
  instructions: string;
  order: number;
}

export interface ExerciseResult {
  exerciseId: string;
  name: string;
  completedSets: number;
  actualReps: string | number;
  actualWeight: number | null;
  completed: boolean;
}

export interface DietItem {
  itemId: string;
  name: string;
  quantity: string;
  calories: number | null;
  protein: number | null;
}

export interface DietMeal {
  mealId: string;
  type: string; // breakfast | lunch | snacks | dinner
  time: string;
  items: DietItem[];
  notes: string;
  order: number;
}

export interface TrainerDTO {
  uid: string;
  name: string;
  qualification: string | null;
  experience: string | null;
  bio: string | null;
  photoUrl: string | null;
  availability: string | null;
  approvalStatus: ApprovalStatus;
  adminApproval: ApprovalStatus;
  isActive: boolean;
}

export interface MeUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  heightCm: number | null;
  emergencyContact: EmergencyContact | null;
  theme: ThemePref;
  language: string;
  approvalStatus: ApprovalStatus;
  assignedTrainerUid: string | null;
  sessionTime: string | null;
  trainer: TrainerDTO | null;
}

export interface MembershipDTO {
  id: string;
  userUid: string;
  plan: string;
  startDate: string;
  durationMonths: number;
  expiryDate: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
}

export interface WorkoutPlanDTO {
  id: string;
  userUid: string;
  trainerUid: string | null;
  title: string;
  exercises: WorkoutExercise[];
  status: string;
  updatedAt: string;
}

export interface DietPlanDTO {
  id: string;
  userUid: string;
  trainerUid: string | null;
  title: string;
  notes: string | null;
  meals: DietMeal[];
  status: string;
  updatedAt: string;
}

export interface UserDietBundle {
  dietPlan: DietPlanDTO | null;
}

export interface WorkoutSessionDTO {
  id: string;
  planId: string | null;
  startedAt: string;
  completedAt: string;
  exerciseResults: ExerciseResult[];
}

export interface AttendanceRecordDTO {
  id: string;
  date: string;
  status: "present" | "absent";
  trainerName?: string | null;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  percent: number;
}

export interface TrainerRequestDTO {
  id: string;
  userUid: string;
  trainerUid: string;
  status: "pending" | "accepted" | "rejected";
  userName: string;
  userPhoto: string | null;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  actionRef: string | null;
  createdAt: string;
}

export interface HolidayDTO {
  id: string;
  name: string;
  reason: string | null;
  date: string;
}

export interface ProgressEntryDTO {
  id: string;
  date: string;
  weight: number | null;
  bmi: number | null;
  measurements: Measurements | null;
}

export interface ProgressPhotoDTO {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  date: string;
  category: string;
  storagePath: string;
}

export interface CalcDTO {
  id: string;
  type: string;
  inputs: Record<string, number | string>;
  result: string;
  createdAt: string;
}

export interface ReportDTO {
  id: string;
  userUid: string;
  userName: string;
  userEmail: string;
  type: string;
  description: string;
  status: "pending" | "open" | "resolved";
  createdAt: string;
}

export interface PaymentDTO {
  id: string;
  userUid: string;
  userName: string;
  amount: number;
  status: "requested" | "received";
  createdAt: string;
}

export interface AuditDTO {
  id: string;
  adminUid: string;
  adminName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Bundles                                                            */
/* ------------------------------------------------------------------ */

export interface UserBundle {
  user: MeUser;
  membership: MembershipDTO | null;
  trainer: TrainerDTO | null;
  sessionTime: string | null;
  unreadNotifications: number;
  openPaymentRequest: boolean;
  latestNotifications: NotificationDTO[];
  todayHoliday: HolidayDTO | null;
}

export interface UserWorkoutBundle {
  plan: WorkoutPlanDTO | null;
  sessions: WorkoutSessionDTO[];
}

export interface UserProgressBundle {
  entries: ProgressEntryDTO[];
  photos: ProgressPhotoDTO[];
  workoutCount: number;
  attendance: AttendanceSummary;
  latestWeight: number | null;
  latestBmi: number | null;
}

export interface TrainerOverviewDTO {
  clientCount: number;
  todaySessionCount: number;
  activeClientCount: number;
  pendingTasks: number;
  schedule: { userUid: string; name: string; photoUrl: string | null; sessionTime: string | null; membershipPlan: string | null }[];
  pendingRequests: TrainerRequestDTO[];
  unreadNotifications: number;
  latestNotifications: NotificationDTO[];
  todayHoliday: HolidayDTO | null;
  upcomingHolidays: HolidayDTO[];
}

export interface TrainerAttendanceRowDTO {
  trainerUid: string;
  name: string;
  photoUrl: string | null;
  status: "present" | "absent" | null;
}

export interface TrainerAttendanceDayDTO {
  date: string;
  rows: TrainerAttendanceRowDTO[];
  present: number;
  absent: number;
  unmarked: number;
}

export interface TrainerAttendanceHistoryDTO {
  id: string;
  trainerUid: string;
  trainerName: string;
  date: string;
  status: "present" | "absent";
}

export interface ClientDTO {
  uid: string;
  name: string;
  photoUrl: string | null;
  plan: string | null;
  sessionTime: string | null;
  membershipStatus: string;
  latestWeight: number | null;
  workoutCount: number;
  attendancePercent: number;
}

export interface ClientBundle {
  user: MeUser;
  membership: MembershipDTO | null;
  plan: WorkoutPlanDTO | null;
  dietPlan: DietPlanDTO | null;
  sessionTime: string | null;
  attendance: AttendanceSummary;
  recentAttendance: AttendanceRecordDTO[];
  entries: ProgressEntryDTO[];
  photos: ProgressPhotoDTO[];
  workoutCount: number;
}

export interface AdminDashboardDTO {
  totalUsers: number;
  pendingMemberApprovals: number;
  totalTrainers: number;
  activeTrainers: number;
  inactiveTrainers: number;
  pendingTrainerApprovals: number;
  activeMemberships: number;
  expiringMemberships: number;
  expiredMemberships: number;
  totalDue: number;
  pendingReports: number;
  pendingPayments: number;
  attendanceToday: number;
  signups: { date: string; count: number }[];
  recentAudit: AuditDTO[];
}

export interface MemberRowDTO {
  uid: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  approvalStatus: ApprovalStatus;
  plan: string | null;
  membershipStatus: string | null;
  dueAmount: number | null;
  trainerName: string | null;
  sessionTime: string | null;
  createdAt: string;
}

export interface AdminMemberDTO {
  user: MeUser;
  membership: MembershipDTO | null;
  trainer: TrainerDTO | null;
  assignedTrainer: TrainerDTO | null;
  attendance: AttendanceSummary;
  entries: ProgressEntryDTO[];
  workoutCount: number;
}

export interface AdminTrainerDTO {
  trainer: TrainerDTO;
  email: string | null;
  phone: string | null;
  clientCount: number;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
