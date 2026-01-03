jest.mock("@azure/functions", () => ({
  app: { http: jest.fn() },
}));

describe("preflightHttp registration", () => {
  const getHttpMock = () =>
    (require("@azure/functions") as { app: { http: jest.Mock } }).app.http;

  const loadModule = () => {
    require("../../src/functions/preflightHttp");
  };

  beforeEach(() => {
    jest.resetModules();
    delete process.env.AZURE_FUNCTIONS_ENVIRONMENT;
    delete process.env.NODE_ENV;
  });

  it("registers the handler in development", () => {
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = "development";
    loadModule();

    const httpMock = getHttpMock();
    expect(httpMock).toHaveBeenCalledTimes(1);
    expect(httpMock).toHaveBeenCalledWith(
      "preflightHttp",
      expect.objectContaining({
        methods: ["OPTIONS"],
        route: "{*path}",
        authLevel: "anonymous",
      })
    );
  });

  it("skips registration outside development", () => {
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = "production";
    loadModule();

    const httpMock = getHttpMock();
    expect(httpMock).not.toHaveBeenCalled();
  });
});
