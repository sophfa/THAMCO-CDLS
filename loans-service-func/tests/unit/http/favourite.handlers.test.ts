const cosmosState: {
  favouritesContainer?: any;
  favouritesQueryFetchAll?: jest.Mock;
  favouritesDelete?: jest.Mock;
  favouritesCreate?: jest.Mock;
} = {};

jest.mock("../../../src/config/cosmosClient", () => {
  const favouritesQueryFetchAll = jest.fn();
  const favouritesDelete = jest.fn();
  const favouritesCreate = jest.fn();

  const favouritesContainer = {
    items: {
      query: jest.fn(() => ({ fetchAll: favouritesQueryFetchAll })),
      create: favouritesCreate,
      upsert: jest.fn(),
    },
    item: jest.fn(() => ({ delete: favouritesDelete })),
  };

  cosmosState.favouritesContainer = favouritesContainer;
  cosmosState.favouritesQueryFetchAll = favouritesQueryFetchAll;
  cosmosState.favouritesDelete = favouritesDelete;
  cosmosState.favouritesCreate = favouritesCreate;

  return {
    loansContainer: {
      items: {
        query: jest.fn(),
      },
    },
    favouritesContainer,
  };
});

const getFavouritesContainer = () => cosmosState as Required<typeof cosmosState>;

const repoState: { instance?: { create: jest.Mock; list: jest.Mock } } = {};

jest.mock("../../../src/infra/cosmos-favourite-repo", () => {
  const repo = {
    create: jest.fn(),
    list: jest.fn(),
  };
  repoState.instance = repo;
  return {
    CosmosFavouriteRepo: jest.fn().mockImplementation(() => repo),
  };
});

const getFavouriteRepoMock = () => repoState.instance!;

const authState: { validateToken?: jest.Mock } = {};

jest.mock("../../../src/utils/auth", () => {
  const validateToken = jest.fn();
  authState.validateToken = validateToken;
  return {
    validateToken,
  };
});

const getAuthMocks = () => authState as Required<typeof authState>;

import { addFavouriteHttp } from "../../../src/functions/favourites/addFavouriteHttp";
import { listFavouritesHttp } from "../../../src/functions/favourites/listFavouritesHttp";
import { clearFavouritesHttp } from "../../../src/functions/favourites/clearFavouritesHttp";
import { removeFavouriteHttp } from "../../../src/functions/favourites/removeFavouriteHttp";
import { syncFavouritesHttp } from "../../../src/functions/favourites/syncFavouritesHttp";

const createContext = () =>
  ({
    log: jest.fn(),
  } as any);

const createRequest = (
  overrides: Partial<{
    method: string;
    url: string;
    headers: Map<string, string>;
    params: Record<string, string>;
    json: () => Promise<unknown>;
  }> = {}
) =>
  ({
    method: "GET",
    url: "https://example",
    headers: new Map(),
    params: {},
    json: async () => ({}),
    ...overrides,
  } as any);

describe("Favourite HTTP handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const cosmos = getFavouritesContainer();
    cosmos.favouritesQueryFetchAll.mockReset();
    cosmos.favouritesDelete.mockReset();
    cosmos.favouritesCreate.mockReset();
    cosmos.favouritesContainer.items.query.mockClear();
    cosmos.favouritesContainer.items.create.mockClear();
    cosmos.favouritesContainer.item.mockClear();

    const repo = getFavouriteRepoMock();
    repo.create.mockReset();
    repo.list.mockReset();

    const auth = getAuthMocks();
    auth.validateToken.mockReset();
    auth.validateToken.mockReturnValue({ isValid: true, userId: "user-1" });
  });

  it("adds a favourite and returns list", async () => {
    const repo = getFavouriteRepoMock();
    repo.create.mockResolvedValue({
      success: true,
      data: { id: "fav", userId: "user-1", deviceId: "device-1", addedAt: new Date() },
    });
    repo.list.mockResolvedValue({
      success: true,
      data: [
        { id: "fav", userId: "user-1", deviceId: "device-1", addedAt: new Date() },
      ],
    });

    const req = {
      ...createRequest(),
      json: async () => ({ userId: "user-1", deviceId: "device-1" }),
      headers: new Map([["authorization", "Bearer token"]]),
    };

    const res = await addFavouriteHttp(req, createContext());
    expect(res.status).toBe(201);
  });

  it("lists favourites from container", async () => {
    getFavouritesContainer().favouritesQueryFetchAll.mockResolvedValue({
      resources: [{ id: "fav", userId: "user-1" }],
    });
    const res = await listFavouritesHttp(
      createRequest({ params: { userId: "user-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
  });

  it("clears favourites by deleting each document", async () => {
    getFavouritesContainer().favouritesQueryFetchAll.mockResolvedValue({
      resources: [{ id: "fav", userId: "user-1" }],
    });
    const res = await clearFavouritesHttp(
      createRequest({ params: { userId: "user-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
    expect(getFavouritesContainer().favouritesDelete).toHaveBeenCalled();
  });

  it("removes a specific favourite", async () => {
    getFavouritesContainer().favouritesQueryFetchAll.mockResolvedValue({
      resources: [{ id: "fav", userId: "user-1" }],
    });
    const res = await removeFavouriteHttp(
      createRequest({ params: { userId: "user-1", deviceId: "device-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
  });

  it("syncs favourites from request body", async () => {
    getFavouritesContainer().favouritesQueryFetchAll.mockResolvedValue({ resources: [] });
    const res = await syncFavouritesHttp(
      {
        ...createRequest({ params: { userId: "user-1" } }),
        json: async () => ({ favorites: ["device-1", "device-2", "device-2"] }),
      },
      createContext()
    );
    expect(res.status).toBe(200);
    expect(getFavouritesContainer().favouritesCreate).toHaveBeenCalledTimes(2);
  });
});
