import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import * as mysql from 'mysql2/promise';
import { config } from 'dotenv';

config({ path: '.env.local' });

import {
  category,
  categoryTranslation,
  attribute,
  attributeTranslation,
  item,
  itemTranslation,
  image,
  itemAttribute,
  itemAttributeTranslation,
  itemPrice,
} from './schema';

async function seed() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
  });

  const db = drizzle(pool, { mode: 'default' });

  // Generate IDs upfront so children can reference parents
  const catCoffeeId = uuid();
  const catEquipmentId = uuid();
  const catTeaId = uuid();

  const attrWeightId = uuid();
  const attrRoastId = uuid();
  const attrOriginId = uuid();
  const attrProcessingTypeId = uuid();
  const attrScoreId = uuid();
  const attrMaterialId = uuid();

  const itemEthiopiaId = uuid();
  const itemColombiaId = uuid();
  const itemHondurasId = uuid();
  const itemV60Id = uuid();

  const iaEthiopiaWeightId = uuid();
  const iaEthiopiaRoastId = uuid();
  const iaHondurasRoastId = uuid();
  const iaHondurasOriginId = uuid();
  const iaHondurasProcessingTypeId = uuid();
  const iaHondurasScoreId = uuid();
  const iaColombiaWeightIdSmall = uuid();
  const iaColombiaWeightIdMedium = uuid();
  const iaColombiaWeightIdLarge = uuid();
  const iaV60MaterialId = uuid();

  // Clear existing data (respecting FK order — children first)
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  await db.delete(itemPrice);
  await db.delete(itemAttributeTranslation);
  await db.delete(itemAttribute);
  await db.delete(image);
  await db.delete(itemTranslation);
  await db.delete(item);
  await db.delete(attributeTranslation);
  await db.delete(attribute);
  await db.delete(categoryTranslation);
  await db.delete(category);
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

  console.log('Cleared existing data.');

  // ── 1. Categories ──
  await db.insert(category).values([
    { id: catCoffeeId, slug: 'coffee-beans', isAvailable: true, sortOrder: 0 },
    { id: catEquipmentId, slug: 'brewing-equipment', isAvailable: true, sortOrder: 1 },
    { id: catTeaId, slug: 'leaf-tea', isAvailable: true, sortOrder: 2 },
  ]);

  // ── 2. Category Translations (→ category) ──
  await db.insert(categoryTranslation).values([
    { categoryId: catCoffeeId, language: 'EN', title: 'Coffee Beans', description: 'Freshly roasted coffee' },
    { categoryId: catCoffeeId, language: 'UA', title: 'Кавові зерна', description: 'Свіжообсмажена кава' },
    { categoryId: catEquipmentId, language: 'EN', title: 'Brewing Equipment', description: 'Tools for coffee brewing' },
    {
      categoryId: catEquipmentId,
      language: 'UA',
      title: 'Обладнання',
      description: 'Інструменти для приготування кави',
    },
    {
      categoryId: catTeaId,
      language: 'EN',
      title: 'Leaf Tea',
      description:
        'Natural black, green, herbal and fruit teas of the German TM SOHO. Made without the addition of dyes, artificial flavors, preservatives',
    },
    {
      categoryId: catTeaId,
      language: 'UA',
      title: 'Листяний чай',
      description:
        "Натуральні чорні, зелені, трав'яні та фруктові чаї німецької торгівельної марки SOHO. Виготовлені без додавання барвників, штучних ароматизаторів, консервантів",
    },
  ]);

  // ── 3. Attributes (→ category) ──
  await db.insert(attribute).values([
    { id: attrWeightId, categoryId: catCoffeeId, slug: 'weight', sortOrder: 0 },
    { id: attrRoastId, categoryId: catCoffeeId, slug: 'roast-level', sortOrder: 1 },
    { id: attrOriginId, categoryId: catCoffeeId, slug: 'origin', sortOrder: 2 },
    { id: attrProcessingTypeId, categoryId: catCoffeeId, slug: 'processing-type', sortOrder: 3 },
    { id: attrScoreId, categoryId: catCoffeeId, slug: 'score', sortOrder: 4 },
    { id: attrMaterialId, categoryId: catEquipmentId, slug: 'material', sortOrder: 0 },
  ]);

  // ── 4. Attribute Translations (→ attribute) ──
  await db.insert(attributeTranslation).values([
    { attributeId: attrWeightId, language: 'EN', name: 'Weight' },
    { attributeId: attrWeightId, language: 'UA', name: 'Вага' },
    { attributeId: attrRoastId, language: 'EN', name: 'Roast Level' },
    { attributeId: attrRoastId, language: 'UA', name: 'Ступінь обсмаження' },
    { attributeId: attrMaterialId, language: 'EN', name: 'Material' },
    { attributeId: attrMaterialId, language: 'UA', name: 'Матеріал' },
    { attributeId: attrOriginId, language: 'EN', name: 'Origin' },
    { attributeId: attrOriginId, language: 'UA', name: 'Походження' },
    { attributeId: attrProcessingTypeId, language: 'EN', name: 'Processing Type' },
    { attributeId: attrProcessingTypeId, language: 'UA', name: 'Тип обробки' },
    { attributeId: attrScoreId, language: 'EN', name: 'Score' },
    { attributeId: attrScoreId, language: 'UA', name: 'Оцінка' },
  ]);

  // ── 5. Items (→ category) ──
  await db.insert(item).values([
    {
      id: itemHondurasId,
      slug: 'honduras-copan',
      brand: 'CoffeeDoor',
      isAvailable: true,
      sortOrder: 0,
      categoryId: catCoffeeId,
    },
    {
      id: itemEthiopiaId,
      slug: 'ethiopia-yirgacheffe',
      brand: 'CoffeeDoor',
      isAvailable: true,
      sortOrder: 1,
      categoryId: catCoffeeId,
    },
    {
      id: itemColombiaId,
      slug: 'colombia-supremo',
      brand: 'CoffeeDoor',
      isAvailable: true,
      sortOrder: 2,
      categoryId: catCoffeeId,
    },
    { id: itemV60Id, slug: 'hario-v60', brand: 'Hario', isAvailable: true, sortOrder: 0, categoryId: catEquipmentId },
  ]);

  // ── 6. Item Translations (→ item) ──
  await db.insert(itemTranslation).values([
    {
      itemId: itemEthiopiaId,
      language: 'EN',
      title: 'Ethiopia Yirgacheffe',
      description: 'Fruity and floral',
      detailedDescription: 'Single origin from Yirgacheffe region with notes of blueberry and jasmine.',
    },
    {
      itemId: itemEthiopiaId,
      language: 'UA',
      title: 'Ефіопія Їргачеффе',
      description: 'Фруктовий та квітковий',
      detailedDescription: 'Моносорт з регіону Їргачеффе з нотами чорниці та жасмину.',
    },
    { itemId: itemColombiaId, language: 'EN', title: 'Colombia Supremo', description: 'Rich and balanced' },
    { itemId: itemColombiaId, language: 'UA', title: 'Колумбія Супремо', description: 'Насичений та збалансований' },
    { itemId: itemHondurasId, language: 'EN', title: 'Honduras Copan', description: 'Chocolatey and nutty' },
    { itemId: itemHondurasId, language: 'UA', title: 'Гондурас Копан', description: 'Шоколадний та горіховий' },
    { itemId: itemV60Id, language: 'EN', title: 'Hario V60 Dripper', description: 'Pour-over coffee dripper' },
    { itemId: itemV60Id, language: 'UA', title: 'Hario V60 Дріпер', description: 'Дріпер для кави' },
  ]);

  // ── 7. Images (→ item) ──
  await db.insert(image).values([
    {
      url: 'https://res.cloudinary.com/dlo66sher/image/upload/v1706304020/coffee/Ethiopia_Guji_af9kxq.jpg',
      alt: 'Ethiopia Yirgacheffe beans',
      sortOrder: 0,
      itemId: itemEthiopiaId,
    },
    {
      url: 'https://res.cloudinary.com/dlo66sher/image/upload/v1706304020/coffee/Ethiopia_Sidamo_chjrkw.jpg',
      alt: 'Ethiopia packaging',
      sortOrder: 1,
      itemId: itemEthiopiaId,
    },
    {
      url: 'https://res.cloudinary.com/dlo66sher/image/upload/v1706120761/coffee/Tanzania_Tamu_Yetu_izbkkh.webp',
      alt: 'Colombia Supremo beans',
      sortOrder: 0,
      itemId: itemColombiaId,
    },
    {
      url: 'https://res.cloudinary.com/dlo66sher/image/upload/v1706304020/coffee/Honduras_Santa_Rosa_jyebm9.jpg',
      alt: 'Honduras Copan beans',
      sortOrder: 0,
      itemId: itemHondurasId,
    },
    {
      url: 'https://res.cloudinary.com/dlo66sher/image/upload/v1706304020/coffee/Honduras_Santa_Rosa1_lqssdx.jpg',
      alt: 'Honduras packaging',
      sortOrder: 1,
      itemId: itemHondurasId,
    },
    {
      url: 'https://res.cloudinary.com/dlo66sher/image/upload/v1706304122/Tea/Orange_Ginger__c0y05d.jpg',
      alt: 'Hario V60',
      sortOrder: 0,
      itemId: itemV60Id,
    },
  ]);

  // ── 8. Item Attributes (→ item + attribute) ──
  await db.insert(itemAttribute).values([
    { id: iaEthiopiaWeightId, itemId: itemEthiopiaId, attributeId: attrWeightId },
    { id: iaEthiopiaRoastId, itemId: itemEthiopiaId, attributeId: attrRoastId },
    { id: iaColombiaWeightIdLarge, itemId: itemColombiaId, attributeId: attrWeightId },
    { id: iaColombiaWeightIdMedium, itemId: itemColombiaId, attributeId: attrWeightId },
    { id: iaColombiaWeightIdSmall, itemId: itemColombiaId, attributeId: attrWeightId },
    { id: iaHondurasRoastId, itemId: itemHondurasId, attributeId: attrRoastId },
    { id: iaHondurasOriginId, itemId: itemHondurasId, attributeId: attrOriginId },
    { id: iaHondurasProcessingTypeId, itemId: itemHondurasId, attributeId: attrProcessingTypeId },
    { id: iaHondurasScoreId, itemId: itemHondurasId, attributeId: attrScoreId },
    { id: iaV60MaterialId, itemId: itemV60Id, attributeId: attrMaterialId },
  ]);

  // ── 9. Item Attribute Translations (→ itemAttribute) ──
  await db.insert(itemAttributeTranslation).values([
    { itemAttributeId: iaEthiopiaWeightId, language: 'EN', value: '250g' },
    { itemAttributeId: iaEthiopiaWeightId, language: 'UA', value: '250г' },
    { itemAttributeId: iaEthiopiaRoastId, language: 'EN', value: 'Medium' },
    { itemAttributeId: iaEthiopiaRoastId, language: 'UA', value: 'Середній' },
    { itemAttributeId: iaColombiaWeightIdLarge, language: 'EN', value: '1kg' },
    { itemAttributeId: iaColombiaWeightIdLarge, language: 'UA', value: '1кг' },
    { itemAttributeId: iaColombiaWeightIdMedium, language: 'EN', value: '500g' },
    { itemAttributeId: iaColombiaWeightIdMedium, language: 'UA', value: '500г' },
    { itemAttributeId: iaColombiaWeightIdSmall, language: 'EN', value: '250g' },
    { itemAttributeId: iaColombiaWeightIdSmall, language: 'UA', value: '250г' },
    { itemAttributeId: iaHondurasRoastId, language: 'EN', value: 'Medium' },
    { itemAttributeId: iaHondurasRoastId, language: 'UA', value: 'Середній' },
    { itemAttributeId: iaHondurasOriginId, language: 'EN', value: 'Copan' },
    { itemAttributeId: iaHondurasOriginId, language: 'UA', value: 'Копан' },
    { itemAttributeId: iaHondurasProcessingTypeId, language: 'EN', value: 'Washed' },
    { itemAttributeId: iaHondurasProcessingTypeId, language: 'UA', value: 'Митий' },
    { itemAttributeId: iaHondurasScoreId, language: 'EN', value: '85' },
    { itemAttributeId: iaHondurasScoreId, language: 'UA', value: '85' },
    { itemAttributeId: iaV60MaterialId, language: 'EN', value: 'Ceramic' },
    { itemAttributeId: iaV60MaterialId, language: 'UA', value: 'Кераміка' },
  ]);

  // ── 10. Item Prices (→ item + itemAttribute?) ──
  await db.insert(itemPrice).values([
    {
      itemId: itemEthiopiaId,
      itemAttributeId: iaEthiopiaWeightId,
      priceType: 'regular',
      value: '350.00',
      currency: 'UAH',
    },
    {
      itemId: itemEthiopiaId,
      itemAttributeId: iaEthiopiaWeightId,
      priceType: 'discount',
      value: '299.00',
      currency: 'UAH',
    },
    {
      itemId: itemColombiaId,
      itemAttributeId: iaColombiaWeightIdLarge,
      priceType: 'regular',
      value: '1420.00',
      currency: 'UAH',
    },
    {
      itemId: itemColombiaId,
      itemAttributeId: iaColombiaWeightIdLarge,
      priceType: 'discount',
      value: '1380.00',
      currency: 'UAH',
    },
    {
      itemId: itemColombiaId,
      itemAttributeId: iaColombiaWeightIdMedium,
      priceType: 'regular',
      value: '420.00',
      currency: 'UAH',
    },
    {
      itemId: itemColombiaId,
      itemAttributeId: iaColombiaWeightIdMedium,
      priceType: 'discount',
      value: '400.00',
      currency: 'UAH',
    },
    {
      itemId: itemColombiaId,
      itemAttributeId: iaColombiaWeightIdSmall,
      priceType: 'regular',
      value: '220.00',
      currency: 'UAH',
    },
    {
      itemId: itemColombiaId,
      itemAttributeId: iaColombiaWeightIdSmall,
      priceType: 'discount',
      value: '200.00',
      currency: 'UAH',
    },
    {
      itemId: itemHondurasId,
      priceType: 'regular',
      value: '400.00',
      currency: 'UAH',
    },
    {
      itemId: itemHondurasId,
      priceType: 'discount',
      value: '350.00',
      currency: 'UAH',
    },
    { itemId: itemV60Id, itemAttributeId: null, priceType: 'regular', value: '1200.00', currency: 'UAH' },
  ]);

  console.log('>>>> ✅ Seed complete! Check the database for seeded data. <<<<');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
