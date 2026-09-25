export type PlanCategory = 'DAILY' | 'LODGING' | 'TRANSPORT';

export interface PlanItem {
  id: number;
  tripId: number;
  category: PlanCategory;
  dayNo: number | null;
  title: string;
  detail?: string;
  assigneeName: string;
  estimatedCost?: number;
  version: number;
  updatedAt: string;
  createdAt: string;
}

export interface Board {
  tripId: number;
  destination: string;
  totalBudget?: number;
  plannedCost: number;
  remainingBudget?: number;
  items: PlanItem[];
}

export interface TripSummary {
  id: number;
  destination: string;
  departDate: string;
  days: number;
  budgetMin?: number;
  budgetMax?: number;
  transport: string;
  companionCount: number;
  status: string;
}

export interface CreatePlanItemPayload {
  category: PlanCategory;
  dayNo?: number | null;
  title: string;
  detail?: string;
  assigneeName: string;
  estimatedCost?: number;
  operator: string;
}

export interface UpdatePlanItemPayload extends Omit<CreatePlanItemPayload, 'category'> {
  version: number;
}
