import { Inject, Injectable, Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, asc, eq, gte, max, sql } from 'drizzle-orm';

import * as schema from 'src/database/schema';
import type { Currency, LanguageEnum, PriceType } from 'src/database/enums';
import type {
  AddStoreItemImageRequest,
  AddStoreItemVariantRequest,
  AttemptReserveStockRequest,
  AttemptReserveStockResponse,
  CreateStoreItemRequest,
  ReleaseStockRequest,
  ReturnStockRequest,
  UpdateStoreItemRequest,
} from 'src/generated-types/store-item';

@Injectable()
export class StoreItemRepository {
  private readonly logger = new Logger(StoreItemRepository.name);
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly drizzleDb: ReturnType<typeof drizzle<typeof schema>>,
  ) {}

  // get store items by store category id with translations for a specific language
  async findStoreItemsByCategoryIdWithTranslation(
    categoryId: string,
    language: LanguageEnum,
  ): Promise<schema.ItemWithRelations[]> {
    this.logger.debug(
      `Querying store items for category id: ${categoryId} with translations for language: ${language}`,
    );
    const items = await this.drizzleDb.query.item.findMany({
      where: eq(schema.item.categoryId, categoryId),
      orderBy: asc(schema.item.sortOrder),
      with: {
        translations: {
          where: eq(schema.itemTranslation.language, language),
        },
        prices: true,
        images: true,
        attributes: {
          with: {
            prices: true,
            translations: {
              where: eq(schema.itemAttributeTranslation.language, language),
            },
            attribute: {
              with: {
                translations: {
                  where: eq(schema.attributeTranslation.language, language),
                },
              },
            },
          },
        },
      },
    });

    return items;
  }

  // get store items by store category slug with translations for a specific language
  async findStoreItemsByCategorySlugWithTranslation(
    categorySlug: string,
    language: LanguageEnum,
  ): Promise<schema.ItemWithRelations[]> {
    this.logger.debug(
      `Querying store items for category slug: ${categorySlug} with translations for language: ${language}`,
    );
    const items = await this.drizzleDb.transaction(async (tx) => {
      const category = await tx.query.category.findFirst({
        where: eq(schema.category.slug, categorySlug),
      });

      if (!category) {
        this.logger.warn(`Store category with slug: ${categorySlug} not found`);
        return [];
      }

      const items = await tx.query.item.findMany({
        where: eq(schema.item.categoryId, category.id),
        orderBy: asc(schema.item.sortOrder),
        with: {
          translations: {
            where: eq(schema.itemTranslation.language, language),
          },
          prices: true,
          images: true,
          attributes: {
            with: {
              prices: true,
              translations: {
                where: eq(schema.itemAttributeTranslation.language, language),
              },
              attribute: {
                with: {
                  translations: {
                    where: eq(schema.attributeTranslation.language, language),
                  },
                },
              },
            },
          },
        },
      });

      return items;
    });

    return items;
  }

  // get store item by id with translations for a specific language
  async findStoreItemsByIdWithTranslation(
    itemId: string,
    language: LanguageEnum,
  ): Promise<schema.ItemWithRelations | null> {
    this.logger.debug(`Querying store item for id: ${itemId} with translations for language: ${language}`);
    const item = await this.drizzleDb.query.item.findFirst({
      where: eq(schema.item.id, itemId),
      with: {
        translations: {
          where: eq(schema.itemTranslation.language, language),
        },
        prices: true,
        images: true,
        attributes: {
          with: {
            prices: true,
            translations: {
              where: eq(schema.itemAttributeTranslation.language, language),
            },
            attribute: {
              with: {
                translations: {
                  where: eq(schema.attributeTranslation.language, language),
                },
              },
            },
          },
        },
      },
    });

    return item || null;
  }

  // create store item
  async createStoreItem(data: CreateStoreItemRequest): Promise<{ id: string }> {
    this.logger.debug(`Creating store item with data: ${JSON.stringify(data)}`);
    return await this.drizzleDb.transaction(async (tx) => {
      const [{ maxOrder }] = await tx
        .select({ maxOrder: max(schema.item.sortOrder) })
        .from(schema.item)
        .where(eq(schema.item.categoryId, data.categoryId));
      const nextSortOrder = (maxOrder ?? 0) + 1;

      const [createdItem] = await tx
        .insert(schema.item)
        .values({
          ...data,
          sortOrder: nextSortOrder,
          isAvailable: data.isAvailable ?? false,
        })
        .$returningId();

      return { id: createdItem.id };
    });
  }

  // update store item by id
  async updateStoreItem(data: UpdateStoreItemRequest): Promise<void> {
    this.logger.debug(`Updating store item with data: ${JSON.stringify(data)}`);
    const { itemId, ...updateData } = data;
    await this.drizzleDb
      .update(schema.item)
      .set({
        ...(updateData.categoryId !== undefined &&
          updateData.categoryId !== null && { categoryId: updateData.categoryId }),
        ...(updateData.slug !== undefined && updateData.slug !== null && { slug: updateData.slug }),
        ...(updateData.brand !== undefined && updateData.brand !== null && { brand: updateData.brand }),
        ...(updateData.expectedDate !== undefined &&
          updateData.expectedDate !== null && { expectedDate: updateData.expectedDate }),
        ...(data.isAvailable !== undefined && data.isAvailable !== null && { isAvailable: data.isAvailable }),
        ...(updateData.quantity !== undefined && { quantity: updateData.quantity ?? null }),
      })
      .where(eq(schema.item.id, itemId));
  }

  // delete store item by id and update positions of remaining items in the same category
  async deleteStoreItemWithPositionUpdate(
    id: string,
    categoryId: string,
    positionUpdates: Array<{ id: string; position: number }> = [],
  ): Promise<void> {
    this.logger.debug(
      `Deleting store item with id: ${id}, categoryId: ${categoryId}, and position updates: ${JSON.stringify(positionUpdates)}`,
    );
    await this.drizzleDb.transaction(async (tx) => {
      await tx.delete(schema.item).where(eq(schema.item.id, id));
      for (const update of positionUpdates) {
        await tx.update(schema.item).set({ sortOrder: update.position }).where(eq(schema.item.id, update.id));
      }
    });
  }

  // create or update store item translation
  async upsertStoreItemTranslation(data: {
    itemId: string;
    language: LanguageEnum;
    title: string;
    description?: string | null;
    detailedDescription?: string | null;
  }): Promise<void> {
    this.logger.debug(
      `Upserting store item translation for itemId: ${data.itemId}, language: ${data.language}, data: ${JSON.stringify(data)}`,
    );
    await this.drizzleDb.transaction(async (tx) => {
      const existingTranslation = await tx.query.itemTranslation.findFirst({
        where: and(eq(schema.itemTranslation.itemId, data.itemId), eq(schema.itemTranslation.language, data.language)),
      });

      if (existingTranslation) {
        await tx
          .update(schema.itemTranslation)
          .set({
            title: data.title,
            description: data.description || null,
            detailedDescription: data.detailedDescription || null,
          })
          .where(eq(schema.itemTranslation.id, existingTranslation.id));
      } else {
        await tx.insert(schema.itemTranslation).values({
          itemId: data.itemId,
          language: data.language,
          title: data.title,
          description: data.description || null,
          detailedDescription: data.detailedDescription || null,
        });
      }
    });
  }

  // delete store item translation by id
  async deleteStoreItemTranslation(id: string): Promise<void> {
    this.logger.debug(`Deleting store item translation with id: ${id}`);
    await this.drizzleDb.delete(schema.itemTranslation).where(eq(schema.itemTranslation.id, id));
  }

  // add store item image and return the new image id
  async addStoreItemImage(data: AddStoreItemImageRequest): Promise<{ id: string }> {
    const { itemId, url } = data;
    this.logger.debug(`Adding image to store item with id: ${itemId}, imageUrl: ${url}`);
    const [created] = await this.drizzleDb
      .insert(schema.image)
      .values({
        itemId,
        url,
        alt: data.alt || null,
        ...(data.sortOrder !== undefined && data.sortOrder !== null && { sortOrder: data.sortOrder }),
      })
      .$returningId();
    return { id: created.id };
  }

  // delete store item image by id
  async deleteStoreItemImage(id: string): Promise<void> {
    this.logger.debug(`Deleting store item image with id: ${id}`);
    await this.drizzleDb.delete(schema.image).where(eq(schema.image.id, id));
  }

  // change store item image sort order (bulk updates to keep positions consistent)
  async changeStoreItemImagePosition(
    imageId: string,
    sortOrderUpdates: Array<{ id: string; position: number }>,
  ): Promise<void> {
    this.logger.debug(`Changing position of image ${imageId}, updates: ${JSON.stringify(sortOrderUpdates)}`);
    await this.drizzleDb.transaction(async (tx) => {
      for (const update of sortOrderUpdates) {
        await tx.update(schema.image).set({ sortOrder: update.position }).where(eq(schema.image.id, update.id));
      }
    });
  }

  // change store item sort order (bulk updates to keep positions consistent)
  async changeStoreItemPosition(
    itemId: string,
    sortOrderUpdates: Array<{ id: string; position: number }>,
  ): Promise<void> {
    this.logger.debug(`Changing position of item ${itemId}, updates: ${JSON.stringify(sortOrderUpdates)}`);
    await this.drizzleDb.transaction(async (tx) => {
      for (const update of sortOrderUpdates) {
        await tx.update(schema.item).set({ sortOrder: update.position }).where(eq(schema.item.id, update.id));
      }
    });
  }

  // link an existing attribute to a store item (admin flow step 6)
  async addStoreItemVariant(data: AddStoreItemVariantRequest): Promise<{ id: string }> {
    this.logger.debug(`Linking attribute ${data.attributeId} to item ${data.itemId}`);
    const [created] = await this.drizzleDb
      .insert(schema.itemAttribute)
      .values({ itemId: data.itemId, attributeId: data.attributeId, quantity: data.quantity ?? null })
      .$returningId();
    return { id: created.id };
  }

  // create or update the translated value for a variant in a specific language (admin flow step 7)
  async upsertItemAttributeTranslation(data: {
    itemAttributeId: string;
    language: LanguageEnum;
    value: string;
  }): Promise<{ id: string }> {
    this.logger.debug(
      `Upserting item attribute translation for item_attribute ${data.itemAttributeId}, language: ${data.language}`,
    );
    await this.drizzleDb
      .insert(schema.itemAttributeTranslation)
      .values({ itemAttributeId: data.itemAttributeId, language: data.language, value: data.value })
      .onDuplicateKeyUpdate({ set: { value: data.value } });
    return { id: data.itemAttributeId };
  }

  // add a price for a variant; looks up the itemId from item_attribute (admin flow step 8)
  async addVariantPrice(data: {
    itemAttributeId: string;
    priceType: PriceType;
    value: string;
    currency: Currency;
  }): Promise<{ id: string }> {
    this.logger.debug(`Adding variant price for item_attribute ${data.itemAttributeId}: ${JSON.stringify(data)}`);
    const itemAttribute = await this.drizzleDb.query.itemAttribute.findFirst({
      where: eq(schema.itemAttribute.id, data.itemAttributeId),
    });
    if (!itemAttribute) {
      throw new Error(`Item attribute with id ${data.itemAttributeId} not found`);
    }
    const [created] = await this.drizzleDb
      .insert(schema.itemPrice)
      .values({
        itemId: itemAttribute.itemId,
        itemAttributeId: data.itemAttributeId,
        priceType: data.priceType,
        value: data.value,
        currency: data.currency,
      })
      .$returningId();
    return { id: created.id };
  }

  // remove a variant price by item_price id
  async removeVariantPrice(id: string): Promise<void> {
    this.logger.debug(`Removing variant price with id: ${id}`);
    await this.drizzleDb.delete(schema.itemPrice).where(eq(schema.itemPrice.id, id));
  }

  // remove a store item variant by item_attribute id (cascades to its translations and prices)
  async removeStoreItemVariant(id: string): Promise<void> {
    this.logger.debug(`Removing variant with id: ${id}`);
    await this.drizzleDb.delete(schema.itemAttribute).where(eq(schema.itemAttribute.id, id));
  }

  // add a base price to a store item (not linked to any variant)
  async addStoreItemBasePrice(data: {
    itemId: string;
    priceType: PriceType;
    value: string;
    currency: Currency;
  }): Promise<{ id: string }> {
    this.logger.debug(`Adding base price to item ${data.itemId}: ${JSON.stringify(data)}`);
    const [created] = await this.drizzleDb
      .insert(schema.itemPrice)
      .values({
        itemId: data.itemId,
        priceType: data.priceType,
        value: data.value,
        currency: data.currency,
      })
      .$returningId();
    return { id: created.id };
  }

  // remove a base price by item_price id
  async removeStoreItemBasePrice(id: string): Promise<void> {
    this.logger.debug(`Removing base price with id: ${id}`);
    await this.drizzleDb.delete(schema.itemPrice).where(eq(schema.itemPrice.id, id));
  }

  // atomically decrement stock by quantity; returns whether stock is tracked and whether the reservation succeeded
  async attemptReserveStock(data: AttemptReserveStockRequest): Promise<AttemptReserveStockResponse> {
    if (data.itemAttributeId) {
      const attr = await this.drizzleDb.query.itemAttribute.findFirst({
        where: eq(schema.itemAttribute.id, data.itemAttributeId),
        columns: { quantity: true },
      });
      if (!attr || attr.quantity === null) return { stockTracked: false, reserved: false };

      const [header] = await this.drizzleDb
        .update(schema.itemAttribute)
        .set({ quantity: sql`quantity - ${data.quantity}` })
        .where(
          and(eq(schema.itemAttribute.id, data.itemAttributeId), gte(schema.itemAttribute.quantity, data.quantity)),
        );
      return { stockTracked: true, reserved: header.affectedRows > 0 };
    }

    const it = await this.drizzleDb.query.item.findFirst({
      where: eq(schema.item.id, data.itemId),
      columns: { quantity: true },
    });
    if (!it || it.quantity === null) return { stockTracked: false, reserved: false };

    const [header] = await this.drizzleDb
      .update(schema.item)
      .set({ quantity: sql`quantity - ${data.quantity}` })
      .where(and(eq(schema.item.id, data.itemId), gte(schema.item.quantity, data.quantity)));
    return { stockTracked: true, reserved: header.affectedRows > 0 };
  }

  // restore stock by quantity (used when a reservation is released or an order is cancelled/refunded)
  async releaseStock(data: ReleaseStockRequest | ReturnStockRequest): Promise<void> {
    if (data.itemAttributeId) {
      await this.drizzleDb
        .update(schema.itemAttribute)
        .set({ quantity: sql`quantity + ${data.quantity}` })
        .where(eq(schema.itemAttribute.id, data.itemAttributeId));
    } else {
      await this.drizzleDb
        .update(schema.item)
        .set({ quantity: sql`quantity + ${data.quantity}` })
        .where(eq(schema.item.id, data.itemId));
    }
  }
}
