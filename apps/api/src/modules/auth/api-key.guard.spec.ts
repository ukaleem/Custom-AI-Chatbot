import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ApiKeyGuard } from './api-key.guard';
import { Tenant } from '../tenants/schemas/tenant.schema';

const mockTenantModel = { findOne: jest.fn() };

function makeCtx(apiKey: string | undefined): [ExecutionContext, Record<string, unknown>] {
  const req: Record<string, unknown> = { headers: apiKey ? { 'x-api-key': apiKey } : {} };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return [ctx, req];
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: getModelToken(Tenant.name), useValue: mockTenantModel },
      ],
    }).compile();
    guard = module.get(ApiKeyGuard);
    mockTenantModel.findOne.mockReset();
  });

  it('throws 401 when no x-api-key header', async () => {
    const [ctx] = makeCtx(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when api key does not match any tenant', async () => {
    mockTenantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const [ctx] = makeCtx('bad-key');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when tenant is inactive', async () => {
    mockTenantModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ apiKey: 'cac_valid', isActive: false }),
    });
    const [ctx] = makeCtx('cac_valid');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('returns true and sets req.tenant when key is valid', async () => {
    const tenant = { apiKey: 'cac_valid', isActive: true, _id: '123' };
    mockTenantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(tenant) });
    const [ctx, req] = makeCtx('cac_valid');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req['tenant']).toEqual(tenant);
  });
});
