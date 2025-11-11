const cosmosState: {
  loansContainer?: any;
  favouritesContainer?: any;
  loanRead?: jest.Mock;
  loanDelete?: jest.Mock;
  loanUpsert?: jest.Mock;
  loanItemsQuery?: jest.Mock;
  loanQueryFetchAll?: jest.Mock;
  loanItemsCreate?: jest.Mock;
} = {};

jest.mock("../../../src/config/cosmosClient", () => {
  const loanRead = jest.fn();
  const loanDelete = jest.fn();
  const loanQueryFetchAll = jest.fn();
  const loanItemsQuery = jest.fn(() => ({ fetchAll: loanQueryFetchAll }));
  const loanUpsert = jest.fn();
  const loanItemsCreate = jest.fn();

  const loansContainer = {
    item: jest.fn(() => ({ read: loanRead, delete: loanDelete })),
    items: {
      query: loanItemsQuery,
      upsert: loanUpsert,
      create: loanItemsCreate,
    },
  };

  const favouritesContainer = {
    items: {
      query: jest.fn(),
      create: jest.fn(),
    },
  };

  cosmosState.loansContainer = loansContainer;
  cosmosState.favouritesContainer = favouritesContainer;
  cosmosState.loanRead = loanRead;
  cosmosState.loanDelete = loanDelete;
  cosmosState.loanUpsert = loanUpsert;
  cosmosState.loanItemsQuery = loanItemsQuery;
  cosmosState.loanQueryFetchAll = loanQueryFetchAll;
  cosmosState.loanItemsCreate = loanItemsCreate;

  return {
    loansContainer,
    favouritesContainer,
  };
});

const getCosmosMocks = () => cosmosState as Required<typeof cosmosState>;

const loanRepoState: { instance?: { get: jest.Mock; list: jest.Mock } } = {};

jest.mock("../../../src/infra/cosmos-loan-repo", () => {
  const repo = {
    get: jest.fn(),
    list: jest.fn(),
  };
  loanRepoState.instance = repo;
  return {
    CosmosLoanRepo: jest.fn().mockImplementation(() => repo),
  };
});

const getLoanRepoMock = () => loanRepoState.instance!;

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

import { authLoanHttp } from "../../../src/functions/loans/authLoanHttp";
import { cancelLoanHttp } from "../../../src/functions/loans/cancelLoanHttp";
import { collectLoanHttp } from "../../../src/functions/loans/collectLoanHttp";
import { rejectLoanHttp } from "../../../src/functions/loans/rejectLoanHttp";
import { returnLoanHttp } from "../../../src/functions/loans/returnLoanHttp";
import { getDeviceLoanHistoryHttp } from "../../../src/functions/loans/getDeviceLoanHistoryHttp";
import { getLoanByIdHttp } from "../../../src/functions/loans/getLoanHttp";
import { listLoansHttp } from "../../../src/functions/loans/listLoansHttp";

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

const makeLoan = (overrides: Record<string, any> = {}) => ({
  id: "loan-1",
  deviceId: "DEVICE-1",
  userId: "auth0|user-1",
  status: "Requested",
  waitlist: [],
  ...overrides,
});

describe("Loan HTTP handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const cosmos = getCosmosMocks();
    cosmos.loanRead.mockReset();
    cosmos.loanDelete.mockReset();
    cosmos.loanUpsert.mockReset();
    cosmos.loanItemsQuery.mockClear();
    cosmos.loanQueryFetchAll.mockReset();
    cosmos.loanItemsCreate.mockReset();
    cosmos.loansContainer.item.mockClear();
    cosmos.loansContainer.items.query.mockClear();
    cosmos.loansContainer.items.upsert.mockClear();
    cosmos.loansContainer.items.create.mockClear();

    const repo = getLoanRepoMock();
    repo.get.mockReset();
    repo.list.mockReset();

    const auth = getAuthMocks();
    auth.validateToken.mockReset();
    auth.validateToken.mockReturnValue({ isValid: true, userId: "auth0|user-1" });
  });

  it("approves a requested loan", async () => {
    getCosmosMocks().loanRead.mockResolvedValue({ resource: makeLoan() });
    const res = await authLoanHttp(
      createRequest({ params: { loanId: "loan-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
    expect(getCosmosMocks().loanUpsert).toHaveBeenCalled();
  });

  it("cancels a loan when the caller is the owner", async () => {
    getCosmosMocks().loanRead.mockResolvedValue({ resource: makeLoan({ status: "Requested" }) });
    const res = await cancelLoanHttp(
      createRequest({ params: { id: "loan-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
  });

  it("collects an approved loan", async () => {
    getCosmosMocks().loanRead.mockResolvedValue({ resource: makeLoan({ status: "Approved" }) });
    const res = await collectLoanHttp(
      createRequest({ params: { id: "loan-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
  });

  it("rejects a requested loan with reason", async () => {
    getCosmosMocks().loanRead.mockResolvedValue({ resource: makeLoan() });
    const req = {
      ...createRequest({ params: { id: "loan-1" } }),
      json: async () => ({ reason: "Not available" }),
    };
    const res = await rejectLoanHttp(req, createContext());
    expect(res.status).toBe(200);
    expect(getCosmosMocks().loanUpsert).toHaveBeenCalled();
  });

  it("marks loan as returned", async () => {
    getCosmosMocks().loanRead.mockResolvedValue({ resource: makeLoan({ status: "Collected" }) });
    const res = await returnLoanHttp(
      createRequest({ params: { id: "loan-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
  });

  it("returns device loan history", async () => {
    getCosmosMocks().loanQueryFetchAll.mockResolvedValue({
      resources: [makeLoan({ status: "Approved" })],
    });
    const res = await getDeviceLoanHistoryHttp(
      createRequest({ params: { deviceId: "DEVICE-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
    expect(getCosmosMocks().loansContainer.items.query).toHaveBeenCalled();
  });

  it("gets a single loan via repository", async () => {
    getLoanRepoMock().get.mockResolvedValue({ success: true, data: makeLoan() });
    const res = await getLoanByIdHttp(
      createRequest({ params: { id: "loan-1" } }),
      createContext()
    );
    expect(res.status).toBe(200);
    expect(getLoanRepoMock().get).toHaveBeenCalledWith("loan-1");
  });

  it("lists loans via repository", async () => {
    getLoanRepoMock().list.mockResolvedValue({ success: true, data: [makeLoan()] });
    const res = await listLoansHttp(createRequest(), createContext());
    expect(res.status).toBe(200);
    expect(getLoanRepoMock().list).toHaveBeenCalled();
  });
});
