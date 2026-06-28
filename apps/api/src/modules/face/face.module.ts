import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { FaceData } from './entities/face-data.entity';
import { FaceController } from './face.controller';
import { FaceService } from './face.service';

@Module({
    imports: [TypeOrmModule.forFeature([FaceData, User])],
    controllers: [FaceController],
    providers: [FaceService],
    exports: [FaceService],
})
export class FaceModule { }