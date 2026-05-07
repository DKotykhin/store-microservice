import { Controller, Logger } from '@nestjs/common';

import { StoreItemService } from './store-item.service';
import {
  StoreItemServiceControllerMethods,
  type AddStoreItemBasePriceRequest,
  type AddStoreItemImageRequest,
  type AddStoreItemVariantRequest,
  type AddVariantPriceRequest,
  type AttemptReserveStockRequest,
  type AttemptReserveStockResponse,
  type ChangeStoreItemImagePositionRequest,
  type ChangeStoreItemPositionRequest,
  type CreateStoreItemRequest,
  type GetStoreItemByIdRequest,
  type GetStoreItemsByCategoryIdRequest,
  type GetStoreItemsByCategorySlugRequest,
  type Id,
  type ReleaseStockRequest,
  type ReturnStockRequest,
  type StatusResponse,
  type StoreItemListWithOption,
  type StoreItemTranslationRequest,
  type StoreItemWithOption,
  type UpdateStoreItemRequest,
  type UpsertItemAttributeTranslationRequest,
} from 'src/generated-types/store-item';

@Controller()
@StoreItemServiceControllerMethods()
export class StoreItemController {
  private readonly logger = new Logger(StoreItemController.name);
  constructor(private readonly storeItemService: StoreItemService) {}

  async getStoreItemsByCategoryIdWithOption(data: GetStoreItemsByCategoryIdRequest): Promise<StoreItemListWithOption> {
    this.logger.debug(
      `Received request to find store items for category id: ${data.categoryId} with language: ${data.language}`,
    );
    return await this.storeItemService.getStoreItemsByCategoryIdWithTranslation(data.categoryId, data.language);
  }

  async getStoreItemsByCategorySlugWithOption(
    data: GetStoreItemsByCategorySlugRequest,
  ): Promise<StoreItemListWithOption> {
    this.logger.debug(
      `Received request to find store items for category slug: ${data.categorySlug} with language: ${data.language}`,
    );
    return await this.storeItemService.getStoreItemsByCategorySlugWithTranslation(data.categorySlug, data.language);
  }

  async getStoreItemById(data: GetStoreItemByIdRequest): Promise<StoreItemWithOption> {
    this.logger.debug(`Received request to find store item for id: ${data.itemId} with language: ${data.language}`);
    return await this.storeItemService.getStoreItemByIdWithTranslation(data.itemId, data.language);
  }

  async createStoreItem(data: CreateStoreItemRequest): Promise<Id> {
    this.logger.debug(`Received request to create store item with slug: ${data.slug}`);
    return await this.storeItemService.createStoreItem(data);
  }

  async updateStoreItem(data: UpdateStoreItemRequest): Promise<Id> {
    this.logger.debug(`Received request to update store item with id: ${data.itemId}`);
    return await this.storeItemService.updateStoreItem(data);
  }

  async deleteStoreItem(data: Id): Promise<StatusResponse> {
    this.logger.debug(`Received request to delete store item with id: ${data.id}`);
    return await this.storeItemService.deleteStoreItem(data.id);
  }

  async upsertStoreItemTranslation(data: StoreItemTranslationRequest): Promise<Id> {
    this.logger.debug(`Received request to upsert translation for item: ${data.itemId}, language: ${data.language}`);
    return await this.storeItemService.upsertStoreItemTranslation(data);
  }

  async deleteStoreItemTranslation(data: Id): Promise<StatusResponse> {
    this.logger.debug(`Received request to delete store item translation with id: ${data.id}`);
    return await this.storeItemService.deleteStoreItemTranslation(data.id);
  }

  async addStoreItemImage(data: AddStoreItemImageRequest): Promise<Id> {
    this.logger.debug(`Received request to add image to store item: ${data.itemId}`);
    return await this.storeItemService.addStoreItemImage(data);
  }

  async removeStoreItemImage(data: Id): Promise<StatusResponse> {
    this.logger.debug(`Received request to remove store item image with id: ${data.id}`);
    return await this.storeItemService.removeStoreItemImage(data.id);
  }

  async changeStoreItemImagePosition(data: ChangeStoreItemImagePositionRequest): Promise<Id> {
    this.logger.debug(`Received request to change position of image ${data.imageId} to ${data.sortOrder}`);
    return await this.storeItemService.changeStoreItemImagePosition(data);
  }

  async changeStoreItemPosition(data: ChangeStoreItemPositionRequest): Promise<StoreItemWithOption> {
    this.logger.debug(`Received request to change position of item ${data.itemId} to ${data.sortOrder}`);
    return await this.storeItemService.changeStoreItemPosition(data);
  }

  async addStoreItemVariant(data: AddStoreItemVariantRequest): Promise<Id> {
    this.logger.debug(`Received request to add variant to store item: ${data.itemId}`);
    return await this.storeItemService.addStoreItemVariant(data);
  }

  async removeStoreItemVariant(data: Id): Promise<StatusResponse> {
    this.logger.debug(`Received request to remove store item variant with id: ${data.id}`);
    return await this.storeItemService.removeStoreItemVariant(data.id);
  }

  async upsertItemAttributeTranslation(data: UpsertItemAttributeTranslationRequest): Promise<Id> {
    this.logger.debug(
      `Received request to upsert item attribute translation for item_attribute: ${data.itemAttributeId}, language: ${data.language}`,
    );
    return await this.storeItemService.upsertItemAttributeTranslation(data);
  }

  async addVariantPrice(data: AddVariantPriceRequest): Promise<Id> {
    this.logger.debug(`Received request to add variant price for item_attribute: ${data.itemAttributeId}`);
    return await this.storeItemService.addVariantPrice(data);
  }

  async removeVariantPrice(data: Id): Promise<StatusResponse> {
    this.logger.debug(`Received request to remove variant price with id: ${data.id}`);
    return await this.storeItemService.removeVariantPrice(data.id);
  }

  async addStoreItemBasePrice(data: AddStoreItemBasePriceRequest): Promise<Id> {
    this.logger.debug(`Received request to add base price to store item: ${data.itemId}`);
    return await this.storeItemService.addStoreItemBasePrice(data);
  }

  async removeStoreItemBasePrice(data: Id): Promise<StatusResponse> {
    this.logger.debug(`Received request to remove store item base price with id: ${data.id}`);
    return await this.storeItemService.removeStoreItemBasePrice(data.id);
  }

  async attemptReserveStock(data: AttemptReserveStockRequest): Promise<AttemptReserveStockResponse> {
    this.logger.debug(`Received request to reserve ${data.quantity} units for item: ${data.itemId}`);
    return await this.storeItemService.attemptReserveStock(data);
  }

  async releaseStock(data: ReleaseStockRequest): Promise<StatusResponse> {
    this.logger.debug(`Received request to release ${data.quantity} units for item: ${data.itemId}`);
    return await this.storeItemService.releaseStock(data);
  }

  async returnStock(data: ReturnStockRequest): Promise<StatusResponse> {
    this.logger.debug(`Received request to return ${data.quantity} units for item: ${data.itemId}`);
    return await this.storeItemService.returnStock(data);
  }
}
