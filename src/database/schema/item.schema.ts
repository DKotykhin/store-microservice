import { boolean, date, int, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

import { baseColumns } from './base-columns';
import { category } from './category.schema';
import { Image, image } from './image.schema';
import { ItemPrice, itemPrice } from './item-price.schema';
import { ItemAttribute, itemAttribute } from './item-attribute.schema';
import { ItemAttributeTranslation } from './item-attribute-translation.schema';
import { ItemTranslation, itemTranslation } from './item-translation.schema';
import { Attribute } from './attribute.schema';
import { AttributeTranslation } from './attribute-translation.schema';

export const item = mysqlTable(
  'item',
  {
    ...baseColumns,
    slug: varchar({ length: 255 }).notNull(),
    brand: varchar({ length: 255 }),
    isAvailable: boolean('is_available').default(true).notNull(),
    expectedDate: date('expected_date', { mode: 'date' }),
    sortOrder: int('sort_order').default(0).notNull(),
    quantity: int('quantity'),
    categoryId: varchar('category_id', { length: 36 })
      .notNull()
      .references(() => category.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('item_category_slug_unique').on(table.categoryId, table.slug)],
);

export const itemRelations = relations(item, ({ one, many }) => ({
  category: one(category, {
    fields: [item.categoryId], // Foreign key field in the item table
    references: [category.id], // Primary key field in the category table
  }),
  translations: many(itemTranslation), // One-to-many relationship with itemTranslation
  images: many(image), // One-to-many relationship with image
  prices: many(itemPrice), // One-to-many relationship with itemPrice
  attributes: many(itemAttribute), // One-to-many relationship with itemAttribute
}));

export type Item = typeof item.$inferSelect;
export type NewItem = typeof item.$inferInsert;
export type AttributeWithTranslations = Attribute & {
  translations: AttributeTranslation[];
};

export type ItemAttributeWithPrices = ItemAttribute & {
  prices: ItemPrice[];
  translations: ItemAttributeTranslation[];
  attribute: AttributeWithTranslations;
};

export type ItemWithRelations = Item & {
  translations: ItemTranslation[];
  prices: ItemPrice[];
  images: Image[];
  attributes: ItemAttributeWithPrices[];
};
