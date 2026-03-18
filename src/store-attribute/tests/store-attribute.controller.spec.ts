import { Test, TestingModule } from '@nestjs/testing';

import { StoreAttributeController } from '../store-attribute.controller';
import { StoreAttributeService } from '../store-attribute.service';

const mockService = {
  getAttributesByCategoryId: jest.fn(),
  createAttribute: jest.fn(),
  updateAttribute: jest.fn(),
  deleteAttribute: jest.fn(),
  changeAttributePosition: jest.fn(),
  upsertAttributeTranslation: jest.fn(),
  deleteAttributeTranslation: jest.fn(),
};

describe('StoreAttributeController', () => {
  let controller: StoreAttributeController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreAttributeController],
      providers: [{ provide: StoreAttributeService, useValue: mockService }],
    }).compile();

    controller = module.get<StoreAttributeController>(StoreAttributeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  describe('getAttributesByCategoryId', () => {
    it('should delegate to service and return the result', async () => {
      const expected = { data: [{ id: 'attr-1', categoryId: 'cat-1', slug: 'color', sortOrder: 1, translations: [] }] };
      mockService.getAttributesByCategoryId.mockResolvedValue(expected);

      const result = await controller.getAttributesByCategoryId({ categoryId: 'cat-1' });

      expect(result).toBe(expected);
      expect(mockService.getAttributesByCategoryId).toHaveBeenCalledWith('cat-1');
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.getAttributesByCategoryId.mockRejectedValue(new Error('service error'));

      await expect(controller.getAttributesByCategoryId({ categoryId: 'cat-1' })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('createAttribute', () => {
    it('should delegate to service and return the result', async () => {
      const expected = { id: 'new-attr' };
      mockService.createAttribute.mockResolvedValue(expected);

      const result = await controller.createAttribute({ categoryId: 'cat-1', slug: 'size' });

      expect(result).toBe(expected);
      expect(mockService.createAttribute).toHaveBeenCalledWith({ categoryId: 'cat-1', slug: 'size' });
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.createAttribute.mockRejectedValue(new Error('service error'));

      await expect(controller.createAttribute({ categoryId: 'cat-1', slug: 'size' })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('updateAttribute', () => {
    it('should delegate to service and return the result', async () => {
      const expected = { id: 'attr-1' };
      mockService.updateAttribute.mockResolvedValue(expected);

      const result = await controller.updateAttribute({ id: 'attr-1', slug: 'new-slug' });

      expect(result).toBe(expected);
      expect(mockService.updateAttribute).toHaveBeenCalledWith({ id: 'attr-1', slug: 'new-slug' });
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.updateAttribute.mockRejectedValue(new Error('service error'));

      await expect(controller.updateAttribute({ id: 'attr-1', slug: 'x' })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteAttribute', () => {
    it('should pass data.id to service and return the result', async () => {
      const expected = { success: true, message: 'Attribute deleted successfully' };
      mockService.deleteAttribute.mockResolvedValue(expected);

      const result = await controller.deleteAttribute({ id: 'attr-1' });

      expect(result).toBe(expected);
      expect(mockService.deleteAttribute).toHaveBeenCalledWith('attr-1');
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.deleteAttribute.mockRejectedValue(new Error('service error'));

      await expect(controller.deleteAttribute({ id: 'attr-1' })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('changeAttributePosition', () => {
    it('should delegate to service and return the result', async () => {
      const expected = { id: 'attr-1', categoryId: 'cat-1', slug: 'color', sortOrder: 3 };
      mockService.changeAttributePosition.mockResolvedValue(expected);

      const result = await controller.changeAttributePosition({ id: 'attr-1', sortOrder: 3 });

      expect(result).toBe(expected);
      expect(mockService.changeAttributePosition).toHaveBeenCalledWith({ id: 'attr-1', sortOrder: 3 });
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.changeAttributePosition.mockRejectedValue(new Error('service error'));

      await expect(controller.changeAttributePosition({ id: 'attr-1', sortOrder: 3 })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('upsertAttributeTranslation', () => {
    it('should delegate to service and return the result', async () => {
      const expected = { id: 'attr-1' };
      mockService.upsertAttributeTranslation.mockResolvedValue(expected);

      const result = await controller.upsertAttributeTranslation({ attributeId: 'attr-1', language: 1, name: 'Color' });

      expect(result).toBe(expected);
      expect(mockService.upsertAttributeTranslation).toHaveBeenCalledWith({
        attributeId: 'attr-1',
        language: 1,
        name: 'Color',
      });
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.upsertAttributeTranslation.mockRejectedValue(new Error('service error'));

      await expect(
        controller.upsertAttributeTranslation({ attributeId: 'attr-1', language: 1, name: 'Color' }),
      ).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteAttributeTranslation', () => {
    it('should pass data.id to service and return the result', async () => {
      const expected = { success: true, message: 'Attribute translation deleted successfully' };
      mockService.deleteAttributeTranslation.mockResolvedValue(expected);

      const result = await controller.deleteAttributeTranslation({ id: 'tr-1' });

      expect(result).toBe(expected);
      expect(mockService.deleteAttributeTranslation).toHaveBeenCalledWith('tr-1');
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.deleteAttributeTranslation.mockRejectedValue(new Error('service error'));

      await expect(controller.deleteAttributeTranslation({ id: 'tr-1' })).rejects.toThrow('service error');
    });
  });
});
