// Integration Tests for Loan HTTP Endpoints
// Tests API endpoints end-to-end with fake repositories

import { HttpRequest, InvocationContext } from "@azure/functions";
import { createLoanHttp } from "../../src/functions/loans/createLoanHttp";
import { getUserLoansHttp } from "../../src/functions/loans/getUserLoansHttp";

// Mock the cosmos client
jest.mock("../../src/config/cosmosClient", () => ({
  loansContainer: {
    items: {
      upsert: jest.fn(),
      query: jest.fn(() => ({
        fetchAll: jest.fn(),
      })),
    },
    item: jest.fn(() => ({
      read: jest.fn(),
    })),
  },
}));

// Mock the auth utility
jest.mock("../../src/utils/auth", () => ({
  validateToken: jest.fn((req: HttpRequest) => {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return { isValid: false, error: "No token provided" };
    }
    // Extract mock userId from token (for testing)
    const token = authHeader.slice(7);
    return { isValid: true, userId: token };
  }),
  verifyUserAccess: jest.fn((authUserId: string, requestedUserId: string) => {
    return authUserId === requestedUserId;
  }),
  isAdmin: jest.fn(() => false),
}));

describe("Loan HTTP Endpoints - Integration Tests", () => {
  let mockContext: InvocationContext;
  let mockLoansContainer: any;

  beforeEach(() => {
    // Setup mock context
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    } as any;

    // Get mocked container
    const { loansContainer } = require("../../src/config/cosmosClient");
    mockLoansContainer = loansContainer;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("POST /loans - Create Loan", () => {
    it("should create loan with valid authentication and data", async () => {
      // Arrange
      const requestBody = {
        deviceId: "DEVICE-123",
        userId: "auth0|user1",
      };

      const mockRequest = {
        headers: new Map([["authorization", "Bearer auth0|user1"]]),
        json: async () => requestBody,
      } as unknown as HttpRequest;

      mockLoansContainer.items.upsert.mockResolvedValue({
        resource: {
          id: "LOAN-123",
          ...requestBody,
          status: "Requested",
        },
      });

      // Act
      const response = await createLoanHttp(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(201);
      expect(response.jsonBody).toHaveProperty("id");
      expect(response.jsonBody).toHaveProperty("deviceId", "DEVICE-123");
      expect(response.jsonBody).toHaveProperty("userId", "auth0|user1");
      expect(response.jsonBody).toHaveProperty("status", "Requested");
      expect(mockLoansContainer.items.upsert).toHaveBeenCalledTimes(1);
    });

    it("should reject loan creation without authentication", async () => {
      // Arrange
      const mockRequest = {
        headers: new Map(),
        json: async () => ({ deviceId: "DEVICE-123", userId: "auth0|user1" }),
      } as unknown as HttpRequest;

      // Act
      const response = await createLoanHttp(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(401);
      expect(response.jsonBody).toHaveProperty("message");
    });

    it("should reject loan creation for different user", async () => {
      // Arrange
      const mockRequest = {
        headers: new Map([["authorization", "Bearer auth0|user1"]]),
        json: async () => ({ deviceId: "DEVICE-123", userId: "auth0|user2" }),
      } as unknown as HttpRequest;

      // Act
      const response = await createLoanHttp(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(403);
      expect(response.jsonBody).toHaveProperty("message");
      expect(response.jsonBody.message).toContain(
        "Cannot create loan for other users"
      );
    });

    it("should reject loan creation without deviceId", async () => {
      // Arrange
      const mockRequest = {
        headers: new Map([["authorization", "Bearer auth0|user1"]]),
        json: async () => ({ userId: "auth0|user1" }),
      } as unknown as HttpRequest;

      // Act
      const response = await createLoanHttp(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(400);
      expect(response.jsonBody.message).toContain(
        "deviceId and userId are required"
      );
    });

    it("should reject loan creation without userId", async () => {
      // Arrange
      const mockRequest = {
        headers: new Map([["authorization", "Bearer auth0|user1"]]),
        json: async () => ({ deviceId: "DEVICE-123" }),
      } as unknown as HttpRequest;

      // Act
      const response = await createLoanHttp(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(400);
      expect(response.jsonBody.message).toContain(
        "deviceId and userId are required"
      );
    });
  });

  describe("GET /users/{userId}/loans - Get User Loans", () => {
    it("should return loans for authenticated user", async () => {
      // Arrange
      const userId = "auth0|user1";
      const mockRequest = {
        headers: new Map([["authorization", `Bearer ${userId}`]]),
        params: { userId },
      } as unknown as HttpRequest;

      const mockLoans = [
        {
          id: "LOAN-1",
          deviceId: "DEVICE-123",
          userId,
          status: "Approved",
        },
        {
          id: "LOAN-2",
          deviceId: "DEVICE-456",
          userId,
          status: "Collected",
        },
      ];

      mockLoansContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockLoans }),
      });

      // Act
      const response = await getUserLoansHttp(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(response.jsonBody).toHaveLength(2);
      expect(response.jsonBody[0]).toHaveProperty("id", "LOAN-1");
      expect(response.jsonBody[1]).toHaveProperty("id", "LOAN-2");
    });

    it("should reject access to other user loans", async () => {
      // Arrange
      const mockRequest = {
        headers: new Map([["authorization", "Bearer auth0|user1"]]),
        params: { userId: "auth0|user2" },
      } as unknown as HttpRequest;

      // Act
      const response = await getUserLoansHttp(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(403);
      expect(response.jsonBody.message).toContain("Access denied");
    });

    it("should reject unauthenticated requests", async () => {
      // Arrange
      const mockRequest = {
        headers: new Map(),
        params: { userId: "auth0|user1" },
      } as unknown as HttpRequest;

      // Act
      const response = await getUserLoansHttp(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
