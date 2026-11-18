import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { User, UserSchema } from 'apps/root/src/user/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { SqsModule } from 'utils/helper-modules/sns/sqs.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),SqsModule],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
