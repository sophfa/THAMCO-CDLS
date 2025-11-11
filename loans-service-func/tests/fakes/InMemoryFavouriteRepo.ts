// In-Memory Favourite Repository - Fake for Testing

import { Favourite } from "../../src/domain/favourite";
import {
  FavouriteRepo,
  RepositoryResult,
} from "../../src/domain/favourites-repo";

export class InMemoryFavouriteRepo implements FavouriteRepo {
  private favourites: Map<string, Favourite> = new Map();
  public simulateDelay: number = 0;

  constructor(initialFavourites: Favourite[] = []) {
    initialFavourites.forEach((fav) => this.favourites.set(fav.id, fav));
  }

  async list(): Promise<RepositoryResult<Favourite[]>> {
    await this.delay();
    return {
      success: true,
      data: Array.from(this.favourites.values()),
    };
  }

  async create(favourite: Favourite): Promise<RepositoryResult<Favourite>> {
    await this.delay();

    if (this.favourites.has(favourite.id)) {
      return {
        success: false,
        error: {
          code: "ALREADY_EXISTS",
          message: `Favourite with id ${favourite.id} already exists`,
        },
      };
    }

    this.favourites.set(favourite.id, { ...favourite });
    return { success: true, data: { ...favourite } };
  }

  async get(id: string): Promise<RepositoryResult<Favourite>> {
    await this.delay();

    const favourite = this.favourites.get(id);
    if (!favourite) {
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Favourite with id ${id} not found`,
        },
      };
    }

    return { success: true, data: { ...favourite } };
  }

  async delete(id: string): Promise<RepositoryResult<void>> {
    await this.delay();

    if (!this.favourites.has(id)) {
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Favourite with id ${id} not found`,
        },
      };
    }

    this.favourites.delete(id);
    return { success: true, data: undefined };
  }

  clear(): void {
    this.favourites.clear();
  }

  count(): number {
    return this.favourites.size;
  }

  private async delay(): Promise<void> {
    if (this.simulateDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulateDelay));
    }
  }
}
