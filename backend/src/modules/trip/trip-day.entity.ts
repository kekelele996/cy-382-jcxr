import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('trip_days')
export class TripDayEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Index() @Column({ name: 'trip_id' }) tripId!: number;
  @Column({ name: 'day_no' }) dayNo!: number;
  @Column({ default: '' }) title!: string;
  @Column({ type: 'varchar', length: 160, nullable: true }) lodging?: string | null;
  @Column({ name: 'transport_plan', type: 'varchar', length: 160, nullable: true }) transportPlan?: string | null;
  @Column({ name: 'owner_name', default: '' }) ownerName!: string;
  @Column({ name: 'estimated_cost', type: 'decimal', precision: 10, scale: 2, default: 0 }) estimatedCost!: number;
  @Column({ default: 1 }) version!: number;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
