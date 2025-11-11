const cosmosLoansState: {
  loansContainer?: any;
  loanRead?: jest.Mock;
  loanUpsert?: jest.Mock;
  loanQueryFetchAll?: jest.Mock;
  loanItemsQuery?: jest.Mock;
} = {};

jest.mock("../../../src/config/cosmosClient", () => {
  const loanRead = jest.fn();
  const loanUpsert = jest.fn();
  const loanQueryFetchAll = jest.fn();
  const loanItemsQuery = jest.fn(() => ({ fetchAll: loanQueryFetchAll }));

  const loansContainer = {
    item: jest.fn(() => ({ read: loanRead })),
    items: {
      query: loanItemsQuery,
      upsert: loanUpsert,
    },
  };

  cosmosLoansState.loansContainer = loansContainer;
  cosmosLoansState.loanRead = loanRead;
  cosmosLoansState.loanUpsert = loanUpsert;
  cosmosLoansState.loanQueryFetchAll = loanQueryFetchAll;
  cosmosLoansState.loanItemsQuery = loanItemsQuery;

  return {
    loansContainer,
    favouritesContainer: {
      items: {
        query: jest.fn(),
      },
    },
  };
});

const getCosmosLoans = () => cosmosLoansState as Required<typeof cosmosLoansState>;

const cosmosClientState: {
  waitlistContainer?: any;
  waitlistQueryFetchAll?: jest.Mock;
  client?: jest.Mock;
} = {};

jest.mock("@azure/cosmos", () => {
  const waitlistQueryFetchAll = jest.fn();
  const waitlistContainer = {
    items: {
      query: jest.fn(() => ({ fetchAll: waitlistQueryFetchAll })),
    },
  };

  cosmosClientState.waitlistContainer = waitlistContainer;
  cosmosClientState.waitlistQueryFetchAll = waitlistQueryFetchAll;

  const CosmosClient = jest.fn().mockImplementation(() => ({
    database: () => ({
      container: () => waitlistContainer,
    }),
  }));

  cosmosClientState.client = CosmosClient;

  return { CosmosClient };
});

const getWaitlistContainer = () => cosmosClientState as Required<typeof cosmosClientState>;

const authState: { validateToken?: jest.Mock; verifyUserAccess?: jest.Mock } = {};

jest.mock("../../../src/utils/auth", () => {
  const validateToken = jest.fn();
  const verifyUserAccess = jest.fn((auth: string, requested: string) => auth === requested);
  authState.validateToken = validateToken;
  authState.verifyUserAccess = verifyUserAccess;
  return {
    validateToken,
    verifyUserAccess,
  };
});

const getAuthMocks = () => authState as Required<typeof authState>;

import { addToWaitlistHttp } from "../../../src/functions/waitlist/addToWaitlistHttp";
import { addToWaitlistByDeviceHttp } from "../../../src/functions/waitlist/addToWaitlistByDeviceHttp";
import { getUserWaitlistPositionsHttp } from "../../../src/functions/waitlist/getUserWaitlistHttp";
import { getWaitlistForProductHttp } from "../../../src/functions/waitlist/getWaitlistForProductHttp";
import { removeUserFromWaitlistHttp } from "../../../src/functions/waitlist/removeUserFromWaitlistHttp";

const createContext = () =>
  ({
    log: jest.fn(),
    error: jest.fn(),
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

describe("Waitlist HTTP handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const cosmos = getCosmosLoans();
    cosmos.loanRead.mockReset();
    cosmos.loanUpsert.mockReset();
    cosmos.loanQueryFetchAll.mockReset();
    cosmos.loanItemsQuery.mockClear();
    cosmos.loansContainer.item.mockClear();
    cosmos.loansContainer.items.query.mockClear();
    cosmos.loansContainer.items.upsert.mockClear();

    const waitlist = getWaitlistContainer();
    waitlist.waitlistQueryFetchAll.mockReset();
    waitlist.waitlistContainer.items.query.mockClear();

    const auth = getAuthMocks();
    auth.validateToken.mockReset();
    auth.verifyUserAccess.mockReset();
    auth.validateToken.mockReturnValue({ isValid: true, userId: "auth0|user-1" });
    auth.verifyUserAccess.mockImplementation(
      (authUser: string, requested: string) => authUser === requested
    );

    process.env.COSMOS_ENDPOINT = "https://example";
    process.env.COSMOS_KEY = "key";
    process.env.COSMOS_DATABASE = "db";
    process.env.COSMOS_CONTAINER = "Loans";
  });

  it("adds a user to a loan waitlist", async () => {
    getCosmosLoans().loanRead.mockResolvedValue({
      resource: { id: "loan-1", waitlist: [], status: "Requested" },
    });

    const req = {
      ...createRequest({ params: { id: "loan-1" } }),
      json: async () => ({ userId: "auth0|user-1" }),
    };

    const res = await addToWaitlistHttp(req, createContext());
    expect(res.status).toBe(200);
    expect(getCosmosLoans().loanUpsert).toHaveBeenCalled();
  });

  it("adds a user to waitlist by device", async () => {
    getCosmosLoans().loanQueryFetchAll.mockResolvedValue({ resources: [] });
    getCosmosLoans().loanUpsert.mockResolvedValue({});

    const req = {
      ...createRequest({ params: { deviceId: "device-1" } }),
      json: async () => ({ userId: "auth0|user-1" }),
      headers: new Map([["authorization", "Bearer token"]]),
    };

    const res = await addToWaitlistByDeviceHttp(req, createContext());
    expect(res.status).toBe(200);
    expect(getCosmosLoans().loanUpsert).toHaveBeenCalled();
  });

  it("fetches waitlist positions for a user", async () => {
    getCosmosLoans().loanQueryFetchAll.mockResolvedValue({
      resources: [{ id: "loan-1", deviceId: "device-1", waitlist: ["auth0|user-1"] }],
    });

    const req = {
      ...createRequest({ params: { userId: "auth0|user-1" } }),
      headers: new Map([["authorization", "Bearer token"]]),
    };

    const res = await getUserWaitlistPositionsHttp(req, createContext());
    expect(res.status).toBe(200);
  });

  it("fetches waitlist for a product", async () => {
    getWaitlistContainer().waitlistQueryFetchAll.mockResolvedValue({
      resources: [{ id: "loan-1", deviceId: "device-1", waitlist: ["u1"] }],
    });

    const res = await getWaitlistForProductHttp(
      createRequest({ params: { deviceId: "device-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
  });

  it("removes a user from a waitlist", async () => {
    getCosmosLoans().loanRead.mockResolvedValue({
      resource: {
        id: "loan-1",
        waitlist: ["auth0|user-1"],
        userId: "auth0|user-1",
      },
    });

    const req = {
      ...createRequest({ params: { id: "loan-1" } }),
      headers: new Map([["authorization", "Bearer token"]]),
      json: async () => ({ userId: "auth0|user-1" }),
    };

    const res = await removeUserFromWaitlistHttp(req, createContext());
    expect(res.status).toBe(200);
  });
});
