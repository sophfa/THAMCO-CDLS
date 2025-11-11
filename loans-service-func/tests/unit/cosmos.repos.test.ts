const createContainerMock = () => ({
  items: {
    query: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  item: jest.fn(),
});

const loanContainer = createContainerMock();
const favouriteContainer = createContainerMock();
const mockCosmosClient = jest.fn().mockImplementation(() => ({
  database: () => ({
    container: (containerId: string) =>
      containerId === "Favourites" ? favouriteContainer : loanContainer,
  }),
}));

jest.mock("@azure/cosmos", () => ({
  CosmosClient: mockCosmosClient,
}));

const resetContainer = (container: ReturnType<typeof createContainerMock>) => {
  container.items.query.mockReset();
  container.items.create.mockReset();
  container.items.upsert.mockReset();
  container.item.mockReset();
};

describe("Cosmos repositories", () => {
  beforeEach(() => {
    resetContainer(loanContainer);
    resetContainer(favouriteContainer);
    jest.resetModules();
    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_KEY = "key";
    process.env.COSMOS_DATABASE = "db";
    process.env.COSMOS_CONTAINER = "Loans";
    process.env.COSMOS_CONTAINER_FAVOURITES = "Favourites";
  });

  it("initializes shared cosmos client config", () => {
    const module = require("../../src/config/cosmosClient");
    expect(module.loansContainer).toBe(loanContainer);
    expect(module.favouritesContainer).toBe(favouriteContainer);
    expect(mockCosmosClient).toHaveBeenCalled();
  });

  it("lists, creates, and gets loans via CosmosLoanRepo", async () => {
    const { CosmosLoanRepo } = require("../../src/infra/cosmos-loan-repo");
    loanContainer.items.query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({
        resources: [
          {
            id: "1",
            deviceId: "D1",
            userId: "U1",
            createdAt: new Date().toISOString(),
            from: new Date().toISOString(),
            till: new Date().toISOString(),
            status: "Requested",
          },
        ],
      }),
    });

    loanContainer.items.create.mockResolvedValue({
      resource: {
        id: "1",
        deviceId: "D1",
        userId: "U1",
        createdAt: new Date().toISOString(),
        from: new Date().toISOString(),
        till: new Date().toISOString(),
        status: "Requested",
      },
    });

    loanContainer.item.mockReturnValue({
      read: jest.fn().mockResolvedValue({
        resource: {
          id: "1",
          deviceId: "D1",
          userId: "U1",
          createdAt: new Date().toISOString(),
          from: new Date().toISOString(),
          till: new Date().toISOString(),
          status: "Requested",
        },
      }),
    });

    const repo = new CosmosLoanRepo({
      endpoint: "https://example",
      databaseId: "db",
      containerId: "Loans",
    });

    const listResult = await repo.list();
    expect(listResult.success).toBe(true);

    const createResult = await repo.create({
      id: "1",
      deviceId: "D1",
      userId: "U1",
      createdAt: new Date(),
      from: new Date(),
      till: new Date(),
      status: "Requested",
    });
    expect(createResult.success).toBe(true);

    const getResult = await repo.get("1");
    expect(getResult.success).toBe(true);
  });

  it("maps Cosmos errors in repositories", async () => {
    const { CosmosLoanRepo } = require("../../src/infra/cosmos-loan-repo");
    const { CosmosFavouriteRepo } = require("../../src/infra/cosmos-favourite-repo");

    loanContainer.items.create.mockRejectedValue({ code: 409 });
    loanContainer.items.query.mockImplementation(() => {
      throw { code: 500, message: "boom" };
    });

    const repo = new CosmosLoanRepo({
      endpoint: "e",
      databaseId: "d",
      containerId: "Loans",
    });

    const createResult = await repo.create({
      id: "dup",
      deviceId: "D1",
      userId: "U1",
      createdAt: new Date(),
      from: new Date(),
      till: new Date(),
      status: "Requested",
    });
    expect(createResult.success).toBe(false);

    const listResult = await repo.list();
    expect(listResult.success).toBe(false);

    favouriteContainer.items.create.mockRejectedValue({ code: 400 });
    const favRepo = new CosmosFavouriteRepo({
      endpoint: "e",
      databaseId: "d",
      containerId: "Favourites",
    });
    const favResult = await favRepo.create({
      id: "fav",
      deviceId: "D",
      userId: "U",
      addedAt: new Date(),
    });
    expect(favResult.success).toBe(false);
  });
});
