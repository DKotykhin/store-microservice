import { Test, TestingModule } from '@nestjs/testing';

import { StoreCategoryRepository } from '../store-category.repository';

// ---------------------------------------------------------------------------
// Drizzle query-builder chain helpers
// ---------------------------------------------------------------------------

function makeUpdateChain(resolvedValue: unknown = undefined) {
  const where = jest.fn().mockResolvedValue(resolvedValue);
  const set = jest.fn().mockReturnValue({ where });
  const update = jest.fn().mockReturnValue({ set });
  return { update, set, where };
}

function makeInsertChain(resolvedValue: unknown = undefined) {
  const $returningId = jest.fn().mockResolvedValue(resolvedValue);
  const onDuplicateKeyUpdate = jest.fn().mockResolvedValue(resolvedValue);
  const values = jest.fn().mockReturnValue({ $returningId, onDuplicateKeyUpdate });
  const insert = jest.fn().mockReturnValue({ values });
  return { insert, values, $returningId, onDuplicateKeyUpdate };
}

function makeDeleteChain(resolvedValue: unknown = undefined) {
  const where = jest.fn().mockResolvedValue(resolvedValue);
  const del = jest.fn().mockReturnValue({ where });
  return { delete: del, where };
}

// ---------------------------------------------------------------------------

