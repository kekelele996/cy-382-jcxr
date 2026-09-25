import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** MySQL DECIMAL 经 mysql2 驱动读出为字符串，统一转成数字 */
const numeric = {
  to: (value?: number) => value,
  from: (value?: string | null) => (value === null || value === undefined ? undefined : Number(value))
};

@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'owner_id' }) ownerId!: number;
  @Column() destination!: string;
  @Column({ name: 'depart_date', type: 'date' }) departDate!: string;
  @Column() days!: number;
  @Column({ name: 'budget_min', type: 'decimal', nullable: true, transformer: numeric }) budgetMin?: number;
  @Column({ name: 'budget_max', type: 'decimal', nullable: true, transformer: numeric }) budgetMax?: number;
  @Column() transport!: string;
  @Column({ name: 'companion_count' }) companionCount!: number;
  @Column({ name: 'gender_preference', nullable: true }) genderPreference?: string;
  @Column({ default: 'OPEN' }) status!: string;
}
