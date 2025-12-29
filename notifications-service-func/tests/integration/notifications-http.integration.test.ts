import { HttpRequest, InvocationContext } from "@azure/functions";

jest.mock("../../src/utils/auth", () => ({
  validateToken: jest.fn(),
}));

jest.mock("../../src/infra/notificationRepoFactory", () => {
  const actual = jest.requireActual("../../src/infra/notificationRepoFactory");
  return {
    ...actual,
    getNotificationRepo: jest.fn(),
  };
});

const { getNotificationsByUserHttp } = require("../../src/functions/getNotificationsByUserHttp");
const { getNotificationRepo } = require("../../src/infra/notificationRepoFactory");
const { validateToken } = require("../../src/utils/auth");

describe("notifications HTTP endpoints", () => {
  let context: InvocationContext;

  beforeEach(() => {
    context = {
      log: jest.fn(),
      error: jest.fn(),
    } as unknown as InvocationContext;
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    validateToken.mockResolvedValue({ isValid: false });

    const request = {
      params: { userId: "auth0|user-1" },
    } as unknown as HttpRequest;

    const response = await getNotificationsByUserHttp(request, context);
    expect(response.status).toBe(401);
  });

  it("returns notifications for the user", async () => {
    validateToken.mockResolvedValue({ isValid: true, userId: "auth0|user-1" });
    const mockRepo = {
      getByUserId: jest.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: "N-1",
            userId: "auth0|user-1",
            type: "Custom",
            message: "Hello",
            payload: { message: "Hello" },
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    };
    getNotificationRepo.mockReturnValue(mockRepo);

    const request = {
      params: { userId: "auth0|user-1" },
    } as unknown as HttpRequest;

    const response = await getNotificationsByUserHttp(request, context);
    expect(response.status).toBe(200);
    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it("returns 400 when user id is missing", async () => {
    validateToken.mockResolvedValue({ isValid: true, userId: "auth0|user-1" });

    const request = {
      params: { userId: "" },
    } as unknown as HttpRequest;

    const response = await getNotificationsByUserHttp(request, context);
    expect(response.status).toBe(400);
  });
});
