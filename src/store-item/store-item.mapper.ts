import type { ItemWithRelations } from 'src/database/schema';
import type { PriceType as DbPriceType } from 'src/database/enums/price-type.enum';
import type { Currency as DbCurrency } from 'src/database/enums/currency.enum';
import type {
  StoreItemWithOption,
  ItemVariant,
  ItemBasePrice,
  ItemImage,
  ItemInfoAttribute,
  PriceType,
  Currency,
} from 'src/generated-types/store-item';

// DB string → proto PriceType integer
// PRICE_TYPE_REGULAR = 1, PRICE_TYPE_DISCOUNT = 2, PRICE_TYPE_WHOLESALE = 3
function mapDbPriceType(priceType: DbPriceType): PriceType {
  switch (priceType) {
    case 'regular':
      return 1 as PriceType;
    case 'discount':
      return 2 as PriceType;
    case 'wholesale':
      return 3 as PriceType;
  }
}

// DB string → proto Currency integer
// CURRENCY_USD = 1, CURRENCY_EUR = 2, CURRENCY_GBP = 3, CURRENCY_UAH = 4
function mapDbCurrency(currency: DbCurrency): Currency {
  switch (currency) {
    case 'USD':
      return 1 as Currency;
    case 'EUR':
      return 2 as Currency;
    case 'GBP':
      return 3 as Currency;
    case 'UAH':
      return 4 as Currency;
  }
}

export function mapItemsToResponse(items: ItemWithRelations[]): StoreItemWithOption[] {
  return items.map(mapItem);
}

export function mapItem(item: ItemWithRelations): StoreItemWithOption {
  const translation = item.translations[0];
  const variantAttrs = item.attributes.filter((a) => a.prices.length > 0);
  const infoAttrs = item.attributes
    .filter((a) => a.prices.length === 0)
    .sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder);

  return {
    id: item.id,
    brand: item.brand ?? null,
    slug: item.slug,
    isAvailable: item.isAvailable,
    sortOrder: item.sortOrder,
    expectedDate: item.expectedDate ?? null,
    categoryId: item.categoryId,
    title: translation?.title ?? '',
    description: translation?.description ?? null,
    detailedDescription: translation?.detailedDescription ?? null,
    images: item.images.map(mapImage),
    variants: variantAttrs
      .map(mapVariant)
      .sort((a, b) => ((a.regularPrice ?? 0) as number) - ((b.regularPrice ?? 0) as number)),
    prices: item.prices.filter((p) => !p.itemAttributeId).map(mapBasePrice),
    attributes: mapInfoAttributes(infoAttrs),
    quantity: item.quantity ?? null,
  };
}

function mapInfoAttributes(attrs: ItemWithRelations['attributes']): ItemInfoAttribute[] {
  return attrs.map((attr) => ({
    slug: attr.attribute.slug,
    name: attr.attribute.translations[0]?.name ?? attr.attribute.slug,
    value: attr.translations[0]?.value ?? '',
  }));
}

function mapVariant(attr: ItemWithRelations['attributes'][number]): ItemVariant {
  const regularPrice = attr.prices.find((p) => p.priceType === 'regular');
  const discountPrice = attr.prices.find((p) => p.priceType === 'discount');
  const wholesalePrice = attr.prices.find((p) => p.priceType === 'wholesale');

  return {
    id: attr.id,
    attributeSlug: attr.attribute.slug,
    attributeName: attr.attribute.translations[0]?.name ?? attr.attribute.slug,
    attributeValue: attr.translations[0]?.value ?? '',
    regularPrice: regularPrice?.value ?? null,
    discountPrice: discountPrice?.value ?? null,
    wholesalePrice: wholesalePrice?.value ?? null,
    currency: mapDbCurrency(regularPrice?.currency ?? discountPrice?.currency ?? wholesalePrice?.currency ?? 'UAH'),
    quantity: attr.quantity ?? null,
  };
}

function mapBasePrice(price: ItemWithRelations['prices'][number]): ItemBasePrice {
  return {
    id: price.id,
    priceType: mapDbPriceType(price.priceType),
    value: price.value,
    currency: mapDbCurrency(price.currency),
  };
}

function mapImage(img: ItemWithRelations['images'][number]): ItemImage {
  return {
    id: img.id,
    url: img.url,
    alt: img.alt ?? null,
    sortOrder: img.sortOrder,
  };
}
