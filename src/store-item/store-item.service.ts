import { Injectable, Logger } from '@nestjs/common';

import { AppError } from 'src/utils/errors/app-error';
import { DEFAULT_LANGUAGE } from 'src/database/enums/language.enum';
import { StoreItemRepository } from './store-item.repository';
import { mapItem, mapItemsToResponse } from './store-item.mapper';

import type {
  AddStoreItemBasePriceRequest,
  AddStoreItemImageRequest,
  AddStoreItemVariantRequest,
  AddVariantPriceRequest,
  ChangeStoreItemImagePositionRequest,
  ChangeStoreItemPositionRequest,
  CreateStoreItemRequest,
  Id,
  StatusResponse,
  StoreItemListWithOption,
  StoreItemTranslationRequest,
  StoreItemWithOption,
  UpdateStoreItemRequest,
  UpsertItemAttributeTranslationRequest,
} from 'src/generated-types/store-item';
import { mapCurrency, mapLanguageFromProto, mapPriceType } from 'src/utils/mapper';

@Injectable()
export class StoreItemService {
  private readonly logger = new Logger(StoreItemService.name);
  constructor(private readonly storeItemRepository: StoreItemRepository) {}

  // get store items by store category id with translations for a specific language
  async getStoreItemsByCategoryIdWithTranslation(
    categoryId: string,
    language: number,
  ): Promise<StoreItemListWithOption> {
    this.logger.debug(
      `Fetching store items for category id: ${categoryId} with translations for language: ${language}`,
    );
    try {
      const items = await this.storeItemRepository.findStoreItemsByCategoryIdWithTranslation(
        categoryId,
        mapLanguageFromProto(language),
      );
      if (!items || items.length === 0) {
        this.logger.warn(`No store items found for category id: ${categoryId} and language: ${language}`);
        return { data: [] };
      }
      return { data: mapItemsToResponse(items) };
    } catch (error) {
      this.logger.error(`Error fetching store items: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to retrieve store items');
    }
  }

  // get store items by store category slug with translations for a specific language
  async getStoreItemsByCategorySlugWithTranslation(
    categorySlug: string,
    language: number,
  ): Promise<StoreItemListWithOption> {
    this.logger.debug(
      `Fetching store items for category slug: ${categorySlug} with translations for language: ${language}`,
    );
    try {
      const items = await this.storeItemRepository.findStoreItemsByCategorySlugWithTranslation(
        categorySlug,
        mapLanguageFromProto(language),
      );
      if (!items || items.length === 0) {
        this.logger.warn(`No store items found for category slug: ${categorySlug} and language: ${language}`);
        return { data: [] };
      }
      return { data: mapItemsToResponse(items) };
    } catch (error) {
      this.logger.error(`Error fetching store items: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to retrieve store items');
    }
  }

  // get store item by id with translations for a specific language
  async getStoreItemByIdWithTranslation(itemId: string, language: number): Promise<StoreItemWithOption> {
    this.logger.debug(`Fetching store item for id: ${itemId} with translations for language: ${language}`);
    try {
      const item = await this.storeItemRepository.findStoreItemsByIdWithTranslation(
        itemId,
        mapLanguageFromProto(language),
      );
      if (!item) {
        this.logger.warn(`No store item found for id: ${itemId} and language: ${language}`);
        throw AppError.notFound(`Store item with id: ${itemId} not found`);
      }
      return mapItem(item);
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error(`Error fetching store item: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to retrieve store item');
    }
  }

  // create a new store item
  async createStoreItem(data: CreateStoreItemRequest): Promise<Id> {
    this.logger.debug(`Creating store item with data: ${JSON.stringify(data)}`);
    try {
      return await this.storeItemRepository.createStoreItem(data);
    } catch (error) {
      this.logger.error(`Error creating store item: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to create store item');
    }
  }

  // update an existing store item
  async updateStoreItem(data: UpdateStoreItemRequest): Promise<Id> {
    this.logger.debug(`Updating store item with id: ${data.itemId}`);
    try {
      await this.storeItemRepository.updateStoreItem(data);
      return { id: data.itemId };
    } catch (error) {
      this.logger.error(`Error updating store item: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to update store item');
    }
  }

  // delete a store item and shift sort orders of remaining items in the same category
  async deleteStoreItem(id: string): Promise<StatusResponse> {
    this.logger.debug(`Deleting store item with id: ${id}`);
    try {
      const item = await this.storeItemRepository.findStoreItemsByIdWithTranslation(id, DEFAULT_LANGUAGE);
      if (!item) throw AppError.notFound(`Store item with id: ${id} not found`);

      const siblings = await this.storeItemRepository.findStoreItemsByCategoryIdWithTranslation(
        item.categoryId,
        DEFAULT_LANGUAGE,
      );
      const positionUpdates = siblings
        .filter((i) => i.id !== id && i.sortOrder > item.sortOrder)
        .map((i) => ({ id: i.id, position: i.sortOrder - 1 }));

      await this.storeItemRepository.deleteStoreItemWithPositionUpdate(id, item.categoryId, positionUpdates);
      return { success: true, message: 'Store item deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error(`Error deleting store item: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to delete store item');
    }
  }

  // create or update a store item translation
  async upsertStoreItemTranslation(data: StoreItemTranslationRequest): Promise<Id> {
    this.logger.debug(`Upserting translation for item: ${data.itemId}, language: ${data.language}`);
    try {
      await this.storeItemRepository.upsertStoreItemTranslation({
        ...data,
        language: mapLanguageFromProto(data.language),
      });
      // repo returns void; returning itemId as the closest stable identifier
      return { id: data.itemId };
    } catch (error) {
      this.logger.error(`Error upserting store item translation: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to upsert store item translation');
    }
  }

  // delete a store item translation by its id
  async deleteStoreItemTranslation(id: string): Promise<StatusResponse> {
    this.logger.debug(`Deleting store item translation with id: ${id}`);
    try {
      await this.storeItemRepository.deleteStoreItemTranslation(id);
      return { success: true, message: 'Store item translation deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting store item translation: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to delete store item translation');
    }
  }

  // add an image to a store item
  async addStoreItemImage(data: AddStoreItemImageRequest): Promise<Id> {
    this.logger.debug(`Adding image to store item: ${data.itemId}`);
    try {
      return await this.storeItemRepository.addStoreItemImage(data);
    } catch (error) {
      this.logger.error(`Error adding store item image: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to add store item image');
    }
  }

  // remove a store item image by its id
  async removeStoreItemImage(id: string): Promise<StatusResponse> {
    this.logger.debug(`Removing store item image with id: ${id}`);
    try {
      await this.storeItemRepository.deleteStoreItemImage(id);
      return { success: true, message: 'Store item image removed successfully' };
    } catch (error) {
      this.logger.error(`Error removing store item image: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to remove store item image');
    }
  }

  // update the sort order of a single store item image
  async changeStoreItemImagePosition(data: ChangeStoreItemImagePositionRequest): Promise<Id> {
    this.logger.debug(`Changing position of image ${data.imageId} to sort order ${data.sortOrder}`);
    try {
      await this.storeItemRepository.changeStoreItemImagePosition(data.imageId, [
        { id: data.imageId, position: data.sortOrder },
      ]);
      return { id: data.imageId };
    } catch (error) {
      this.logger.error(`Error changing store item image position: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to change store item image position');
    }
  }

  // move a store item to a new sort position, shifting affected siblings accordingly
  async changeStoreItemPosition(data: ChangeStoreItemPositionRequest): Promise<StoreItemWithOption> {
    this.logger.debug(`Changing position of item ${data.itemId} to sort order ${data.sortOrder}`);
    try {
      const item = await this.storeItemRepository.findStoreItemsByIdWithTranslation(data.itemId, DEFAULT_LANGUAGE);
      if (!item) throw AppError.notFound(`Store item with id: ${data.itemId} not found`);

      const siblings = await this.storeItemRepository.findStoreItemsByCategoryIdWithTranslation(
        item.categoryId,
        DEFAULT_LANGUAGE,
      );
      const currentOrder = item.sortOrder;
      const newOrder = data.sortOrder;

      const sortOrderUpdates: Array<{ id: string; position: number }> = [{ id: data.itemId, position: newOrder }];
      if (newOrder > currentOrder) {
        siblings
          .filter((i) => i.id !== data.itemId && i.sortOrder > currentOrder && i.sortOrder <= newOrder)
          .forEach((i) => sortOrderUpdates.push({ id: i.id, position: i.sortOrder - 1 }));
      } else if (newOrder < currentOrder) {
        siblings
          .filter((i) => i.id !== data.itemId && i.sortOrder >= newOrder && i.sortOrder < currentOrder)
          .forEach((i) => sortOrderUpdates.push({ id: i.id, position: i.sortOrder + 1 }));
      }

      await this.storeItemRepository.changeStoreItemPosition(data.itemId, sortOrderUpdates);

      const updated = await this.storeItemRepository.findStoreItemsByIdWithTranslation(data.itemId, DEFAULT_LANGUAGE);
      if (!updated) throw AppError.internalServerError('Failed to retrieve store item after position update');
      return mapItem(updated);
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error(`Error changing store item position: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to change store item position');
    }
  }

  // link an existing attribute to a store item (admin flow step 6)
  async addStoreItemVariant(data: AddStoreItemVariantRequest): Promise<Id> {
    this.logger.debug(`Linking attribute ${data.attributeId} to store item: ${data.itemId}`);
    try {
      return await this.storeItemRepository.addStoreItemVariant(data);
    } catch (error) {
      this.logger.error(`Error adding store item variant: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to add store item variant');
    }
  }

  // remove a store item variant by item_attribute id
  async removeStoreItemVariant(id: string): Promise<StatusResponse> {
    this.logger.debug(`Removing store item variant with id: ${id}`);
    try {
      await this.storeItemRepository.removeStoreItemVariant(id);
      return { success: true, message: 'Store item variant removed successfully' };
    } catch (error) {
      this.logger.error(`Error removing store item variant: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to remove store item variant');
    }
  }

  // set the translated value for a variant in a specific language (admin flow step 7)
  async upsertItemAttributeTranslation(data: UpsertItemAttributeTranslationRequest): Promise<Id> {
    this.logger.debug(
      `Upserting item attribute translation for item_attribute: ${data.itemAttributeId}, language: ${data.language}`,
    );
    try {
      return await this.storeItemRepository.upsertItemAttributeTranslation({
        ...data,
        language: mapLanguageFromProto(data.language),
      });
    } catch (error) {
      this.logger.error(
        `Error upserting item attribute translation: ${error instanceof Error ? error.message : error}`,
      );
      throw AppError.internalServerError('Failed to upsert item attribute translation');
    }
  }

  // add a price for a variant (admin flow step 8)
  async addVariantPrice(data: AddVariantPriceRequest): Promise<Id> {
    this.logger.debug(`Adding variant price for item_attribute: ${data.itemAttributeId}`);
    try {
      return await this.storeItemRepository.addVariantPrice({
        itemAttributeId: data.itemAttributeId,
        priceType: mapPriceType(data.priceType),
        value: data.value,
        currency: mapCurrency(data.currency || 4),
      });
    } catch (error) {
      this.logger.error(`Error adding variant price: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to add variant price');
    }
  }

  // remove a variant price by item_price id
  async removeVariantPrice(id: string): Promise<StatusResponse> {
    this.logger.debug(`Removing variant price with id: ${id}`);
    try {
      await this.storeItemRepository.removeVariantPrice(id);
      return { success: true, message: 'Variant price removed successfully' };
    } catch (error) {
      this.logger.error(`Error removing variant price: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to remove variant price');
    }
  }

  // add a base price (not tied to a variant) to a store item
  async addStoreItemBasePrice(data: AddStoreItemBasePriceRequest): Promise<Id> {
    this.logger.debug(`Adding base price to store item: ${data.itemId}`);
    try {
      return await this.storeItemRepository.addStoreItemBasePrice({
        itemId: data.itemId,
        priceType: mapPriceType(data.priceType),
        value: data.value,
        currency: mapCurrency(data.currency || 4),
      });
    } catch (error) {
      this.logger.error(`Error adding store item base price: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to add store item base price');
    }
  }

  // remove a base price by item_price id
  async removeStoreItemBasePrice(id: string): Promise<StatusResponse> {
    this.logger.debug(`Removing store item base price with id: ${id}`);
    try {
      await this.storeItemRepository.removeStoreItemBasePrice(id);
      return { success: true, message: 'Store item base price removed successfully' };
    } catch (error) {
      this.logger.error(`Error removing store item base price: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to remove store item base price');
    }
  }
}
