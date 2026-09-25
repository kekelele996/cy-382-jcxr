import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { BoardService } from './board.service';
import { normalizeCreate, normalizeUpdate } from './board.validator';

@Controller('api/trips')
export class BoardController {
  constructor(private readonly service: BoardService) {}

  /** 看板：三类事项 + 计划总花费 + 剩余预算 */
  @Get(':tripId/board')
  getBoard(@Param('tripId', ParseIntPipe) tripId: number) {
    return this.service.getBoard(tripId);
  }

  @Post(':tripId/board/items')
  createItem(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() body: { operator?: string }
  ) {
    return this.service.createItem(tripId, normalizeCreate(body), body.operator ?? '成员');
  }

  @Post(':tripId/board/items/:itemId')
  updateItem(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: { operator?: string }
  ) {
    return this.service.updateItem(tripId, itemId, normalizeUpdate(body), body.operator ?? '成员');
  }
}
