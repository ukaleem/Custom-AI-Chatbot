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
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenant.service';

@ApiTags('Tenants (Super Admin)')
@ApiSecurity('super-admin-key')
@UseGuards(SuperAdminGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a new company/tenant',
    description:
      'Creates a new tenant and generates their API key. **Save the apiKey** — it is shown in full only at creation time.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant created. The apiKey field contains the API key to give to the company.',
  })
  @ApiResponse({ status: 409, description: 'Tenant with this slug already exists' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants (API keys excluded for security)' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'id', description: 'Tenant MongoDB ObjectId' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update tenant details or bot configuration',
    description: 'Use this to update bot name, greeting, colors, supported languages, etc.',
  })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Post(':id/regenerate-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate API key',
    description: 'Invalidates the old key immediately. Give the new key to the company.',
  })
  @ApiResponse({ status: 200, description: 'Returns the new apiKey' })
  regenerateKey(@Param('id') id: string) {
    return this.tenantsService.regenerateApiKey(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate tenant (soft delete — data is preserved)' })
  @ApiResponse({ status: 204, description: 'Tenant deactivated' })
  deactivate(@Param('id') id: string) {
    return this.tenantsService.deactivate(id);
  }
}
