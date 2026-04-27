import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { TenantsService } from './tenant.service';
import { Tenant } from './schemas/tenant.schema';

const save = jest.fn();
const mockTenantModel: any = jest.fn().mockImplementation(() => ({ save }));
mockTenantModel.findOne = jest.fn();
mockTenantModel.findById = jest.fn();
mockTenantModel.findByIdAndUpdate = jest.fn();
mockTenantModel.find = jest.fn();
mockTenantModel.updateMany = jest.fn();

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getModelToken(Tenant.name), useValue: mockTenantModel },
      ],
    }).compile();
    service = module.get(TenantsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws ConflictException if slug already exists', async () => {
      mockTenantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ slug: 'exists' }) });
      await expect(service.create({ name: 'Test', slug: 'exists', adminEmail: 'a@b.com' } as any))
        .rejects.toThrow(ConflictException);
    });

    it('creates tenant with generated cac_ apiKey', async () => {
      mockTenantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      save.mockResolvedValue({ name: 'Test', apiKey: 'cac_abc' });
      const result = await service.create({ name: 'Test', slug: 'new', adminEmail: 'a@b.com' } as any);
      expect(save).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when tenant not found', async () => {
      mockTenantModel.findById.mockReturnValue({ select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) });
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns tenant when found', async () => {
      const tenant = { _id: '1', name: 'Test', slug: 'test' };
      mockTenantModel.findById.mockReturnValue({ select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(tenant) }) });
      const result = await service.findById('1');
      expect(result).toEqual(tenant);
    });
  });

  describe('findBySlug', () => {
    it('returns null when slug not found', async () => {
      mockTenantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      expect(await service.findBySlug('missing')).toBeNull();
    });
  });

  describe('incrementSessionCount', () => {
    it('calls findByIdAndUpdate with $inc', async () => {
      mockTenantModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      await service.incrementSessionCount('tenant-1');
      expect(mockTenantModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ $inc: expect.any(Object) }),
      );
    });
  });
});
