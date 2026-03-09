import { Injectable, Logger } from '@nestjs/common';

import { AppError } from 'src/utils/errors/app-error';
import { mapLanguageFromProto, mapLanguageToProto } from 'src/utils/mapper';
import { StoreCategoryRepository } from './store-category.repository';

import type {
  ChangeStoreCategoryPositionRequest,
  CreateStoreCategoryRequest,
  Id,
  Language,
  StatusResponse,
  StoreCategory,
  StoreCategoryList,
  StoreCategoryTranslationRequest,
  StoreCategoryWithTranslations,
  UpdateStoreCategoryRequest,
} from 'src/generated-types/store-category';

@Injectable()
export class StoreCategoryService {
  private readonly logger = new Logger(StoreCategoryService.name);
  constructor(private readonly storeCategoryRepository: StoreCategoryRepository) {}

  async findStoreCategoryByIdWithTranslation(id: string): Promise<StoreCategoryWithTranslations> {
    this.logger.debug(`Finding store category with id: ${id}`);
    try {
      const category = await this.storeCategoryRepository.findStoreCategoryByIdWithTranslation(id);
      if (!category) {
        this.logger.warn(`Store category with id: ${id} not found`);
        throw AppError.notFound('Store category not found');
      }
      return {
        category: {
          id: category.id,
          slug: category.slug,
          isAvailable: category.isAvailable,
          sortOrder: category.sortOrder,
        },
        translation: category.translations.map((tx) => ({
          id: tx.id,
          title: tx.title,
          description: tx.description ?? '',
          language: mapLanguageToProto(tx.language),
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching store category: ${error instanceof Error ? error.message : error}`);
      if (error instanceof AppError) throw error;
      throw AppError.internalServerError('Failed to retrieve store category');
    }
  }

  async findStoreCategoryListWithTranslation({ language }: Language): Promise<StoreCategoryList> {
    this.logger.debug(`Finding all store categories with translations for language: ${language}`);
    try {
      const categories = await this.storeCategoryRepository.findStoreCategoryListWithTranslation(
        mapLanguageFromProto(language),
      );

      if (categories.length === 0) {
        this.logger.warn(`No store categories found for language: ${language}`);
        throw AppError.notFound('No store categories found');
      }

      const categoriesWithoutTranslation = categories.filter((category) => category.translations.length === 0);
      if (categoriesWithoutTranslation.length > 0) {
        this.logger.warn(
          `No translations found for ${categoriesWithoutTranslation.length} store categories in language: ${language}`,
        );
        await Promise.all(
          categoriesWithoutTranslation.map(async (category) => {
            const translation = await this.storeCategoryRepository.getDefaultTranslationForCategory(category.id);
            if (translation) {
              category.translations.push(translation);
            }
          }),
        );
      }

      const data = categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        isAvailable: category.isAvailable,
        sortOrder: category.sortOrder,
        description: category.translations.length > 0 ? (category.translations[0].description ?? '') : '',
        title: category.translations.length > 0 ? category.translations[0].title : '',
      }));

      return { data };
    } catch (error) {
      this.logger.error(`Error fetching store category list: ${error instanceof Error ? error.message : error}`);
      if (error instanceof AppError) throw error;
      throw AppError.internalServerError('Failed to retrieve store categories');
    }
  }

  async createStoreCategory(data: CreateStoreCategoryRequest): Promise<Id> {
    this.logger.debug(`Creating store category with data: ${JSON.stringify(data)}`);
    try {
      const result = await this.storeCategoryRepository.createStoreCategory({
        slug: data.slug,
        isAvailable: data.isAvailable ?? false,
      });
      this.logger.debug(`Store category created with id: ${JSON.stringify(result)}`);
      return result[0];
    } catch (error) {
      this.logger.error(`Error creating store category: ${error instanceof Error ? error.message : error}`);
      throw AppError.internalServerError('Failed to create store category');
    }
  }

  async updateStoreCategory(data: UpdateStoreCategoryRequest): Promise<Id> {
    this.logger.debug(`Updating store category with data: ${JSON.stringify(data)}`);
    try {
      const existing = await this.storeCategoryRepository.findStoreCategoryById(data.id);
      if (!existing) {
        this.logger.warn(`Store category with id: ${data.id} not found`);
        throw AppError.notFound('Store category not found');
      }
      await this.storeCategoryRepository.updateStoreCategory(data);
      return { id: data.id };
    } catch (error) {
      this.logger.error(`Error updating store category: ${error instanceof Error ? error.message : error}`);
      if (error instanceof AppError) throw error;
      throw AppError.internalServerError('Failed to update store category');
    }
  }

  async deleteStoreCategoryWithPositionUpdate(id: string): Promise<StatusResponse> {
    this.logger.debug(`Deleting store category with id: ${id} and updating positions`);
    try {
      const categoryList = await this.storeCategoryRepository.findStoreCategoryList();
      const categoryToDelete = categoryList.find((category) => category.id === id);
      if (!categoryToDelete) {
        this.logger.warn(`Store category with id: ${id} not found`);
        throw AppError.notFound('Store category not found');
      }
      const positionUpdates = categoryList
        .filter((category) => category.sortOrder > categoryToDelete.sortOrder)
        .map((category) => ({ id: category.id, position: category.sortOrder - 1 }));
      await this.storeCategoryRepository.deleteStoreCategoryWithPositionUpdate(id, positionUpdates);
      this.logger.debug(`Store category with id: ${id} deleted successfully with position updates`);
      return { success: true, message: 'Store category deleted successfully with position updates' };
    } catch (error) {
      this.logger.error(
        `Error deleting store category with position update: ${error instanceof Error ? error.message : error}`,
      );
      if (error instanceof AppError) throw error;
      throw AppError.internalServerError('Failed to delete store category with position update');
    }
  }

  async changeStoreCategoryPosition(data: ChangeStoreCategoryPositionRequest): Promise<StoreCategory> {
    this.logger.debug(`Changing position of store category with data: ${JSON.stringify(data)}`);
    try {
      const categoryList = await this.storeCategoryRepository.findStoreCategoryList();
      const categoryToUpdate = categoryList.find((category) => category.id === data.id);
      if (!categoryToUpdate) {
        this.logger.warn(`Store category with id: ${data.id} not found`);
        throw AppError.notFound('Store category not found');
      }
      if (data.sortOrder < 1 || data.sortOrder > categoryList.length) {
        this.logger.warn(`Invalid sort order: ${data.sortOrder}, must be between 1 and ${categoryList.length}`);
        throw AppError.badRequest(`Sort order must be between 1 and ${categoryList.length}`);
      }
      const positionUpdates = this.calculatePositionUpdates(categoryList, categoryToUpdate, data.sortOrder);
      await this.storeCategoryRepository.changeStoreCategoryPosition(data.id, positionUpdates);
      const updatedCategory = await this.storeCategoryRepository.findStoreCategoryById(data.id);
      if (!updatedCategory) {
        this.logger.warn(`Store category with id: ${data.id} not found after update`);
        throw AppError.notFound('Store category not found after update');
      }
      this.logger.debug(`Store category with id: ${data.id} position changed successfully`);
      return {
        id: updatedCategory.id,
        slug: updatedCategory.slug,
        isAvailable: updatedCategory.isAvailable,
        sortOrder: updatedCategory.sortOrder,
      };
    } catch (error) {
      this.logger.error(`Error changing position of store category: ${error instanceof Error ? error.message : error}`);
      if (error instanceof AppError) throw error;
      throw AppError.internalServerError('Failed to change position of store category');
    }
  }

  async createOrUpdateStoreCategoryTranslation(data: StoreCategoryTranslationRequest): Promise<Id> {
    this.logger.debug(`Creating or updating store category translation with data: ${JSON.stringify(data)}`);
    try {
      await this.storeCategoryRepository.createOrUpdateStoreCategoryTranslation({
        ...data,
        language: mapLanguageFromProto(data.language),
      });
      return { id: data.categoryId };
    } catch (error) {
      this.logger.error(
        `Error creating or updating store category translation: ${error instanceof Error ? error.message : error}`,
      );
      if (error instanceof AppError) throw error;
      throw AppError.internalServerError('Failed to create or update store category translation');
    }
  }

  async deleteStoreCategoryTranslation(id: string): Promise<StatusResponse> {
    this.logger.debug(`Deleting store category translation with id: ${id}`);
    try {
      const result = await this.storeCategoryRepository.deleteStoreCategoryTranslation(id);
      if (result[0].affectedRows === 0) {
        this.logger.warn(`Store category translation with id: ${id} not found`);
        throw AppError.notFound('Store category translation not found');
      }
      this.logger.debug(`Store category translation with id: ${id} delete result: ${JSON.stringify(result)}`);
      this.logger.debug(`Store category translation with id: ${id} deleted successfully`);
      return { success: true, message: 'Store category translation deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting store category translation: ${error instanceof Error ? error.message : error}`);
      if (error instanceof AppError) throw error;
      throw AppError.internalServerError('Failed to delete store category translation');
    }
  }

  // Business logic: calculate which categories need position updates
  private calculatePositionUpdates(
    categories: StoreCategory[],
    categoryToUpdate: StoreCategory,
    newPosition: number,
  ): Array<{ id: string; position: number }> {
    return categories
      .map((category) => {
        if (category.id === categoryToUpdate.id) {
          return { id: category.id, position: newPosition };
        }
        if (categoryToUpdate.sortOrder < newPosition) {
          // Moving down
          if (category.sortOrder > categoryToUpdate.sortOrder && category.sortOrder <= newPosition) {
            return { id: category.id, position: category.sortOrder - 1 };
          }
        } else if (categoryToUpdate.sortOrder > newPosition) {
          // Moving up
          if (category.sortOrder < categoryToUpdate.sortOrder && category.sortOrder >= newPosition) {
            return { id: category.id, position: category.sortOrder + 1 };
          }
        }
        return { id: category.id, position: category.sortOrder };
      })
      .filter((update) => {
        const original = categories.find((c) => c.id === update.id);
        return original && original.sortOrder !== update.position;
      });
  }
}
