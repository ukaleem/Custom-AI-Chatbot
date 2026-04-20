import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { AttractionService } from './attraction.service';
import { CreateAttractionDto } from './dto/create-attraction.dto';
import { UpdateAttractionDto } from './dto/update-attraction.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantDocument } from '../tenants/schemas/tenant.schema';

@ApiTags('Attractions')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('attractions')
export class AttractionController {
  constructor(private readonly service: AttractionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a single attraction (also embeds into Qdrant)' })
  create(@CurrentTenant() tenant: TenantDocument, @Body() dto: CreateAttractionDto) {
    return this.service.create(tenant, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk-create up to 100 attractions' })
  bulkCreate(@CurrentTenant() tenant: TenantDocument, @Body() dto: BulkImportDto) {
    return this.service.bulkCreate(tenant, dto.attractions);
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Re-embed all active attractions into Qdrant' })
  reindex(@CurrentTenant() tenant: TenantDocument) {
    return this.service.reindex(tenant);
  }

  @Get()
  @ApiOperation({ summary: 'List all active attractions for this tenant' })
  findAll(@CurrentTenant() tenant: TenantDocument) {
    return this.service.findAll(tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single attraction by ID' })
  findOne(@CurrentTenant() tenant: TenantDocument, @Param('id') id: string) {
    return this.service.findOne(tenant.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an attraction (re-embeds into Qdrant)' })
  update(
    @CurrentTenant() tenant: TenantDocument,
    @Param('id') id: string,
    @Body() dto: UpdateAttractionDto,
  ) {
    return this.service.update(tenant, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attraction (removes from MongoDB + Qdrant)' })
  remove(@CurrentTenant() tenant: TenantDocument, @Param('id') id: string) {
    return this.service.remove(tenant, id);
  }
}
