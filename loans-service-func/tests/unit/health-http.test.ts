import { HttpRequest, InvocationContext } from "@azure/functions";
import { healthHttp } from "../../src/functions/healthHttp";

const createContext = () =>
  ({
    log: jest.fn(),
    invocationId: "inv-1",
  } as unknown as InvocationContext);

const createRequest = (method: string): HttpRequest =>
  ({
    method,
    headers: new Map(),
  } as unknown as HttpRequest);

describe("loans healthHttp", () => {
  it("returns 204 for OPTIONS", async () => {
    const response = await healthHttp(
      createRequest("OPTIONS"),
      createContext()
    );
    expect(response.status).toBe(204);
  });

  it("returns 200 with status", async () => {
    const response = await healthHttp(
      createRequest("GET"),
      createContext()
    );
    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      status: "ok",
      service: "loans-service-func",
    });
  });
});
