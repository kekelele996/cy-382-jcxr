import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ERROR_CODES } from '../../constants/errors';
import { PLAN_CATEGORY_ORDER } from '../../constants/status';
import { AppException } from '../../common/errors/app.exception';
import { TripEntity } from '../trip/trip.entity';
import { BoardGateway } from './board.gateway';
import { CreatePlanItemDto, UpdatePlanItemDto } from './board.dto';
import { PlanItemEntity } from './plan-item.entity';

export interface PlanItemView {
  id: number;
  tripId: number;
  category: string;
  dayNo: number | null;
  title: string;
  detail?: string;
  assigneeName: string;
  estimatedCost?: number;
  version: number;
  updatedAt: string;
  createdAt: string;
}

export interface BoardView {
  tripId: number;
  destination: string;
  totalBudget?: number;
  plannedCost: number;
  remainingBudget?: number;
  items: PlanItemView[];
}

interface BoardChange {
  reason: 'created' | 'updated';
  by: string;
  at: string;
}

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(TripEntity) private readonly trips: Repository<TripEntity>,
    @InjectRepository(PlanItemEntity) private readonly planItems: Repository<PlanItemEntity>,
    private readonly gateway: BoardGateway
  ) {}

  async getBoard(tripId: number): Promise<BoardView> {
    const trip = await this.trips.findOneBy({ id: tripId });
    if (!trip) throw this.tripNotFound(tripId);
    const items = await this.planItems.find({ where: { tripId } });
    return this.buildBoardView(trip, items);
  }

  async createItem(tripId: number, input: CreatePlanItemDto, operator: string): Promise<BoardView> {
    const { view, change } = await this.dataSource.transaction(async manager => {
      // 锁住行程行：同一行程的所有保存串行化，保证预算校验准确
      const trip = await manager.findOne(TripEntity, { where: { id: tripId }, lock: { mode: 'pessimistic_write' } });
      if (!trip) throw this.tripNotFound(tripId);

      const items = await manager.find(PlanItemEntity, { where: { tripId } });
      this.assertBudget(trip, sumCost(items) + (input.estimatedCost ?? 0));

      const now = new Date();
      const item = manager.create(PlanItemEntity, { ...input, tripId, version: 1, createdAt: now, updatedAt: now });
      const saved = await manager.save(item);
      items.push(saved);

      this.logger.log(`成员 ${operator} 在行程 ${tripId} 新增事项「${saved.title}」`);
      return { view: this.buildBoardView(trip, items), change: { reason: 'created' as const, by: operator, at: now.toISOString() } };
    });
    // 事务提交成功后再广播，成员收到通知时一定能读到最新数据
    this.gateway.emitBoardChanged(tripId, change);
    return view;
  }

  async updateItem(tripId: number, itemId: number, input: UpdatePlanItemDto, operator: string): Promise<BoardView> {
    const { view, change } = await this.dataSource.transaction(async manager => {
      const trip = await manager.findOne(TripEntity, { where: { id: tripId }, lock: { mode: 'pessimistic_write' } });
      if (!trip) throw this.tripNotFound(tripId);

      const items = await manager.find(PlanItemEntity, { where: { tripId } });
      const item = items.find(entry => entry.id === itemId);
      if (!item) throw new AppException(ERROR_CODES.PLAN_ITEM_NOT_FOUND, '要修改的安排不存在，可能已被删除', HttpStatus.NOT_FOUND);

      // 乐观锁：晚到的提交携带旧版本号时拒绝，不能覆盖对方刚保存的内容
      if (item.version !== input.version) {
        throw new AppException(
          ERROR_CODES.VERSION_CONFLICT,
          '该安排刚被其他成员更新，请先查看最新安排再重新提交',
          HttpStatus.CONFLICT,
          { latest: this.toItemView(item) }
        );
      }

      const otherCost = sumCost(items.filter(entry => entry.id !== itemId));
      this.assertBudget(trip, otherCost + (input.estimatedCost ?? 0));

      item.dayNo = input.dayNo ?? null;
      item.title = input.title;
      item.detail = input.detail;
      item.assigneeName = input.assigneeName;
      item.estimatedCost = input.estimatedCost;
      item.version += 1;
      item.updatedAt = new Date();
      await manager.save(item);

      this.logger.log(`成员 ${operator} 更新行程 ${tripId} 事项「${item.title}」至版本 ${item.version}`);
      return { view: this.buildBoardView(trip, items), change: { reason: 'updated' as const, by: operator, at: item.updatedAt.toISOString() } };
    });
    this.gateway.emitBoardChanged(tripId, change);
    return view;
  }

  /** 计划总花费不得超过行程总预算；超出则拒绝保存（不写库、不扣预算） */
  private assertBudget(trip: TripEntity, planned: number) {
    const total = trip.budgetMax;
    const rounded = roundMoney(planned);
    if (total !== undefined && total !== null && rounded > roundMoney(Number(total))) {
      throw new AppException(
        ERROR_CODES.BUDGET_EXCEEDED,
        `计划总花费 ${rounded} 元已超过行程总预算 ${Number(total)} 元，请调整预计花费后再保存`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        { totalBudget: Number(total), plannedCost: rounded }
      );
    }
  }

  private buildBoardView(trip: TripEntity, items: PlanItemEntity[]): BoardView {
    const plannedCost = roundMoney(sumCost(items));
    const totalBudget = trip.budgetMax !== undefined && trip.budgetMax !== null ? Number(trip.budgetMax) : undefined;
    return {
      tripId: trip.id,
      destination: trip.destination,
      totalBudget,
      plannedCost,
      remainingBudget: totalBudget === undefined ? undefined : roundMoney(totalBudget - plannedCost),
      items: items
        .map(item => this.toItemView(item))
        .sort((a, b) => {
          const categoryGap = PLAN_CATEGORY_ORDER.indexOf(a.category as any) - PLAN_CATEGORY_ORDER.indexOf(b.category as any);
          if (categoryGap !== 0) return categoryGap;
          const dayGap = (a.dayNo ?? 0) - (b.dayNo ?? 0);
          if (dayGap !== 0) return dayGap;
          return a.id - b.id;
        })
    };
  }

  private toItemView(item: PlanItemEntity): PlanItemView {
    return {
      id: item.id,
      tripId: item.tripId,
      category: item.category,
      dayNo: item.dayNo ?? null,
      title: item.title,
      detail: item.detail,
      assigneeName: item.assigneeName,
      estimatedCost: item.estimatedCost,
      version: item.version,
      updatedAt: (item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt)).toISOString(),
      createdAt: (item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)).toISOString()
    };
  }

  private tripNotFound(tripId: number) {
    return new AppException(ERROR_CODES.TRIP_NOT_FOUND, `行程 ${tripId} 不存在`, HttpStatus.NOT_FOUND);
  }
}

function sumCost(items: PlanItemEntity[]): number {
  return items.reduce((total, item) => total + (item.estimatedCost ?? 0), 0);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
