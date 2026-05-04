import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantDocument } from '../tenants/schemas/tenant.schema';
import { KnowledgeItemService } from './knowledge-item.service';
import { CreateKnowledgeItemDto, UpdateKnowledgeItemDto, BulkImportKnowledgeDto, ImportRawDataDto } from './dto/knowledge-item.dto';

@ApiTags('Knowledge Base')
@ApiSecurity('tenant-api-key')
@UseGuards(ApiKeyGuard)
@Controller('knowledge')
export class KnowledgeItemController {
  constructor(private readonly service: KnowledgeItemService) {}

  @Post()
  @ApiOperation({ summary: 'Create a knowledge item (manually)' })
  create(@CurrentTenant() tenant: TenantDocument, @Body() dto: CreateKnowledgeItemDto) {
    return this.service.create(tenant, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk-create up to 100 knowledge items' })
  bulkCreate(@CurrentTenant() tenant: TenantDocument, @Body() dto: BulkImportKnowledgeDto) {
    return this.service.bulkCreate(tenant, dto.items);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import from raw CSV, SQL INSERT, or JSON — format auto-detected' })
  importRaw(@CurrentTenant() tenant: TenantDocument, @Body() dto: ImportRawDataDto) {
    return this.service.importRaw(tenant, dto);
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Re-embed all active items into Qdrant' })
  reindex(@CurrentTenant() tenant: TenantDocument) {
    return this.service.reindex(tenant);
  }

  @Post('migrate-attractions')
  @ApiOperation({ summary: 'One-time migration: copy existing attractions into Knowledge Base' })
  migrateAttractions(@CurrentTenant() tenant: TenantDocument) {
    return this.service.migrateFromAttractions(tenant);
  }

  @Get()
  @ApiOperation({ summary: 'List knowledge items (paginated + search + category filter)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  findAll(
    @CurrentTenant() tenant: TenantDocument,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.service.findAll(tenant.id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search: search ?? '',
      category: category ?? '',
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all distinct categories for this tenant' })
  getCategories(@CurrentTenant() tenant: TenantDocument) {
    return this.service.getCategories(tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single knowledge item by ID' })
  findOne(@CurrentTenant() tenant: TenantDocument, @Param('id') id: string) {
    return this.service.findOne(tenant.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a knowledge item' })
  update(@CurrentTenant() tenant: TenantDocument, @Param('id') id: string, @Body() dto: UpdateKnowledgeItemDto) {
    return this.service.update(tenant, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a knowledge item' })
  remove(@CurrentTenant() tenant: TenantDocument, @Param('id') id: string) {
    return this.service.remove(tenant, id);
  }
}
