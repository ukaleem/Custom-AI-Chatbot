import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attraction, AttractionSchema } from './schemas/attraction.schema';
import { AttractionService } from './attraction.service';
import { AttractionController } from './attraction.controller';
import { RagModule } from '../rag/rag.module';
import { TenantsModule } from '../tenants/tenant.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Attraction.name, schema: AttractionSchema }]),
    RagModule,
    TenantsModule,
  ],
  providers: [AttractionService],
  controllers: [AttractionController],
  exports: [AttractionService],
})
export class AttractionsModule {}
