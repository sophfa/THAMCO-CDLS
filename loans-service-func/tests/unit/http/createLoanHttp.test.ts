import { HttpRequest, InvocationContext } from "@azure/functions";

const cosmosState: {
  loansContainer?: any;
  loanItemsCreate?: jest.Mock;
  loanItemsUpsert?: jest.Mock;
  loanItemsQuery?: jest.Mock;
  loanQueryFetchAll?: jest.Mock;
  loanItemRead?: jest.Mock;
  loanItemDelete?: jest.Mock;
} = {};

jest.mock("../../../src/config/cosmosClient", () => {
  const loanItemsCreate = jest.fn();
  const loanItemsUpsert = jest.fn();
  const loanQueryFetchAll = jest.fn();
  const loanItemsQuery = jest.fn(() => ({ fetchAll: loanQueryFetchAll }));
  const loanItemRead = jest.fn();
  const loanItemDelete = jest.fn();

  const loansContainer = {
    items: {
      create: loanItemsCreate,
      upsert: loanItemsUpsert,
      query: loanItemsQuery,
    },
    item: jest.fn(() => ({ read: loanItemRead, delete: loanItemDelete })),
  };

  cosmosState.loansContainer = loansContainer;
  cosmosState.loanItemsCreate = loanItemsCreate;
  cosmosState.loanItemsUpsert = loanItemsUpsert;
  cosmosState.loanItemsQuery = loanItemsQuery;
  cosmosState.loanQueryFetchAll = loanQueryFetchAll;
  cosmosState.loanItemRead = loanItemRead;
  cosmosState.loanItemDelete = loanItemDelete;

  return { loansContainer };
});

const authState: { validateToken?: jest.Mock } = {};

jest.mock("../../../src/utils/auth", () => {
  const validateToken = jest.fn();
  authState.validateToken = validateToken;
  return { validateToken };
});

jest.mock("../../../src/events/eventGridPublisher", () => ({
  publishLoanStatusChangedEvent: jest.fn(),
}));

let createLoanHttp: (
  request: HttpRequest,
  context: InvocationContext
) => Promise<any>;

const getCosmosMocks = () => cosmosState as Required<typeof cosmosState>;
const getAuthMocks = () => authState as Required<typeof authState>;

const createContext = () =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    invocationId: "inv-1",
  } as unknown as InvocationContext);

const createRequest = (
  overrides: Partial<{
    headers: Map<string, string>;
    json: () => Promise<unknown>;
  }> = {}
) =>
  ({
    headers: new Map(),
    json: async () => ({}),
    ...overrides,
  } as unknown as HttpRequest);

describe("createLoanHttp", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.INVENTORY_API_URL = "https://inventory.test";

    createLoanHttp =
      require("../../../src/functions/loans/createLoanHttp").createLoanHttp;

    jest.clearAllMocks();

    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { stock: 2 } }),
      text: async () => "",
    });

    getAuthMocks().validateToken.mockResolvedValue({
      isValid: true,
      userId: "auth0|user-1",
    });
    getCosmosMocks().loanItemsCreate.mockResolvedValue({});
    getCosmosMocks().loanQueryFetchAll.mockResolvedValue({ resources: [0] });
  });

  it("returns 401 when auth fails", async () => {
    getAuthMocks().validateToken.mockResolvedValue({ isValid: false });
    const response = await createLoanHttp(createRequest(), createContext());
    expect(response.status).toBe(401);
  });

  it("returns 400 when deviceId is missing", async () => {
    const response = await createLoanHttp(
      createRequest({
        headers: new Map([["authorization", "Bearer auth0|user-1"]]),
        json: async () => ({ userId: "auth0|user-1" }),
      }),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("returns 403 when userId does not match token", async () => {
    const response = await createLoanHttp(
      createRequest({
        headers: new Map([["authorization", "Bearer auth0|user-1"]]),
        json: async () => ({ userId: "auth0|other", deviceId: "DEV-1" }),
      }),
      createContext()
    );
    expect(response.status).toBe(403);
  });

  it("returns 400 when from date is invalid", async () => {
    const response = await createLoanHttp(
      createRequest({
        headers: new Map([["authorization", "Bearer auth0|user-1"]]),
        json: async () => ({
          userId: "auth0|user-1",
          deviceId: "DEV-1",
          from: "bad-date",
        }),
      }),
      createContext()
    );
    expect(response.status).toBe(400);
  });

  it("returns 503 when inventory fetch fails", async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: false, status: 500, statusText: "err", text: async () => "fail" });
    const response = await createLoanHttp(
      createRequest({
        headers: new Map([["authorization", "Bearer auth0|user-1"]]),
        json: async () => ({ userId: "auth0|user-1", deviceId: "DEV-1" }),
      }),
      createContext()
    );
    expect(response.status).toBe(503);
  });

  it("returns 409 when no stock available", async () => {
    getCosmosMocks().loanQueryFetchAll.mockResolvedValue({ resources: [2] });
    const response = await createLoanHttp(
      createRequest({
        headers: new Map([["authorization", "Bearer auth0|user-1"]]),
        json: async () => ({ userId: "auth0|user-1", deviceId: "DEV-1" }),
      }),
      createContext()
    );
    expect(response.status).toBe(409);
  });

  it("creates loan when available", async () => {
    const response = await createLoanHttp(
      createRequest({
        headers: new Map([["authorization", "Bearer auth0|user-1"]]),
        json: async () => ({ userId: "auth0|user-1", deviceId: "DEV-1" }),
      }),
      createContext()
    );
    expect(response.status).toBe(201);
    expect(getCosmosMocks().loanItemsUpsert).toHaveBeenCalled();
  });
});
