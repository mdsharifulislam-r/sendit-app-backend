import { Module } from '@nestjs/common';
import { SecretManagerService } from './secret-manager.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [SecretManagerService],
  exports: [SecretManagerService],
})
export class SecretManagerModule {}