describe('StoreCategoryRepository', () => {
  let repository: StoreCategoryRepository;
  let mockDb: {
    query: {
      category: { findFirst: jest.Mock; findMany: jest.Mock };
      categoryTranslation: { findFirst: jest.Mock };
    };
    transaction: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        category: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
        categoryTranslation: {
          findFirst: jest.fn(),
        },
      },
      transaction: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreCategoryRepository, { provide: 'DATABASE_CONNECTION', useValue: mockDb }],
    }).compile();

    repository = module.get<StoreCategoryRepository>(StoreCategoryRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  describe('findStoreCategoryById', () => {
    it('should return category when found', async () => {
      const cat = { id: 'cat-1', slug: 'coffee', sortOrder: 1, isAvailable: true };
      mockDb.query.category.findFirst.mockResolvedValue(cat);

      const result = await repository.findStoreCategoryById('cat-1');

      expect(result).toBe(cat);
      expect(mockDb.query.category.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should return null when not found', async () => {
      mockDb.query.category.findFirst.mockResolvedValue(undefined);

      const result = await repository.findStoreCategoryById('missing');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  describe('findStoreCategoryList', () => {
    it('should return all categories ordered by sortOrder', async () => {
      const cats = [
        { id: 'cat-1', slug: 'coffee', sortOrder: 1 },
        { id: 'cat-2', slug: 'tea', sortOrder: 2 },
      ];
      mockDb.query.category.findMany.mockResolvedValue(cats);

      const result = await repository.findStoreCategoryList();

      expect(result).toBe(cats);
      expect(mockDb.query.category.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no categories exist', async () => {
      mockDb.query.category.findMany.mockResolvedValue([]);

      const result = await repository.findStoreCategoryList();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  describe('findStoreCategoryByIdWithTranslation', () => {
    it('should return category with translations when found', async () => {
      const cat = {
        id: 'cat-1',
        slug: 'coffee',
        sortOrder: 1,
        translations: [{ id: 'tr-1', language: 'EN', title: 'Coffee' }],
      };
      mockDb.query.category.findFirst.mockResolvedValue(cat);

      const result = await repository.findStoreCategoryByIdWithTranslation('cat-1');

      expect(result).toBe(cat);
      expect(mockDb.query.category.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ with: { translations: true } }),
      );
    });

    it('should return null when not found', async () => {
      mockDb.query.category.findFirst.mockResolvedValue(undefined);

      const result = await repository.findStoreCategoryByIdWithTranslation('missing');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  describe('findStoreCategoryListWithTranslation', () => {
    it('should return categories with translations filtered by language', async () => {
      const cats = [
        { id: 'cat-1', slug: 'coffee', sortOrder: 1, translations: [{ id: 'tr-1', language: 'EN', title: 'Coffee' }] },
      ];
      mockDb.query.category.findMany.mockResolvedValue(cats);

      const result = await repository.findStoreCategoryListWithTranslation('EN');

      expect(result).toBe(cats);
      // translations should be filtered by language (with.translations.where)
      expect(mockDb.query.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          with: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            translations: expect.objectContaining({ where: expect.anything() }),
          }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  describe('getDefaultTranslationForCategory', () => {
    it('should return the default-language translation when found', async () => {
      const translation = { id: 'tr-1', categoryId: 'cat-1', language: 'EN', title: 'Coffee' };
      mockDb.query.categoryTranslation.findFirst.mockResolvedValue(translation);

      const result = await repository.getDefaultTranslationForCategory('cat-1');

      expect(result).toBe(translation);
      expect(mockDb.query.categoryTranslation.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should return null when no default translation exists', async () => {
      mockDb.query.categoryTranslation.findFirst.mockResolvedValue(undefined);

      const result = await repository.getDefaultTranslationForCategory('cat-1');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  describe('createStoreCategory', () => {
    // createStoreCategory uses tx.select(...).from(table) with NO .where() — from() resolves directly
    function makeTxSelectChain(resolvedValue: unknown) {
      const from = jest.fn().mockResolvedValue(resolvedValue);
      const select = jest.fn().mockReturnValue({ from });
      return { select, from };
    }

    it('should insert with sortOrder = maxOrder + 1', async () => {
      const newId = [{ id: 'new-cat' }];
      const selectChain = makeTxSelectChain([{ maxOrder: 4 }]);
      const insertChain = makeInsertChain(newId);

      const mockTx = { select: selectChain.select, insert: insertChain.insert };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      const result = await repository.createStoreCategory({ slug: 'espresso' });

      expect(result).toEqual(newId);
      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ slug: 'espresso', sortOrder: 5 }));
    });

    it('should use sortOrder 1 when no categories exist yet (maxOrder is null)', async () => {
      const selectChain = makeTxSelectChain([{ maxOrder: null }]);
      const insertChain = makeInsertChain([{ id: 'first-cat' }]);

      const mockTx = { select: selectChain.select, insert: insertChain.insert };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.createStoreCategory({ slug: 'first' });

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 1 }));
    });

    it('should pass isAvailable when provided', async () => {
      const selectChain = makeTxSelectChain([{ maxOrder: 0 }]);
      const insertChain = makeInsertChain([{ id: 'cat-1' }]);

      const mockTx = { select: selectChain.select, insert: insertChain.insert };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.createStoreCategory({ slug: 'latte', isAvailable: false });

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ slug: 'latte', isAvailable: false }));
    });
  });

  // ---------------------------------------------------------------------------
  describe('updateStoreCategory', () => {
    it('should include slug and isAvailable when both are provided', async () => {
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue({ set: updateChain.set });

      await repository.updateStoreCategory({ id: 'cat-1', slug: 'new-slug', isAvailable: false });

      expect(updateChain.set).toHaveBeenCalledWith({ slug: 'new-slug', isAvailable: false });
    });

    it('should include only slug when isAvailable is undefined', async () => {
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue({ set: updateChain.set });

      await repository.updateStoreCategory({ id: 'cat-1', slug: 'new-slug', isAvailable: undefined });

      expect(updateChain.set).toHaveBeenCalledWith({ slug: 'new-slug' });
    });

    it('should include only isAvailable when slug is undefined', async () => {
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue({ set: updateChain.set });

      await repository.updateStoreCategory({ id: 'cat-1', slug: undefined, isAvailable: true });

      expect(updateChain.set).toHaveBeenCalledWith({ isAvailable: true });
    });

    it('should set empty object when both fields are undefined', async () => {
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue({ set: updateChain.set });

      await repository.updateStoreCategory({ id: 'cat-1', slug: undefined, isAvailable: undefined });

      expect(updateChain.set).toHaveBeenCalledWith({});
    });

    it('should not include slug when it is null', async () => {
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue({ set: updateChain.set });

      await repository.updateStoreCategory({ id: 'cat-1', slug: null as unknown as string, isAvailable: true });

      expect(updateChain.set).toHaveBeenCalledWith({ isAvailable: true });
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteStoreCategoryWithPositionUpdate', () => {
    it('should delete the category within a transaction', async () => {
      const deleteChain = makeDeleteChain();
      const mockTx = { delete: deleteChain.delete, update: jest.fn() };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.deleteStoreCategoryWithPositionUpdate('cat-1', []);

      expect(deleteChain.delete).toHaveBeenCalledTimes(1);
      expect(mockTx.update).not.toHaveBeenCalled();
    });

    it('should update positions for remaining categories', async () => {
      const deleteChain = makeDeleteChain();
      const updateChain = makeUpdateChain();
      const mockTx = { delete: deleteChain.delete, update: updateChain.update };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.deleteStoreCategoryWithPositionUpdate('cat-1', [
        { id: 'cat-2', position: 1 },
        { id: 'cat-3', position: 2 },
      ]);

      expect(updateChain.update).toHaveBeenCalledTimes(2);
      expect(updateChain.set).toHaveBeenCalledWith({ sortOrder: 1 });
      expect(updateChain.set).toHaveBeenCalledWith({ sortOrder: 2 });
    });

    it('should default to empty positionUpdates when not provided', async () => {
      const deleteChain = makeDeleteChain();
      const mockTx = { delete: deleteChain.delete, update: jest.fn() };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.deleteStoreCategoryWithPositionUpdate('cat-1');

      expect(mockTx.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('changeStoreCategoryPosition', () => {
    it('should update sortOrder for each entry in sortOrderUpdates', async () => {
      const updateChain = makeUpdateChain();
      const mockTx = { update: updateChain.update };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.changeStoreCategoryPosition('cat-2', [
        { id: 'cat-1', position: 2 },
        { id: 'cat-2', position: 3 },
      ]);

      expect(updateChain.update).toHaveBeenCalledTimes(2);
      expect(updateChain.set).toHaveBeenCalledWith({ sortOrder: 2 });
      expect(updateChain.set).toHaveBeenCalledWith({ sortOrder: 3 });
    });

    it('should not call update when sortOrderUpdates is empty', async () => {
      const updateChain = makeUpdateChain();
      const mockTx = { update: updateChain.update };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.changeStoreCategoryPosition('cat-1', []);

      expect(updateChain.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('createOrUpdateStoreCategoryTranslation', () => {
    it('should insert and call onDuplicateKeyUpdate with title and description', async () => {
      const insertChain = makeInsertChain(undefined);
      mockDb.insert.mockReturnValue({ values: insertChain.values });

      await repository.createOrUpdateStoreCategoryTranslation({
        categoryId: 'cat-1',
        title: 'Coffee',
        description: 'Best coffee',
        language: 'EN',
      });

      expect(insertChain.values).toHaveBeenCalledWith({
        categoryId: 'cat-1',
        title: 'Coffee',
        description: 'Best coffee',
        language: 'EN',
      });
      expect(insertChain.onDuplicateKeyUpdate).toHaveBeenCalledWith({
        set: { title: 'Coffee', description: 'Best coffee' },
      });
    });

    it('should default description to empty string when not provided', async () => {
      const insertChain = makeInsertChain(undefined);
      mockDb.insert.mockReturnValue({ values: insertChain.values });

      await repository.createOrUpdateStoreCategoryTranslation({
        categoryId: 'cat-1',
        title: 'Coffee',
        language: 'EN',
      });

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ description: '' }));
      expect(insertChain.onDuplicateKeyUpdate).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        set: expect.objectContaining({ description: '' }),
      });
    });

    it('should default description to empty string when null', async () => {
      const insertChain = makeInsertChain(undefined);
      mockDb.insert.mockReturnValue({ values: insertChain.values });

      await repository.createOrUpdateStoreCategoryTranslation({
        categoryId: 'cat-1',
        title: 'Coffee',
        description: null,
        language: 'EN',
      });

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ description: '' }));
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteStoreCategoryTranslation', () => {
    it('should delete translation and return result', async () => {
      const deleteResult = [{ affectedRows: 1 }];
      const deleteChain = makeDeleteChain(deleteResult);
      mockDb.delete.mockReturnValue({ where: deleteChain.where });

      const result = await repository.deleteStoreCategoryTranslation('tr-1');

      expect(result).toBe(deleteResult);
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
      expect(deleteChain.where).toHaveBeenCalledTimes(1);
    });

    it('should return result with 0 affectedRows when translation not found', async () => {
      const deleteResult = [{ affectedRows: 0 }];
      const deleteChain = makeDeleteChain(deleteResult);
      mockDb.delete.mockReturnValue({ where: deleteChain.where });

      const result = await repository.deleteStoreCategoryTranslation('missing');

      expect(result).toBe(deleteResult);
    });
  });
});
