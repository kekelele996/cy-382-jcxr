import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from './config/typeorm.config';
import { UserModule } from './modules/user/user.module';
import { TripModule } from './modules/trip/trip.module';
import { BoardModule } from './modules/board/board.module';
import { CompanionModule } from './modules/companion/companion.module';
import { ChatModule } from './modules/chat/chat.module';
import { DiaryModule } from './modules/diary/diary.module';

@Module({ imports: [TypeOrmModule.forRoot(typeormConfig()), UserModule, TripModule, BoardModule, CompanionModule, ChatModule, DiaryModule] })
export class AppModule {}
