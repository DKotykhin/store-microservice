# Store Microservice

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![gRPC](https://img.shields.io/badge/gRPC-244C5A?style=flat&logo=google&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)
![Jest](https://img.shields.io/badge/Jest-C21325?style=flat&logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=flat&logo=prettier&logoColor=black)

A gRPC-based microservice for managing store categories, items, attributes, prices, images, and stock inventory in the CoffeeDoor microservices ecosystem. Supports multi-language translations (EN, UK, RU, DE, ES, FR).

## Features

- **Category Management** - Create, update, delete, and reorder store categories
- **Item Management** - Full CRUD for store items with automatic sort order management
- **Variant Management** - Link category attributes to items as purchasable variants with per-language values and prices
- **Image Management** - Add, remove, and reorder product images
- **Price Management** - Base prices for simple items and per-variant prices (regular, discount, wholesale)
- **Stock Inventory** - Optional quantity tracking at item or variant level; `null` means unlimited/untracked. Atomic reservation, release, and return RPCs for order-microservice integration
- **Multi-Language Support** - Translations for 6 languages (English, Ukrainian, Russian, German, Spanish, French)
- **Smart Positioning** - Automatic sort order adjustment when reordering items and images
- **Translation CRUD** - Upsert and delete translations for items and item attribute values independently
- **Health Checks** - Liveness and readiness endpoints with dependency status

## Technology Stack

- **Framework:** NestJS v11
- **Runtime:** Node.js 22
- **Database:** MySQL 8.0
- **ORM:** Drizzle ORM
- **Communication:** gRPC
- **Language:** TypeScript

## gRPC Endpoints

### StoreCategoryService

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `GetStoreCategoryById` | `Id { id }` | `StoreCategoryWithTranslation` | Fetch category with all translations |
| `GetStoreCategoriesByLanguage` | `Language { language }` | `StoreCategoryList` | Get all categories by language |
| `CreateStoreCategory` | `CreateStoreCategoryRequest` | `Id` | Create a new category |
| `UpdateStoreCategory` | `UpdateStoreCategoryRequest` | `Id` | Update category (slug/availability) |
| `DeleteStoreCategory` | `Id { id }` | `StatusResponse` | Delete category with cascading |
| `ChangeStoreCategoryPosition` | `ChangeStoreCategoryPositionRequest` | `StoreCategory` | Reorder categories |
| `UpsertStoreCategoryTranslation` | `StoreCategoryTranslationRequest` | `Id` | Create or update translation |
| `DeleteStoreCategoryTranslation` | `Id { id }` | `StatusResponse` | Delete a translation |

### StoreItemService

**Read**

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `GetStoreItemsByCategoryIdWithOption` | `GetStoreItemsByCategoryIdRequest` | `StoreItemListWithOption` | Get items by category ID with translated variants and attributes |
| `GetStoreItemsByCategorySlugWithOption` | `GetStoreItemsByCategorySlugRequest` | `StoreItemListWithOption` | Get items by category slug with translated variants and attributes |
| `GetStoreItemById` | `GetStoreItemByIdRequest` | `StoreItemWithOption` | Get single item with translated variants and attributes |

**Item CRUD**

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `CreateStoreItem` | `CreateStoreItemRequest` | `Id` | Create a new store item (accepts optional `quantity`) |
| `UpdateStoreItem` | `UpdateStoreItemRequest` | `Id` | Update item fields (slug, brand, availability, quantity, etc.) |
| `DeleteStoreItem` | `Id` | `StatusResponse` | Delete item with cascading and sibling position adjustment |
| `ChangeStoreItemPosition` | `ChangeStoreItemPositionRequest` | `StoreItemWithOption` | Reorder item within its category |

**Item Translations**

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `UpsertStoreItemTranslation` | `StoreItemTranslationRequest` | `Id` | Create or update item title/description for a language |
| `DeleteStoreItemTranslation` | `Id` | `StatusResponse` | Delete a specific item translation |

**Images**

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `AddStoreItemImage` | `AddStoreItemImageRequest` | `Id` | Upload an image for a store item (returns image id) |
| `RemoveStoreItemImage` | `Id` | `StatusResponse` | Remove an image by its id |
| `ChangeStoreItemImagePosition` | `ChangeStoreItemImagePositionRequest` | `Id` | Update the sort order of an image |

**Variants (admin flow steps 6–8)**

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `AddStoreItemVariant` | `AddStoreItemVariantRequest` | `Id` | Link an existing attribute to an item; accepts optional `quantity`; returns `item_attribute_id` |
| `RemoveStoreItemVariant` | `Id` | `StatusResponse` | Remove a variant link (cascades to its translations and prices) |
| `UpsertItemAttributeTranslation` | `UpsertItemAttributeTranslationRequest` | `Id` | Set the variant value for a specific language (e.g. "250g" / "250г") |
| `AddVariantPrice` | `AddVariantPriceRequest` | `Id` | Add a price type (regular/discount/wholesale) for a variant |
| `RemoveVariantPrice` | `Id` | `StatusResponse` | Remove a variant price by its id |

**Base Prices (items without variants)**

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `AddStoreItemBasePrice` | `AddStoreItemBasePriceRequest` | `Id` | Add a base price not linked to any variant |
| `RemoveStoreItemBasePrice` | `Id` | `StatusResponse` | Remove a base price by its id |

**Stock Inventory**

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `AttemptReserveStock` | `AttemptReserveStockRequest` | `AttemptReserveStockResponse` | Atomically decrement stock by `quantity`. Returns `{ stockTracked, reserved }`. If `quantity` is `null` on the item/variant, returns `stockTracked: false` and the caller skips the check |
| `ReleaseStock` | `ReleaseStockRequest` | `StatusResponse` | Restore stock when a cart reservation is released (cart cleared or TTL expired) |
| `ReturnStock` | `ReturnStockRequest` | `StatusResponse` | Restore stock after an order is cancelled or refunded |

> `item_attribute_id` is optional in all three requests. If provided, the operation targets the variant's stock (`item_attribute.quantity`); otherwise it targets the item's stock (`item.quantity`). Setting `quantity = null` on an item or variant means unlimited / not tracked — no stock check will be performed by the order-microservice.

### HealthCheckService

| Method | Request | Response | Description |
|--------|---------|----------|-------------|
| `CheckAppHealth` | `Empty` | `HealthCheckResponse` | Service liveness check |
| `CheckAppConnections` | `Empty` | `ReadinessResponse` | Dependency readiness check |

## Database Schema

```
category ──┬── category_translation (1:N)
            ├── attribute ──── attribute_translation (1:N)
            └── item ──┬── item_translation (1:N)
                       ├── image (1:N)
                       ├── item_price (1:N, optional FK to item_attribute)
                       └── item_attribute ──┬── item_attribute_translation (1:N)
                                            └── item_price (1:N, via FK)
```

`item_attribute` is a junction table linking an **item** to an **attribute** definition. Each item_attribute can have:
- **translations** — the attribute value for this item (e.g., "250g", "Washed")
- **prices** — variant prices (e.g., regular: 249 UAH). If no prices are linked, the attribute is treated as informational (e.g., score: 84)
- **quantity** — optional stock count for this variant (`NULL` = unlimited/not tracked)

`item` also has an optional **quantity** column for products without variants.

Stock is resolved at the most specific level available:
- If the cart item has a `variantId` → use `item_attribute.quantity`
- If no variant → use `item.quantity`
- If `quantity` is `null` at the resolved level → stock is not tracked; the order-microservice skips the reservation check

All tables share base columns: `id` (UUID), `createdAt`, `updatedAt`.

### Table Fill Order

When populating the database, tables must be filled respecting foreign key dependencies:

```
Level 1 (independent)
  └── category

Level 2 (depends on category)
  ├── category_translation
  ├── attribute
  └── item

Level 3 (depends on level 2)
  ├── attribute_translation
  ├── item_translation
  ├── image
  └── item_attribute  (requires both item + attribute)

Level 4 (depends on level 3)
  ├── item_attribute_translation
  └── item_price  (requires item, optionally item_attribute)
```

### Admin Flow Example

Typical sequence for adding a new product. Steps 2–3 are performed via `StoreAttributeService`; steps 4–11 via `StoreItemService`.

**1. Category already exists** (via `StoreCategoryService`)

**2. Create attributes once per category** (via `StoreAttributeService`)
```
CreateAttribute { categoryId, slug: "weight" }         → Id (attributeId)
CreateAttribute { categoryId, slug: "processing-type" } → Id (attributeId)
CreateAttribute { categoryId, slug: "score" }           → Id (attributeId)
```

**3. Add attribute translations per language** (via `StoreAttributeService`)
```
UpsertAttributeTranslation { attributeId, language: "en", name: "Weight" }
UpsertAttributeTranslation { attributeId, language: "ua", name: "Вага" }
```

**4. Create the item**
```
CreateStoreItem { categoryId, slug: "colombia-el-paraiso", brand: "..." } → Id (itemId)
```

**5. Add item translations per language**
```
UpsertStoreItemTranslation { itemId, language: "en", title: "Colombia El Paraíso", description: "..." }
UpsertStoreItemTranslation { itemId, language: "ua", title: "Колумбія Ель Параісо", description: "..." }
```

**6. Link item to attribute** (one call per variant)
```
AddStoreItemVariant { itemId, attributeId: <weight-id>, quantity: 50 } → Id (itemAttributeId)
```
> `quantity` is optional. Omit it (or pass `null`) to leave this variant untracked (unlimited stock).

**7. Set the value per language** for that variant
```
UpsertItemAttributeTranslation { itemAttributeId, language: "en", value: "250g" }
UpsertItemAttributeTranslation { itemAttributeId, language: "ua", value: "250г" }
```

**8. Add prices** for the variant
```
AddVariantPrice { itemAttributeId, priceType: "regular",   value: "249", currency: "UAH" }
AddVariantPrice { itemAttributeId, priceType: "discount",  value: "199", currency: "UAH" }
AddVariantPrice { itemAttributeId, priceType: "wholesale", value: "180", currency: "UAH" }
```

**9. Repeat steps 6–8 for each variant** (e.g. 1kg, 5kg)

**10. For info-only attributes** (score, country of origin) — do steps 6–7 only, skip step 8
```
AddStoreItemVariant { itemId, attributeId: <score-id> }  → Id (itemAttributeId)
UpsertItemAttributeTranslation { itemAttributeId, language: "en", value: "84" }
```
> Items with `item_attribute` entries that have no linked `item_price` rows are automatically treated as informational attributes in the response (`attributes` field), not as purchasable variants (`variants` field).

**11. Upload images**
```
AddStoreItemImage { itemId, url: "https://...", alt: "Front view", sortOrder: 1 } → Id (imageId)
AddStoreItemImage { itemId, url: "https://...", alt: "Side view",  sortOrder: 2 } → Id (imageId)
```

## Database Commands

```bash
# Generate a new migration file from schema changes
npm run db:generate

# Apply pending migrations to the database
npm run db:migrate

# Push schema changes directly without migration files (dev only)
npm run db:push

# Open Drizzle Studio (visual DB browser)
npm run db:studio

# Reset the database (drops and recreates all tables)
npm run db:reset

# Seed the database with initial data
npm run db:seed
```

> **Note:** The project was initially bootstrapped with `db:push`. If you are transitioning to `db:migrate` for production use, the `__drizzle_migrations` tracking table must be seeded with records for previously applied migrations before running `db:migrate`.

## Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# Deployment Environment
NODE_ENV=development

# gRPC Connection
TRANSPORT_URL=0.0.0.0:5004
HTTP_PORT=9104

# Database
DATABASE_URL=mysql://user:password@localhost:3306/store_db
```

## Project Setup

```bash
# Install dependencies
npm install

# Generate gRPC types from proto files
npm run proto:generate
```

## Running the Service

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

## Docker Deployment

```bash
# Start MySQL database
docker-compose up -d

# Run the service
npm run start:dev
```

The service will be available at:
- **gRPC:** `0.0.0.0:5004`
- **HTTP:** `0.0.0.0:9104`
- **MySQL:** `localhost:3306`

## Project Structure

```
src/
├── app.module.ts                   # Root module
├── main.ts                         # Application entry point
├── health-check/                   # Health check module
│   ├── health-check.controller.ts
│   ├── health-check.service.ts
│   └── health-check.module.ts
├── store-category/                 # Category management
│   ├── store-category.controller.ts
│   ├── store-category.service.ts
│   ├── store.category.repository.ts
│   └── store-category.module.ts
├── store-item/                     # Item management (read + mapper)
│   ├── store-item.controller.ts
│   ├── store-item.service.ts
│   ├── store-item.repository.ts
│   ├── store-item.mapper.ts
│   └── store-item.module.ts
├── database/                       # Database layer
│   ├── database.module.ts
│   ├── drizzle.config.ts
│   ├── language.enum.ts
│   └── schema/                     # Drizzle ORM schemas
│       ├── category.schema.ts
│       ├── category-translation.schema.ts
│       ├── item.schema.ts
│       ├── item-translation.schema.ts
│       ├── item-price.schema.ts
│       ├── image.schema.ts
│       ├── attribute.schema.ts
│       ├── attribute-translation.schema.ts
│       ├── item-attribute.schema.ts
│       └── item-attribute-translation.schema.ts
├── utils/                          # Utilities
│   ├── env.dto.ts
│   ├── errors/
│   ├── filters/
│   └── validators/
└── generated-types/                # gRPC proto-generated types
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Proto Files

The service uses protocol buffers for gRPC communication:
- `proto/store-category.proto` - StoreCategoryService interface
- `proto/store-item.proto` - StoreItemService interface
- `proto/health-check.proto` - HealthCheckService interface

## Network

This service connects to the `coffeedoor-network` Docker network for inter-service communication with other microservices in the ecosystem.

## License

This project is proprietary software.
