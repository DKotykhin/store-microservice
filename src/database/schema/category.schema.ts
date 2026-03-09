import { boolean, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

import { baseColumns } from './base-columns';
import { Item, item } from './item.schema';
import { Attribute, attribute } from './attribute.schema';
import { CategoryTranslation, categoryTranslation } from './category-translation.schema';

export const category = mysqlTable('category', {
  ...baseColumns,
  slug: varchar({ length: 255 }).notNull(),
  isAvailable: boolean('is_available').default(false).notNull(),
  sortOrder: int('sort_order').default(0).notNull(),
});

export const categoryRelations = relations(category, ({ many }) => ({
  translations: many(categoryTranslation), // One-to-many relationship with categoryTranslation
  items: many(item), // One-to-many relationship with item
  attributes: many(attribute), // One-to-many relationship with attribute
}));

export type Category = typeof category.$inferSelect;
export type NewCategory = typeof category.$inferInsert;
export type CategoryWithRelations = Category & {
  translations: CategoryTranslation[];
  items: Item[];
  attributes: Attribute[];
};
