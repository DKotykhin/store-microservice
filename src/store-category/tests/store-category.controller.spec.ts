import { Test, TestingModule } from '@nestjs/testing';

import { StoreCategoryController } from '../store-category.controller';
import { StoreCategoryService } from '../store-category.service';

const mockService = {
  findStoreCategoryByIdWithTranslation: jest.fn(),
  findStoreCategoryListWithTranslation: jest.fn(),
  createStoreCategory: jest.fn(),
  updateStoreCategory: jest.fn(),
  deleteStoreCategoryWithPositionUpdate: jest.fn(),
  changeStoreCategoryPosition: jest.fn(),
  createOrUpdateStoreCategoryTranslation: jest.fn(),
  deleteStoreCategoryTranslation: jest.fn(),
};

describe('StoreCategoryController', () => {
  let controller: StoreCategoryController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreCategoryController],
      providers: [{ provide: StoreCategoryService, useValue: mockService }],
    }).compile();

    controller = module.get<StoreCategoryController>(StoreCategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  describe('getStoreCategoryById', () => {
    it('should pass data.id to service and return the result', async () => {
      const expected = { category: { id: 'cat-1', slug: 'coffee', isAvailable: true, sortOrder: 1 }, translation: [] };
      mockService.findStoreCategoryByIdWithTranslation.mockResolvedValue(expected);

      const result = await controller.getStoreCategoryById({ id: 'cat-1' });

      expect(result).toBe(expected);
      expect(mockService.findStoreCategoryByIdWithTranslation).toHaveBeenCalledWith('cat-1');
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.findStoreCategoryByIdWithTranslation.mockRejectedValue(new Error('service error'));

      await expect(controller.getStoreCategoryById({ id: 'cat-1' })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('getStoreCategoryListWithTranslation', () => {
    it('should delegate the full data object to service and return the result', async () => {
      const expected = {
        data: [{ id: 'cat-1', slug: 'coffee', isAvailable: true, sortOrder: 1, title: 'Coffee', description: '' }],
      };
      mockService.findStoreCategoryListWithTranslation.mockResolvedValue(expected);

      const result = await controller.getStoreCategoryListWithTranslation({ language: 1 });

      expect(result).toBe(expected);
      expect(mockService.findStoreCategoryListWithTranslation).toHaveBeenCalledWith({ language: 1 });
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.findStoreCategoryListWithTranslation.mockRejectedValue(new Error('service error'));

      await expect(controller.getStoreCategoryListWithTranslation({ language: 1 })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('createStoreCategory', () => {
    it('should delegate to service and return the result', async () => {
      const expected = { id: 'new-cat' };
      mockService.createStoreCategory.mockResolvedValue(expected);

      const result = await controller.createStoreCategory({ slug: 'espresso', isAvailable: true });

      expect(result).toBe(expected);
      expect(mockService.createStoreCategory).toHaveBeenCalledWith({ slug: 'espresso', isAvailable: true });
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.createStoreCategory.mockRejectedValue(new Error('service error'));

      await expect(controller.createStoreCategory({ slug: 'espresso' })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('updateStoreCategory', () => {
    it('should delegate to service and return the result', async () => {
      const expected = { id: 'cat-1' };
      mockService.updateStoreCategory.mockResolvedValue(expected);

      const result = await controller.updateStoreCategory({ id: 'cat-1', slug: 'new-slug' });

      expect(result).toBe(expected);
      expect(mockService.updateStoreCategory).toHaveBeenCalledWith({ id: 'cat-1', slug: 'new-slug' });
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.updateStoreCategory.mockRejectedValue(new Error('service error'));

      await expect(controller.updateStoreCategory({ id: 'cat-1', slug: 'x' })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteStoreCategory', () => {
    it('should pass data.id to service and return the result', async () => {
      const expected = { success: true, message: 'Store category deleted successfully with position updates' };
      mockService.deleteStoreCategoryWithPositionUpdate.mockResolvedValue(expected);

      const result = await controller.deleteStoreCategory({ id: 'cat-1' });

      expect(result).toBe(expected);
      expect(mockService.deleteStoreCategoryWithPositionUpdate).toHaveBeenCalledWith('cat-1');
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.deleteStoreCategoryWithPositionUpdate.mockRejectedValue(new Error('service error'));

      await expect(controller.deleteStoreCategory({ id: 'cat-1' })).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('changeStoreCategoryPosition', () => {
    it('should delegate to service and return the result', async () => {
      const expected = { id: 'cat-1', slug: 'coffee', isAvailable: true, sortOrder: 3 };
      mockService.changeStoreCategoryPosition.mockResolvedValue(expected);

      const result = await controller.changeStoreCategoryPosition({ id: 'cat-1', sortOrder: 3 });

      expect(result).toBe(expected);
      expect(mockService.changeStoreCategoryPosition).toHaveBeenCalledWith({ id: 'cat-1', sortOrder: 3 });
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.changeStoreCategoryPosition.mockRejectedValue(new Error('service error'));

      await expect(controller.changeStoreCategoryPosition({ id: 'cat-1', sortOrder: 3 })).rejects.toThrow(
        'service error',
      );
    });
  });

  // ---------------------------------------------------------------------------
  describe('upsertStoreCategoryTranslation', () => {
    it('should delegate to service and return the result', async () => {
      const expected = { id: 'cat-1' };
      mockService.createOrUpdateStoreCategoryTranslation.mockResolvedValue(expected);

      const result = await controller.upsertStoreCategoryTranslation({
        categoryId: 'cat-1',
        title: 'Coffee',
        language: 1,
      });

      expect(result).toBe(expected);
      expect(mockService.createOrUpdateStoreCategoryTranslation).toHaveBeenCalledWith({
        categoryId: 'cat-1',
        title: 'Coffee',
        language: 1,
      });
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.createOrUpdateStoreCategoryTranslation.mockRejectedValue(new Error('service error'));

      await expect(
        controller.upsertStoreCategoryTranslation({ categoryId: 'cat-1', title: 'x', language: 1 }),
      ).rejects.toThrow('service error');
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteStoreCategoryTranslation', () => {
    it('should pass data.id to service and return the result', async () => {
      const expected = { success: true, message: 'Store category translation deleted successfully' };
      mockService.deleteStoreCategoryTranslation.mockResolvedValue(expected);

      const result = await controller.deleteStoreCategoryTranslation({ id: 'tr-1' });

      expect(result).toBe(expected);
      expect(mockService.deleteStoreCategoryTranslation).toHaveBeenCalledWith('tr-1');
    });

    it('should propagate errors thrown by the service', async () => {
      mockService.deleteStoreCategoryTranslation.mockRejectedValue(new Error('service error'));

      await expect(controller.deleteStoreCategoryTranslation({ id: 'tr-1' })).rejects.toThrow('service error');
    });
  });
});
