import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantDocument } from '../tenants/schemas/tenant.schema';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantDocument => {
    const request = ctx.switchToHttp().getRequest();
    return request['tenant'];
  },
);
