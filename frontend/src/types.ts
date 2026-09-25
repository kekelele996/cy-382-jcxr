export interface BoardItem {
  id: number;
  tripId: number;
  dayNo: number;
  title: string;
  lodging: string | null;
  transportPlan: string | null;
  ownerName: string;
  estimatedCost: number;
  version: number;
  updatedAt: string;
}

export interface BoardData {
  trip: { id: number; destination: string; departDate: string; days: number; budgetMax: number | null };
  items: BoardItem[];
  budget: { budgetMax: number | null; planned: number; remaining: number | null };
}
