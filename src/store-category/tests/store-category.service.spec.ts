import { Test, TestingModule } from '@nestjs/testing';

import { AppError } from 'src/utils/errors/app-error';
import { StoreCategoryService } from '../store-category.service';
import { StoreCategoryRepository } from '../store-category.repository';

const mockRepository = {
  findStoreCategoryById: jest.fn(),
  findStoreCategoryList: jest.fn(),
  findStoreCategoryByIdWithTranslation: jest.fn(),
  findStoreCategoryListWithTranslation: jest.fn(),
  getDefaultTranslationForCategory: jest.fn(),
  createStoreCategory: jest.fn(),
  updateStoreCategory: jest.fn(),
  deleteStoreCategoryWithPositionUpdate: jest.fn(),
  changeStoreCategoryPosition: jest.fn(),
  createOrUpdateStoreCategoryTranslation: jest.fn(),
  deleteStoreCategoryTranslation: jest.fn(),
};

describe('StoreCategoryService', () => {
  let service: StoreCategoryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreCategoryService, { provide: StoreCategoryRepository, useValue: mockRepository }],
    }).compile();

    service = module.get<StoreCategoryService>(StoreCategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  describe('findStoreCategoryByIdWithTranslation', () => {
    it('should return mapped category with translations', async () => {
      mockRepository.findStoreCategoryByIdWithTranslation.mockResolvedValue({
        id: 'cat-1',
        slug: 'coffee',
        isAvailable: true,
        sortOrder: 1,
        translations: [{ id: 'tr-1', title: 'Coffee', description: 'Best coffee', language: 'EN' }],
      });

      const result = await service.findStoreCategoryByIdWithTranslation('cat-1');

      expect(result.category).toMatchObject({ id: 'cat-1', slug: 'coffee', isAvailable: true, sortOrder: 1 });
      expect(result.translation).toHaveLength(1);
      expect(result.translation[0]).toMatchObject({
        id: 'tr-1',
        title: 'Coffee',
        description: 'Best coffee',
        language: 1,
      });
    });

    it('should default description to empty string when null', async () => {
      mockRepository.findStoreCategoryByIdWithTranslation.mockResolvedValue({
        id: 'cat-1',
        slug: 'coffee',
        isAvailable: true,
        sortOrder: 1,
        translations: [{ id: 'tr-1', title: 'Coffee', description: null, language: 'EN' }],
      });

      const result = await service.findStoreCategoryByIdWithTranslation('cat-1');

      expect(result.translation[0].description).toBe('');
    });

    it('should throw notFound when category does not exist', async () => {
      mockRepository.findStoreCategoryByIdWithTranslation.mockResolvedValue(null);

      await expect(service.findStoreCategoryByIdWithTranslation('missing')).rejects.toBeInstanceOf(AppError);
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.notFound('Store category not found');
      mockRepository.findStoreCategoryByIdWithTranslation.mockRejectedValue(appError);

      await expect(service.findStoreCategoryByIdWithTranslation('cat-1')).rejects.toBe(appError);
    });

    it('should throw internalServerError for unexpected errors', async () => {
      mockRepository.findStoreCategoryByIdWithTranslation.mockRejectedValue(new Error('db error'));

      await expect(service.findStoreCategoryByIdWithTranslation('cat-1')).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('findStoreCategoryListWithTranslation', () => {
    it('should return mapped category list when all have translations', async () => {
      mockRepository.findStoreCategoryListWithTranslation.mockResolvedValue([
        {
          id: 'cat-1',
          slug: 'coffee',
          isAvailable: true,
          sortOrder: 1,
          translations: [{ id: 'tr-1', title: 'Coffee', description: 'Desc', language: 'EN' }],
        },
      ]);

      const result = await service.findStoreCategoryListWithTranslation({ language: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'cat-1',
        slug: 'coffee',
        title: 'Coffee',
        description: 'Desc',
      });
      expect(mockRepository.getDefaultTranslationForCategory).not.toHaveBeenCalled();
    });

    it('should fall back to default translation for categories missing a translation', async () => {
      mockRepository.findStoreCategoryListWithTranslation.mockResolvedValue([
        { id: 'cat-1', slug: 'coffee', isAvailable: true, sortOrder: 1, translations: [] },
      ]);
      mockRepository.getDefaultTranslationForCategory.mockResolvedValue({
        id: 'tr-default',
        title: 'Coffee (EN)',
        description: 'Default desc',
        language: 'EN',
      });

      const result = await service.findStoreCategoryListWithTranslation({ language: 2 });

      expect(mockRepository.getDefaultTranslationForCategory).toHaveBeenCalledWith('cat-1');
      expect(result.data[0].title).toBe('Coffee (EN)');
    });

    it('should use empty title and description when no translation and no default exists', async () => {
      mockRepository.findStoreCategoryListWithTranslation.mockResolvedValue([
        { id: 'cat-1', slug: 'coffee', isAvailable: true, sortOrder: 1, translations: [] },
      ]);
      mockRepository.getDefaultTranslationForCategory.mockResolvedValue(null);

      const result = await service.findStoreCategoryListWithTranslation({ language: 2 });

      expect(result.data[0].title).toBe('');
      expect(result.data[0].description).toBe('');
    });

    it('should default description to empty string when translation description is null', async () => {
      mockRepository.findStoreCategoryListWithTranslation.mockResolvedValue([
        {
          id: 'cat-1',
          slug: 'coffee',
          isAvailable: true,
          sortOrder: 1,
          translations: [{ id: 'tr-1', title: 'Coffee', description: null, language: 'EN' }],
        },
      ]);

      const result = await service.findStoreCategoryListWithTranslation({ language: 1 });

      expect(result.data[0].description).toBe('');
    });

    it('should throw notFound when no categories exist', async () => {
      mockRepository.findStoreCategoryListWithTranslation.mockResolvedValue([]);

      await expect(service.findStoreCategoryListWithTranslation({ language: 1 })).rejects.toBeInstanceOf(AppError);
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.notFound('No store categories found');
      mockRepository.findStoreCategoryListWithTranslation.mockRejectedValue(appError);

      await expect(service.findStoreCategoryListWithTranslation({ language: 1 })).rejects.toBe(appError);
    });

    it('should throw internalServerError for unexpected errors', async () => {
      mockRepository.findStoreCategoryListWithTranslation.mockRejectedValue(new Error('db error'));

      await expect(service.findStoreCategoryListWithTranslation({ language: 1 })).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('createStoreCategory', () => {
    it('should return the id from repository result', async () => {
      mockRepository.createStoreCategory.mockResolvedValue([{ id: 'new-cat' }]);

      const result = await service.createStoreCategory({ slug: 'espresso', isAvailable: true });

      expect(result).toEqual({ id: 'new-cat' });
      expect(mockRepository.createStoreCategory).toHaveBeenCalledWith({ slug: 'espresso', isAvailable: true });
    });

    it('should default isAvailable to false when not provided', async () => {
      mockRepository.createStoreCategory.mockResolvedValue([{ id: 'new-cat' }]);

      await service.createStoreCategory({ slug: 'latte' });

      expect(mockRepository.createStoreCategory).toHaveBeenCalledWith({ slug: 'latte', isAvailable: false });
    });

    it('should throw internalServerError when repository throws', async () => {
      mockRepository.createStoreCategory.mockRejectedValue(new Error('db error'));

      await expect(service.createStoreCategory({ slug: 'latte' })).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('updateStoreCategory', () => {
    it('should return the id when category exists', async () => {
      mockRepository.findStoreCategoryById.mockResolvedValue({ id: 'cat-1', slug: 'coffee', sortOrder: 1 });
      mockRepository.updateStoreCategory.mockResolvedValue(undefined);

      const result = await service.updateStoreCategory({ id: 'cat-1', slug: 'new-coffee' });

      expect(result).toEqual({ id: 'cat-1' });
      expect(mockRepository.updateStoreCategory).toHaveBeenCalledWith({ id: 'cat-1', slug: 'new-coffee' });
    });

    it('should throw notFound when category does not exist', async () => {
      mockRepository.findStoreCategoryById.mockResolvedValue(null);

      await expect(service.updateStoreCategory({ id: 'missing', slug: 'x' })).rejects.toBeInstanceOf(AppError);
      expect(mockRepository.updateStoreCategory).not.toHaveBeenCalled();
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.conflict('duplicate slug');
      mockRepository.findStoreCategoryById.mockResolvedValue({ id: 'cat-1' });
      mockRepository.updateStoreCategory.mockRejectedValue(appError);

      await expect(service.updateStoreCategory({ id: 'cat-1', slug: 'x' })).rejects.toBe(appError);
    });

    it('should throw internalServerError for unexpected errors', async () => {
      mockRepository.findStoreCategoryById.mockResolvedValue({ id: 'cat-1' });
      mockRepository.updateStoreCategory.mockRejectedValue(new Error('db error'));

      await expect(service.updateStoreCategory({ id: 'cat-1', slug: 'x' })).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteStoreCategoryWithPositionUpdate', () => {
    it('should delete and shift positions of categories after the deleted one', async () => {
      mockRepository.findStoreCategoryList.mockResolvedValue([
        { id: 'cat-1', sortOrder: 1 },
        { id: 'cat-2', sortOrder: 2 },
        { id: 'cat-3', sortOrder: 3 },
      ]);
      mockRepository.deleteStoreCategoryWithPositionUpdate.mockResolvedValue(undefined);

      const result = await service.deleteStoreCategoryWithPositionUpdate('cat-2');

      expect(result).toEqual({ success: true, message: 'Store category deleted successfully with position updates' });
      expect(mockRepository.deleteStoreCategoryWithPositionUpdate).toHaveBeenCalledWith('cat-2', [
        { id: 'cat-3', position: 2 },
      ]);
    });

    it('should pass empty positionUpdates when deleting the last category', async () => {
      mockRepository.findStoreCategoryList.mockResolvedValue([
        { id: 'cat-1', sortOrder: 1 },
        { id: 'cat-2', sortOrder: 2 },
      ]);
      mockRepository.deleteStoreCategoryWithPositionUpdate.mockResolvedValue(undefined);

      await service.deleteStoreCategoryWithPositionUpdate('cat-2');

      expect(mockRepository.deleteStoreCategoryWithPositionUpdate).toHaveBeenCalledWith('cat-2', []);
    });

    it('should throw notFound when category is not in the list', async () => {
      mockRepository.findStoreCategoryList.mockResolvedValue([{ id: 'cat-1', sortOrder: 1 }]);

      await expect(service.deleteStoreCategoryWithPositionUpdate('missing')).rejects.toBeInstanceOf(AppError);
      expect(mockRepository.deleteStoreCategoryWithPositionUpdate).not.toHaveBeenCalled();
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.notFound('Store category not found');
      mockRepository.findStoreCategoryList.mockRejectedValue(appError);

      await expect(service.deleteStoreCategoryWithPositionUpdate('cat-1')).rejects.toBe(appError);
    });

    it('should throw internalServerError for unexpected errors', async () => {
      mockRepository.findStoreCategoryList.mockRejectedValue(new Error('db error'));

      await expect(service.deleteStoreCategoryWithPositionUpdate('cat-1')).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('changeStoreCategoryPosition', () => {
    const categoryList = [
      { id: 'cat-1', slug: 'a', isAvailable: true, sortOrder: 1 },
      { id: 'cat-2', slug: 'b', isAvailable: true, sortOrder: 2 },
      { id: 'cat-3', slug: 'c', isAvailable: true, sortOrder: 3 },
    ];

    beforeEach(() => {
      mockRepository.findStoreCategoryList.mockResolvedValue(categoryList);
      mockRepository.changeStoreCategoryPosition.mockResolvedValue(undefined);
    });

    it('should move category forward (2 → 3) and shift others back', async () => {
      mockRepository.findStoreCategoryById.mockResolvedValue({ ...categoryList[1], sortOrder: 3 });

      const result = await service.changeStoreCategoryPosition({ id: 'cat-2', sortOrder: 3 });

      expect(result.sortOrder).toBe(3);
      expect(mockRepository.changeStoreCategoryPosition).toHaveBeenCalledWith(
        'cat-2',
        expect.arrayContaining([
          { id: 'cat-2', position: 3 },
          { id: 'cat-3', position: 2 },
        ]),
      );
    });

    it('should move category backward (2 → 1) and shift others forward', async () => {
      mockRepository.findStoreCategoryById.mockResolvedValue({ ...categoryList[1], sortOrder: 1 });

      const result = await service.changeStoreCategoryPosition({ id: 'cat-2', sortOrder: 1 });

      expect(result.sortOrder).toBe(1);
      expect(mockRepository.changeStoreCategoryPosition).toHaveBeenCalledWith(
        'cat-2',
        expect.arrayContaining([
          { id: 'cat-2', position: 1 },
          { id: 'cat-1', position: 2 },
        ]),
      );
    });

    it('should throw notFound when category is not in the list', async () => {
      mockRepository.findStoreCategoryList.mockResolvedValue([{ id: 'cat-1', sortOrder: 1 }]);

      await expect(service.changeStoreCategoryPosition({ id: 'missing', sortOrder: 1 })).rejects.toBeInstanceOf(
        AppError,
      );
    });

    it('should throw badRequest when sortOrder is below 1', async () => {
      await expect(service.changeStoreCategoryPosition({ id: 'cat-2', sortOrder: 0 })).rejects.toBeInstanceOf(AppError);
    });

    it('should throw badRequest when sortOrder exceeds list length', async () => {
      await expect(
        service.changeStoreCategoryPosition({ id: 'cat-2', sortOrder: categoryList.length + 1 }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it('should throw notFound when category is gone after update', async () => {
      mockRepository.findStoreCategoryById.mockResolvedValue(null);

      await expect(service.changeStoreCategoryPosition({ id: 'cat-2', sortOrder: 3 })).rejects.toBeInstanceOf(AppError);
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.notFound('Store category not found');
      mockRepository.findStoreCategoryList.mockRejectedValue(appError);

      await expect(service.changeStoreCategoryPosition({ id: 'cat-2', sortOrder: 2 })).rejects.toBe(appError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('createOrUpdateStoreCategoryTranslation', () => {
    it('should call repository with mapped language and return categoryId', async () => {
      mockRepository.createOrUpdateStoreCategoryTranslation.mockResolvedValue(undefined);

      const result = await service.createOrUpdateStoreCategoryTranslation({
        categoryId: 'cat-1',
        title: 'Coffee',
        description: 'Best coffee',
        language: 1, // EN
      });

      expect(result).toEqual({ id: 'cat-1' });
      expect(mockRepository.createOrUpdateStoreCategoryTranslation).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-1', title: 'Coffee', language: 'EN' }),
      );
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.internalServerError();
      mockRepository.createOrUpdateStoreCategoryTranslation.mockRejectedValue(appError);

      await expect(
        service.createOrUpdateStoreCategoryTranslation({ categoryId: 'cat-1', title: 'x', language: 1 }),
      ).rejects.toBe(appError);
    });

    it('should throw internalServerError for unexpected errors', async () => {
      mockRepository.createOrUpdateStoreCategoryTranslation.mockRejectedValue(new Error('db error'));

      await expect(
        service.createOrUpdateStoreCategoryTranslation({ categoryId: 'cat-1', title: 'x', language: 1 }),
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteStoreCategoryTranslation', () => {
    it('should return success when translation exists', async () => {
      mockRepository.deleteStoreCategoryTranslation.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await service.deleteStoreCategoryTranslation('tr-1');

      expect(result).toEqual({ success: true, message: 'Store category translation deleted successfully' });
    });

    it('should throw notFound when no rows affected', async () => {
      mockRepository.deleteStoreCategoryTranslation.mockResolvedValue([{ affectedRows: 0 }]);

      await expect(service.deleteStoreCategoryTranslation('missing')).rejects.toBeInstanceOf(AppError);
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.notFound('Store category translation not found');
      mockRepository.deleteStoreCategoryTranslation.mockRejectedValue(appError);

      await expect(service.deleteStoreCategoryTranslation('tr-1')).rejects.toBe(appError);
    });

    it('should throw internalServerError for unexpected errors', async () => {
      mockRepository.deleteStoreCategoryTranslation.mockRejectedValue(new Error('db error'));

      await expect(service.deleteStoreCategoryTranslation('tr-1')).rejects.toBeInstanceOf(AppError);
    });
  });
});
