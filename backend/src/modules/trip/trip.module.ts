import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { TripController } from './trip.controller';
import { TripDayEntity } from './trip-day.entity';
import { TripEntity } from './trip.entity';
import { TripService } from './trip.service';

@Module({
  imports: [TypeOrmModule.forFeature([TripEntity, TripDayEntity])],
  controllers: [TripController, BoardController],
  providers: [TripService, BoardService]
})
export class TripModule {}
