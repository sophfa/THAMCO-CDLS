import { HttpRequest, InvocationContext } from "@azure/functions";
import { validateFunctionKey } from "../../src/utils/functionKey";

const createContext = () =>
  ({
    log: jest.fn(),
  } as unknown as InvocationContext);

const createRequest = (
  overrides: Partial<{
    headers: Map<string, string>;
    query: Map<string, string>;
  }> = {}
) =>
  ({
    headers: new Map(),
    query: new Map(),
    ...overrides,
  } as unknown as HttpRequest);

describe("validateFunctionKey", () => {
  beforeEach(() => {
    delete process.env.FUNCTION_KEY;
    delete process.env.PRODUCTS_FUNCTION_KEY;
  });

  it("returns 500 when no key configured", () => {
    const res = validateFunctionKey(createRequest(), createContext());
    expect(res?.status).toBe(500);
  });

  it("returns 401 when key missing", () => {
    process.env.FUNCTION_KEY = "secret";
    const res = validateFunctionKey(createRequest(), createContext());
    expect(res?.status).toBe(401);
  });

  it("returns 403 when key mismatched", () => {
    process.env.FUNCTION_KEY = "secret";
    const res = validateFunctionKey(
      createRequest({ query: new Map([["code", "wrong"]]) }),
      createContext()
    );
    expect(res?.status).toBe(403);
  });

  it("returns null when key matches", () => {
    process.env.FUNCTION_KEY = "secret";
    const res = validateFunctionKey(
      createRequest({ query: new Map([["code", "secret"]]) }),
      createContext()
    );
    expect(res).toBeNull();
  });
});
