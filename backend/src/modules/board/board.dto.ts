import { PlanCategory } from '../../constants/status';

export class CreatePlanItemDto {
  category!: PlanCategory;
  dayNo?: number | null;
  title!: string;
  detail?: string;
  assigneeName!: string;
  estimatedCost?: number;
}

export class UpdatePlanItemDto {
  /** 提交者编辑时看到的版本号，与服务端不一致即拒绝保存 */
  version!: number;
  dayNo?: number | null;
  title!: string;
  detail?: string;
  assigneeName!: string;
  estimatedCost?: number;
}
