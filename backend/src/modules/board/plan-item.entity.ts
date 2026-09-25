import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** MySQL DECIMAL 经 mysql2 驱动读出为字符串，统一转成数字 */
const numeric = {
  to: (value?: number) => value,
  from: (value?: string | null) => (value === null || value === undefined ? undefined : Number(value))
};

@Entity('plan_items')
export class PlanItemEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'trip_id' }) tripId!: number;
  /** DAILY 每日安排 / LODGING 住宿 / TRANSPORT 交通 */
  @Column() category!: string;
  /** 每日安排对应的第几天，住宿和交通可空 */
  @Column({ name: 'day_no', type: 'int', nullable: true }) dayNo?: number | null;
  @Column() title!: string;
  @Column({ type: 'varchar', length: 400, nullable: true }) detail?: string;
  @Column({ name: 'assignee_name', length: 80 }) assigneeName!: string;
  @Column({ name: 'estimated_cost', type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: numeric })
  estimatedCost?: number;
  /** 乐观锁版本号，每次保存 +1，用来拒绝晚到的覆盖提交 */
  @Column({ type: 'int', default: 1 }) version!: number;
  @Column({ name: 'updated_at', type: 'datetime', precision: 3 }) updatedAt!: Date;
  @Column({ name: 'created_at', type: 'datetime', precision: 3 }) createdAt!: Date;
}
