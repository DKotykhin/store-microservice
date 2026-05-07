import { foreignKey, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

import { baseColumns } from './base-columns';
import { item } from './item.schema';
import { attribute } from './attribute.schema';
import { itemAttributeTranslation } from './item-attribute-translation.schema';
import { itemPrice } from './item-price.schema';

export const itemAttribute = mysqlTable(
  'item_attribute',
  {
    ...baseColumns,
    itemId: varchar('item_id', { length: 36 }).notNull(),
    attributeId: varchar('attribute_id', { length: 36 }).notNull(),
    quantity: int('quantity'),
  },
  (table) => [
    foreignKey({
      name: 'item_attr_item_id_fk',
      columns: [table.itemId],
      foreignColumns: [item.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'item_attr_attr_id_fk',
      columns: [table.attributeId],
      foreignColumns: [attribute.id],
    }).onDelete('cascade'),
  ],
);

export const itemAttributeRelations = relations(itemAttribute, ({ one, many }) => ({
  item: one(item, {
    fields: [itemAttribute.itemId], // Foreign key field in the item_attribute table
    references: [item.id], // Primary key field in the item table
  }),
  attribute: one(attribute, {
    fields: [itemAttribute.attributeId], // Foreign key field in the item_attribute table
    references: [attribute.id], // Primary key field in the attribute table
  }),
  translations: many(itemAttributeTranslation), // One-to-many relationship with itemAttributeTranslation
  prices: many(itemPrice), // One-to-many relationship with itemPrice
}));

export type ItemAttribute = typeof itemAttribute.$inferSelect;
export type NewItemAttribute = typeof itemAttribute.$inferInsert;
