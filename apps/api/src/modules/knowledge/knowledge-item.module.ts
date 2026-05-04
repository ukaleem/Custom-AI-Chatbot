import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KnowledgeItem, KnowledgeItemSchema } from './schemas/knowledge-item.schema';
import { KnowledgeItemService } from './knowledge-item.service';
import { KnowledgeItemController } from './knowledge-item.controller';
import { DataParserService } from './parsers/data-parser.service';
import { AuthModule } from '../auth/auth.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: KnowledgeItem.name, schema: KnowledgeItemSchema }]),
    AuthModule,
    RagModule,
  ],
  providers: [KnowledgeItemService, DataParserService],
  controllers: [KnowledgeItemController],
  exports: [KnowledgeItemService],
})
export class KnowledgeItemModule {}
