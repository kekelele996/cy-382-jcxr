import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { BoardItemInput, BoardService } from './board.service';

@Controller('api/trips')
export class BoardController {
  constructor(private readonly board: BoardService) {}
  @Get(':tripId/board') getBoard(@Param('tripId') tripId: string) { return this.board.getBoard(Number(tripId)); }
  @Post(':tripId/board/items') create(@Param('tripId') tripId: string, @Body() body: BoardItemInput) {
    return this.board.createItem(Number(tripId), body);
  }
  @Put(':tripId/board/items/:itemId') update(@Param('tripId') tripId: string, @Param('itemId') itemId: string, @Body() body: BoardItemInput) {
    return this.board.updateItem(Number(tripId), Number(itemId), body);
  }
}
