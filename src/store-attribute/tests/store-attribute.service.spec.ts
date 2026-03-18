import { Test, TestingModule } from '@nestjs/testing';

import { AppError } from 'src/utils/errors/app-error';
import { StoreAttributeService } from '../store-attribute.service';
import { StoreAttributeRepository } from '../store-attribute.repository';

const mockRepository = {
  findAttributesByCategoryIdWithTranslations: jest.fn(),
  findAttributesByCategoryId: jest.fn(),
  findAttributeById: jest.fn(),
  createAttribute: jest.fn(),
  updateAttribute: jest.fn(),
  deleteAttributeWithPositionUpdate: jest.fn(),
  changeAttributePosition: jest.fn(),
  createOrUpdateAttributeTranslation: jest.fn(),
  deleteAttributeTranslation: jest.fn(),
};

describe('StoreAttributeService', () => {
  let service: StoreAttributeService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreAttributeService, { provide: StoreAttributeRepository, useValue: mockRepository }],
    }).compile();

    service = module.get<StoreAttributeService>(StoreAttributeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  describe('getAttributesByCategoryId', () => {
    it('should return mapped attribute list', async () => {
      mockRepository.findAttributesByCategoryIdWithTranslations.mockResolvedValue([
        {
          id: 'attr-1',
          categoryId: 'cat-1',
          slug: 'color',
          sortOrder: 1,
          translations: [{ id: 'tr-1', language: 'EN', name: 'Color' }],
        },
      ]);

      const result = await service.getAttributesByCategoryId('cat-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'attr-1',
        categoryId: 'cat-1',
        slug: 'color',
        sortOrder: 1,
      });
      expect(result.data[0].translations[0]).toMatchObject({
        id: 'tr-1',
        name: 'Color',
        language: 1, // EN → 1 via mapLanguageToProto
      });
    });

    it('should throw internalServerError when repository throws', async () => {
      mockRepository.findAttributesByCategoryIdWithTranslations.mockRejectedValue(new Error('db error'));

      await expect(service.getAttributesByCategoryId('cat-1')).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('createAttribute', () => {
    it('should return the id from repository result', async () => {
      mockRepository.createAttribute.mockResolvedValue([{ id: 'new-attr-id' }]);

      const result = await service.createAttribute({ categoryId: 'cat-1', slug: 'size' });

      expect(result).toEqual({ id: 'new-attr-id' });
      expect(mockRepository.createAttribute).toHaveBeenCalledWith({ categoryId: 'cat-1', slug: 'size' });
    });

    it('should throw internalServerError when repository throws', async () => {
      mockRepository.createAttribute.mockRejectedValue(new Error('db error'));

      await expect(service.createAttribute({ categoryId: 'cat-1', slug: 'size' })).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('updateAttribute', () => {
    it('should return the id when attribute exists', async () => {
      mockRepository.findAttributeById.mockResolvedValue({
        id: 'attr-1',
        categoryId: 'cat-1',
        slug: 'color',
        sortOrder: 1,
      });
      mockRepository.updateAttribute.mockResolvedValue(undefined);

      const result = await service.updateAttribute({ id: 'attr-1', slug: 'new-color' });

      expect(result).toEqual({ id: 'attr-1' });
      expect(mockRepository.updateAttribute).toHaveBeenCalledWith({ id: 'attr-1', slug: 'new-color' });
    });

    it('should throw notFound when attribute does not exist', async () => {
      mockRepository.findAttributeById.mockResolvedValue(null);

      await expect(service.updateAttribute({ id: 'missing', slug: 'x' })).rejects.toBeInstanceOf(AppError);
      expect(mockRepository.updateAttribute).not.toHaveBeenCalled();
    });

    it('should rethrow AppError from repository', async () => {
      const appError = AppError.conflict('duplicate slug');
      mockRepository.findAttributeById.mockResolvedValue({ id: 'attr-1' });
      mockRepository.updateAttribute.mockRejectedValue(appError);

      await expect(service.updateAttribute({ id: 'attr-1', slug: 'x' })).rejects.toBe(appError);
    });

    it('should throw internalServerError for non-AppError from repository', async () => {
      mockRepository.findAttributeById.mockResolvedValue({ id: 'attr-1' });
      mockRepository.updateAttribute.mockRejectedValue(new Error('db error'));

      await expect(service.updateAttribute({ id: 'attr-1', slug: 'x' })).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteAttribute', () => {
    const existingAttribute = { id: 'attr-2', categoryId: 'cat-1', slug: 'size', sortOrder: 2 };

    it('should delete and return success when attribute exists', async () => {
      mockRepository.findAttributeById.mockResolvedValue(existingAttribute);
      mockRepository.findAttributesByCategoryId.mockResolvedValue([
        { id: 'attr-1', sortOrder: 1 },
        { id: 'attr-2', sortOrder: 2 },
        { id: 'attr-3', sortOrder: 3 },
      ]);
      mockRepository.deleteAttributeWithPositionUpdate.mockResolvedValue(undefined);

      const result = await service.deleteAttribute('attr-2');

      expect(result).toEqual({ success: true, message: 'Attribute deleted successfully' });
      // attr-3 should have its position decremented
      expect(mockRepository.deleteAttributeWithPositionUpdate).toHaveBeenCalledWith('attr-2', [
        { id: 'attr-3', position: 2 },
      ]);
    });

    it('should throw notFound when attribute does not exist', async () => {
      mockRepository.findAttributeById.mockResolvedValue(null);

      await expect(service.deleteAttribute('missing')).rejects.toBeInstanceOf(AppError);
      expect(mockRepository.deleteAttributeWithPositionUpdate).not.toHaveBeenCalled();
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.notFound('Attribute not found');
      mockRepository.findAttributeById.mockRejectedValue(appError);

      await expect(service.deleteAttribute('attr-1')).rejects.toBe(appError);
    });

    it('should throw internalServerError for unexpected errors', async () => {
      mockRepository.findAttributeById.mockRejectedValue(new Error('db error'));

      await expect(service.deleteAttribute('attr-1')).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('changeAttributePosition', () => {
    const attribute = { id: 'attr-2', categoryId: 'cat-1', slug: 'size', sortOrder: 2 };
    const categoryAttributes = [
      { id: 'attr-1', categoryId: 'cat-1', slug: 'color', sortOrder: 1 },
      { id: 'attr-2', categoryId: 'cat-1', slug: 'size', sortOrder: 2 },
      { id: 'attr-3', categoryId: 'cat-1', slug: 'material', sortOrder: 3 },
    ];

    beforeEach(() => {
      mockRepository.findAttributeById.mockResolvedValue(attribute);
      mockRepository.findAttributesByCategoryId.mockResolvedValue(categoryAttributes);
      mockRepository.changeAttributePosition.mockResolvedValue(undefined);
    });

    it('should move attribute forward (2 → 3) and shift others back', async () => {
      mockRepository.findAttributeById
        .mockResolvedValueOnce(attribute)
        .mockResolvedValueOnce({ ...attribute, sortOrder: 3 });

      const result = await service.changeAttributePosition({ id: 'attr-2', sortOrder: 3 });

      expect(result.sortOrder).toBe(3);
      expect(mockRepository.changeAttributePosition).toHaveBeenCalledWith(
        'attr-2',
        expect.arrayContaining([
          { id: 'attr-2', position: 3 },
          { id: 'attr-3', position: 2 },
        ]),
      );
    });

    it('should move attribute backward (2 → 1) and shift others forward', async () => {
      mockRepository.findAttributeById
        .mockResolvedValueOnce(attribute)
        .mockResolvedValueOnce({ ...attribute, sortOrder: 1 });

      const result = await service.changeAttributePosition({ id: 'attr-2', sortOrder: 1 });

      expect(result.sortOrder).toBe(1);
      expect(mockRepository.changeAttributePosition).toHaveBeenCalledWith(
        'attr-2',
        expect.arrayContaining([
          { id: 'attr-2', position: 1 },
          { id: 'attr-1', position: 2 },
        ]),
      );
    });

    it('should throw notFound when attribute does not exist', async () => {
      mockRepository.findAttributeById.mockResolvedValue(null);

      await expect(service.changeAttributePosition({ id: 'missing', sortOrder: 1 })).rejects.toBeInstanceOf(AppError);
    });

    it('should throw badRequest when sortOrder is out of range (too low)', async () => {
      await expect(service.changeAttributePosition({ id: 'attr-2', sortOrder: 0 })).rejects.toBeInstanceOf(AppError);
    });

    it('should throw badRequest when sortOrder is out of range (too high)', async () => {
      await expect(
        service.changeAttributePosition({ id: 'attr-2', sortOrder: categoryAttributes.length + 1 }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it('should throw notFound if attribute is gone after update', async () => {
      mockRepository.findAttributeById.mockResolvedValueOnce(attribute).mockResolvedValueOnce(null);

      await expect(service.changeAttributePosition({ id: 'attr-2', sortOrder: 3 })).rejects.toBeInstanceOf(AppError);
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.notFound('Attribute not found');
      mockRepository.findAttributeById.mockRejectedValue(appError);

      await expect(service.changeAttributePosition({ id: 'attr-2', sortOrder: 2 })).rejects.toBe(appError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('upsertAttributeTranslation', () => {
    it('should call repository and return attributeId', async () => {
      mockRepository.createOrUpdateAttributeTranslation.mockResolvedValue(undefined);

      const result = await service.upsertAttributeTranslation({ attributeId: 'attr-1', language: 1, name: 'Color' });

      expect(result).toEqual({ id: 'attr-1' });
      expect(mockRepository.createOrUpdateAttributeTranslation).toHaveBeenCalledWith({
        attributeId: 'attr-1',
        language: 'EN', // 1 → EN via mapLanguageFromProto
        name: 'Color',
      });
    });

    it('should throw internalServerError when repository throws', async () => {
      mockRepository.createOrUpdateAttributeTranslation.mockRejectedValue(new Error('db error'));

      await expect(
        service.upsertAttributeTranslation({ attributeId: 'attr-1', language: 1, name: 'Color' }),
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteAttributeTranslation', () => {
    it('should return success when translation exists', async () => {
      mockRepository.deleteAttributeTranslation.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await service.deleteAttributeTranslation('tr-1');

      expect(result).toEqual({ success: true, message: 'Attribute translation deleted successfully' });
    });

    it('should throw notFound when no rows affected', async () => {
      mockRepository.deleteAttributeTranslation.mockResolvedValue([{ affectedRows: 0 }]);

      await expect(service.deleteAttributeTranslation('missing')).rejects.toBeInstanceOf(AppError);
    });

    it('should rethrow AppError', async () => {
      const appError = AppError.notFound('Attribute translation not found');
      mockRepository.deleteAttributeTranslation.mockRejectedValue(appError);

      await expect(service.deleteAttributeTranslation('tr-1')).rejects.toBe(appError);
    });

    it('should throw internalServerError for unexpected errors', async () => {
      mockRepository.deleteAttributeTranslation.mockRejectedValue(new Error('db error'));

      await expect(service.deleteAttributeTranslation('tr-1')).rejects.toBeInstanceOf(AppError);
    });
  });
});
