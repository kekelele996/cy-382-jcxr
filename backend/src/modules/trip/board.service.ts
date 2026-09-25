import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { ERROR_CODES } from '../../constants/errors';
import { TripDayEntity } from './trip-day.entity';
import { TripEntity } from './trip.entity';

export interface BoardItemInput {
  dayNo: number;
  title?: string;
  lodging?: string;
  transportPlan?: string;
  ownerName: string;
  estimatedCost: number;
  version?: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(TripEntity) private readonly trips: Repository<TripEntity>,
    @InjectRepository(TripDayEntity) private readonly days: Repository<TripDayEntity>,
    private readonly dataSource: DataSource
  ) {}

  async getBoard(tripId: number) {
    const trip = await this.trips.findOneBy({ id: tripId });
    if (!trip) throw new AppException(ERROR_CODES.TRIP_NOT_FOUND, '行程不存在', 404);
    const items = await this.days.find({ where: { tripId }, order: { dayNo: 'ASC', id: 'ASC' } });
    const planned = round2(items.reduce((sum, item) => sum + Number(item.estimatedCost), 0));
    const budgetMax = trip.budgetMax == null ? null : Number(trip.budgetMax);
    return {
      trip: { id: trip.id, destination: trip.destination, departDate: trip.departDate, days: trip.days, budgetMax },
      items: items.map(item => ({ ...item, estimatedCost: Number(item.estimatedCost) })),
      budget: { budgetMax, planned, remaining: budgetMax == null ? null : round2(budgetMax - planned) }
    };
  }

  async createItem(tripId: number, input: BoardItemInput) {
    this.validate(input);
    await this.dataSource.transaction(async manager => {
      const trip = await this.lockTrip(manager, tripId);
      await this.assertWithinBudget(manager, tripId, null, input.estimatedCost, trip);
      await manager.getRepository(TripDayEntity).save(
        manager.getRepository(TripDayEntity).create({ ...this.toFields(input), tripId, version: 1 })
      );
    });
    return this.getBoard(tripId);
  }

  async updateItem(tripId: number, itemId: number, input: BoardItemInput) {
    this.validate(input);
    if (input.version == null) throw new AppException(ERROR_CODES.VALIDATION_FAILED, '缺少版本号，请刷新看板后重试');
    await this.dataSource.transaction(async manager => {
      const trip = await this.lockTrip(manager, tripId);
      const repo = manager.getRepository(TripDayEntity);
      const item = await repo.findOneBy({ id: itemId, tripId });
      if (!item) throw new AppException(ERROR_CODES.BOARD_ITEM_NOT_FOUND, '该安排不存在或已被删除', 404);
      if (item.version !== input.version) {
        throw new AppException(ERROR_CODES.BOARD_CONFLICT, '该安排刚被其他成员更新，请查看最新安排后再提交', 409);
      }
      await this.assertWithinBudget(manager, tripId, itemId, input.estimatedCost, trip);
      // 版本号写进 WHERE，晚到的保存即使进入数据库也不会覆盖别人刚提交的内容
      const result = await repo
        .createQueryBuilder()
        .update(TripDayEntity)
        .set({ ...this.toFields(input), version: item.version + 1, updatedAt: () => 'CURRENT_TIMESTAMP' })
        .where('id = :itemId AND trip_id = :tripId AND version = :version', { itemId, tripId, version: input.version })
        .execute();
      if (!result.affected) {
        throw new AppException(ERROR_CODES.BOARD_CONFLICT, '该安排刚被其他成员更新，请查看最新安排后再提交', 409);
      }
    });
    return this.getBoard(tripId);
  }

  private async lockTrip(manager: EntityManager, tripId: number) {
    const query = manager.getRepository(TripEntity).createQueryBuilder('trip').where('trip.id = :tripId', { tripId });
    // MySQL 下用 FOR UPDATE 串行化同一行程的看板写入；版本号校验兜底保证不互相覆盖
    if (['mysql', 'mariadb', 'aurora-mysql'].includes(manager.connection.options.type)) {
      query.setLock('pessimistic_write');
    }
    const trip = await query.getOne();
    if (!trip) throw new AppException(ERROR_CODES.TRIP_NOT_FOUND, '行程不存在', 404);
    return trip;
  }

  private async assertWithinBudget(manager: EntityManager, tripId: number, excludeItemId: number | null, newCost: number, trip: TripEntity) {
    if (trip.budgetMax == null) return;
    const items = await manager.getRepository(TripDayEntity).findBy({ tripId });
    const others = items.filter(item => item.id !== excludeItemId).reduce((sum, item) => sum + Number(item.estimatedCost), 0);
    const planned = round2(others + newCost);
    const budgetMax = Number(trip.budgetMax);
    if (planned > budgetMax) {
      const available = round2(Math.max(budgetMax - others, 0));
      throw new AppException(ERROR_CODES.BUDGET_EXCEEDED, `保存后计划总花费 ${planned} 元，超出行程总预算 ${budgetMax} 元，当前最多还可安排 ${available} 元`);
    }
  }

  private validate(input: BoardItemInput) {
    if (!Number.isInteger(input.dayNo) || input.dayNo < 1) {
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, '天数必须是大于 0 的整数');
    }
    if (!input.ownerName || !input.ownerName.trim()) {
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, '请填写负责人');
    }
    const cost = Number(input.estimatedCost);
    if (!Number.isFinite(cost) || cost < 0) {
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, '预计花费必须是不小于 0 的数字');
    }
    input.ownerName = input.ownerName.trim();
    input.estimatedCost = round2(cost);
  }

  private toFields(input: BoardItemInput) {
    return {
      dayNo: input.dayNo,
      title: input.title?.trim() ?? '',
      lodging: input.lodging?.trim() || null,
      transportPlan: input.transportPlan?.trim() || null,
      ownerName: input.ownerName,
      estimatedCost: input.estimatedCost
    };
  }
}
