import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '../../constants/errors';
import { PlanCategory } from '../../constants/status';
import { AppException } from '../../common/errors/app.exception';
import { CreatePlanItemDto, UpdatePlanItemDto } from './board.dto';

const CATEGORIES = Object.values(PlanCategory);

function bad(message: string) {
  return new AppException(ERROR_CODES.VALIDATION_FAILED, message, HttpStatus.BAD_REQUEST);
}

/** 把入参收敛成合法字段，非法或缺必填时直接拒绝（拒绝的保存不写库） */
export function normalizeCreate(body: any): CreatePlanItemDto {
  if (!body || typeof body !== 'object') throw bad('请求参数不合法');
  const category = body.category;
  if (!CATEGORIES.includes(category)) throw bad('事项类型必须是每日安排、住宿或交通');
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) throw bad('事项标题不能为空');
  const assigneeName = typeof body.assigneeName === 'string' ? body.assigneeName.trim() : '';
  if (!assigneeName) throw bad('请填写负责人');
  const dayNo = category === PlanCategory.Daily ? normalizeDayNo(body.dayNo) : normalizeOptionalDayNo(body.dayNo);
  return { category, dayNo, title, detail: normalizeDetail(body.detail), assigneeName, estimatedCost: normalizeCost(body.estimatedCost) };
}

export function normalizeUpdate(body: any): UpdatePlanItemDto {
  if (!body || typeof body !== 'object') throw bad('请求参数不合法');
  if (!Number.isInteger(body.version) || body.version < 1) throw bad('缺少有效的版本号，请刷新后重试');
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) throw bad('事项标题不能为空');
  const assigneeName = typeof body.assigneeName === 'string' ? body.assigneeName.trim() : '';
  if (!assigneeName) throw bad('请填写负责人');
  return { version: body.version, dayNo: normalizeOptionalDayNo(body.dayNo), title, detail: normalizeDetail(body.detail), assigneeName, estimatedCost: normalizeCost(body.estimatedCost) };
}

function normalizeDayNo(value: any): number {
  if (!Number.isInteger(value) || value < 1) throw bad('每日安排必须填写第几天（从 1 开始）');
  return value;
}

function normalizeOptionalDayNo(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (!Number.isInteger(value) || value < 1) throw bad('天数必须是不小于 1 的整数');
  return value;
}

function normalizeDetail(value: any): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw bad('备注内容不合法');
  const detail = value.trim();
  return detail ? detail.slice(0, 400) : undefined;
}

function normalizeCost(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const cost = Number(value);
  if (!Number.isFinite(cost) || cost < 0 || cost > 9_999_999.99) throw bad('预计花费必须是 0 到 9999999.99 之间的数字');
  return Math.round(cost * 100) / 100;
}
