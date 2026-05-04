import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenant.module';
import { ChatModule } from '../chat/chat.module';
import { WidgetController } from './widget.controller';

@Module({
  imports: [TenantsModule, ChatModule],
  controllers: [WidgetController],
})
export class WidgetModule {}
