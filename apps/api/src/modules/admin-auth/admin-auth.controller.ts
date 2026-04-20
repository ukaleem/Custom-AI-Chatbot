import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('Admin Auth')
@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Admin login — returns JWT and tenant API key',
    description: 'Use the returned `accessToken` as Bearer token for admin-only endpoints. The `apiKey` can be used for widget testing.',
  })
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto.slug, dto.password);
  }
}
