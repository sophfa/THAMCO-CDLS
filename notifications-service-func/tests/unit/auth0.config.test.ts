import { getAuth0Config, MissingAuth0ConfigurationError } from "../../src/auth0/config";

describe("auth0 config", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("throws when configuration is missing", () => {
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_MGMT_AUDIENCE;
    delete process.env.AUTH0_M2M_CLIENT_ID;
    delete process.env.AUTH0_M2M_CLIENT_SECRET;

    expect(() => getAuth0Config()).toThrow(MissingAuth0ConfigurationError);
  });

  it("returns config when provided", () => {
    process.env.AUTH0_DOMAIN = "example.auth0.com";
    process.env.AUTH0_M2M_CLIENT_ID = "client";
    process.env.AUTH0_M2M_CLIENT_SECRET = "secret";
    process.env.AUTH0_MGMT_AUDIENCE = "https://example.auth0.com/api/v2/";

    const config = getAuth0Config();
    expect(config.domain).toBe("example.auth0.com");
    expect(config.audience).toContain("api/v2");
  });
});
