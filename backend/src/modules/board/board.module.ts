import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripEntity } from '../trip/trip.entity';
import { BoardController } from './board.controller';
import { BoardGateway } from './board.gateway';
import { BoardService } from './board.service';
import { PlanItemEntity } from './plan-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TripEntity, PlanItemEntity])],
  controllers: [BoardController],
  providers: [BoardService, BoardGateway]
})
export class BoardModule {}
