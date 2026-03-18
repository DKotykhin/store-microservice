import { Test, TestingModule } from '@nestjs/testing';

import { StoreAttributeRepository } from '../store-attribute.repository';

// ---------------------------------------------------------------------------
// Drizzle query-builder chain helpers
// ---------------------------------------------------------------------------

function makeSelectChain(resolvedValue: unknown) {
  const where = jest.fn().mockResolvedValue(resolvedValue);
  const from = jest.fn().mockReturnValue({ where });
  const select = jest.fn().mockReturnValue({ from });
  return { select, from, where };
}

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

describe('StoreAttributeRepository', () => {
  let repository: StoreAttributeRepository;
  let mockDb: {
    query: {
      attribute: { findFirst: jest.Mock; findMany: jest.Mock };
      attributeTranslation: Record<string, never>;
    };
    transaction: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        attribute: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
        attributeTranslation: {},
      },
      transaction: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreAttributeRepository, { provide: 'DATABASE_CONNECTION', useValue: mockDb }],
    }).compile();

    repository = module.get<StoreAttributeRepository>(StoreAttributeRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  describe('findAttributeById', () => {
    it('should return attribute when found', async () => {
      const attr = { id: 'attr-1', categoryId: 'cat-1', slug: 'color', sortOrder: 1 };
      mockDb.query.attribute.findFirst.mockResolvedValue(attr);

      const result = await repository.findAttributeById('attr-1');

      expect(result).toBe(attr);
      expect(mockDb.query.attribute.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should return null when not found', async () => {
      mockDb.query.attribute.findFirst.mockResolvedValue(undefined);

      const result = await repository.findAttributeById('missing');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  describe('findAttributesByCategoryId', () => {
    it('should return list of attributes ordered by sortOrder', async () => {
      const attrs = [
        { id: 'attr-1', categoryId: 'cat-1', slug: 'color', sortOrder: 1 },
        { id: 'attr-2', categoryId: 'cat-1', slug: 'size', sortOrder: 2 },
      ];
      mockDb.query.attribute.findMany.mockResolvedValue(attrs);

      const result = await repository.findAttributesByCategoryId('cat-1');

      expect(result).toBe(attrs);
      expect(mockDb.query.attribute.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no attributes found', async () => {
      mockDb.query.attribute.findMany.mockResolvedValue([]);

      const result = await repository.findAttributesByCategoryId('cat-1');

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  describe('findAttributesByCategoryIdWithTranslations', () => {
    it('should return attributes with translations', async () => {
      const attrs = [
        {
          id: 'attr-1',
          categoryId: 'cat-1',
          slug: 'color',
          sortOrder: 1,
          translations: [{ id: 'tr-1', language: 'EN', name: 'Color' }],
        },
      ];
      mockDb.query.attribute.findMany.mockResolvedValue(attrs);

      const result = await repository.findAttributesByCategoryIdWithTranslations('cat-1');

      expect(result).toBe(attrs);
      // Verify the query included "with: { translations: true }"
      expect(mockDb.query.attribute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ with: { translations: true } }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  describe('createAttribute', () => {
    it('should insert with sortOrder = maxOrder + 1', async () => {
      const newId = [{ id: 'new-attr' }];
      const selectChain = makeSelectChain([{ maxOrder: 3 }]);
      const insertChain = makeInsertChain(newId);

      const mockTx = {
        select: selectChain.select,
        insert: insertChain.insert,
      };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      const result = await repository.createAttribute({ categoryId: 'cat-1', slug: 'size' });

      expect(result).toEqual(newId);
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-1', slug: 'size', sortOrder: 4 }),
      );
    });

    it('should use sortOrder 1 when no attributes exist yet (maxOrder is null)', async () => {
      const newId = [{ id: 'first-attr' }];
      const selectChain = makeSelectChain([{ maxOrder: null }]);
      const insertChain = makeInsertChain(newId);

      const mockTx = {
        select: selectChain.select,
        insert: insertChain.insert,
      };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.createAttribute({ categoryId: 'cat-1', slug: 'first' });

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 1 }));
    });
  });

  // ---------------------------------------------------------------------------
  describe('updateAttribute', () => {
    it('should update slug when provided', async () => {
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue({ set: updateChain.set });

      await repository.updateAttribute({ id: 'attr-1', slug: 'new-slug' });

      expect(updateChain.set).toHaveBeenCalledWith({ slug: 'new-slug' });
      expect(updateChain.where).toHaveBeenCalledTimes(1);
    });

    it('should not include slug in set when slug is undefined', async () => {
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue({ set: updateChain.set });

      await repository.updateAttribute({ id: 'attr-1', slug: undefined });

      expect(updateChain.set).toHaveBeenCalledWith({});
    });

    it('should not include slug in set when slug is null', async () => {
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue({ set: updateChain.set });

      await repository.updateAttribute({ id: 'attr-1', slug: null as unknown as string });

      expect(updateChain.set).toHaveBeenCalledWith({});
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteAttributeWithPositionUpdate', () => {
    it('should delete the attribute within a transaction', async () => {
      const deleteChain = makeDeleteChain();
      const mockTx = {
        delete: deleteChain.delete,
        update: jest.fn(),
      };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.deleteAttributeWithPositionUpdate('attr-1', []);

      expect(deleteChain.delete).toHaveBeenCalledTimes(1);
      expect(mockTx.update).not.toHaveBeenCalled();
    });

    it('should update positions for remaining attributes', async () => {
      const deleteChain = makeDeleteChain();
      const updateChain = makeUpdateChain();
      const mockTx = {
        delete: deleteChain.delete,
        update: updateChain.update,
      };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.deleteAttributeWithPositionUpdate('attr-1', [
        { id: 'attr-2', position: 1 },
        { id: 'attr-3', position: 2 },
      ]);

      expect(updateChain.update).toHaveBeenCalledTimes(2);
      expect(updateChain.set).toHaveBeenCalledWith({ sortOrder: 1 });
      expect(updateChain.set).toHaveBeenCalledWith({ sortOrder: 2 });
    });

    it('should default to empty positionUpdates when not provided', async () => {
      const deleteChain = makeDeleteChain();
      const mockTx = {
        delete: deleteChain.delete,
        update: jest.fn(),
      };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.deleteAttributeWithPositionUpdate('attr-1');

      expect(mockTx.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('changeAttributePosition', () => {
    it('should update sortOrder for each entry in sortOrderUpdates', async () => {
      const updateChain = makeUpdateChain();
      const mockTx = { update: updateChain.update };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.changeAttributePosition('attr-2', [
        { id: 'attr-1', position: 2 },
        { id: 'attr-2', position: 3 },
      ]);

      expect(updateChain.update).toHaveBeenCalledTimes(2);
      expect(updateChain.set).toHaveBeenCalledWith({ sortOrder: 2 });
      expect(updateChain.set).toHaveBeenCalledWith({ sortOrder: 3 });
    });

    it('should not call update when sortOrderUpdates is empty', async () => {
      const updateChain = makeUpdateChain();
      const mockTx = { update: updateChain.update };
      mockDb.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

      await repository.changeAttributePosition('attr-1', []);

      expect(updateChain.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('createOrUpdateAttributeTranslation', () => {
    it('should insert and set onDuplicateKeyUpdate with the name', async () => {
      const insertChain = makeInsertChain(undefined);
      mockDb.insert.mockReturnValue({ values: insertChain.values });

      await repository.createOrUpdateAttributeTranslation({
        attributeId: 'attr-1',
        language: 'EN',
        name: 'Color',
      });

      expect(insertChain.values).toHaveBeenCalledWith({
        attributeId: 'attr-1',
        language: 'EN',
        name: 'Color',
      });
      expect(insertChain.onDuplicateKeyUpdate).toHaveBeenCalledWith({ set: { name: 'Color' } });
    });
  });

  // ---------------------------------------------------------------------------
  describe('deleteAttributeTranslation', () => {
    it('should delete translation and return result', async () => {
      const deleteResult = [{ affectedRows: 1 }];
      const deleteChain = makeDeleteChain(deleteResult);
      mockDb.delete.mockReturnValue({ where: deleteChain.where });

      const result = await repository.deleteAttributeTranslation('tr-1');

      expect(result).toBe(deleteResult);
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
      expect(deleteChain.where).toHaveBeenCalledTimes(1);
    });

    it('should return result with 0 affectedRows when translation not found', async () => {
      const deleteResult = [{ affectedRows: 0 }];
      const deleteChain = makeDeleteChain(deleteResult);
      mockDb.delete.mockReturnValue({ where: deleteChain.where });

      const result = await repository.deleteAttributeTranslation('missing');

      expect(result).toBe(deleteResult);
    });
  });
});
