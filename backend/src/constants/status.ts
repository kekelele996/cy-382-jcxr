export enum TripStatus { Open = 'OPEN', Matched = 'MATCHED', Finished = 'FINISHED' }
export enum TransportType { SelfDrive = '自驾', Public = '公共交通', Hiking = '徒步' }

/** 协作看板事项分类：每日安排、住宿、交通 */
export enum PlanCategory { Daily = 'DAILY', Lodging = 'LODGING', Transport = 'TRANSPORT' }

/** 看板按分类展示的固定顺序 */
export const PLAN_CATEGORY_ORDER: PlanCategory[] = [PlanCategory.Daily, PlanCategory.Lodging, PlanCategory.Transport];

export const PLAN_CATEGORY_LABELS: Record<PlanCategory, string> = {
  [PlanCategory.Daily]: '每日安排',
  [PlanCategory.Lodging]: '住宿',
  [PlanCategory.Transport]: '交通'
};
