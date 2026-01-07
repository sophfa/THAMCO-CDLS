import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { favouritesContainer } from "../../config/cosmosClient";
import {
  validateToken,
  verifyUserAccess,
  isAdmin,
} from "../../utils/auth";

export async function listFavouritesHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return { status: 204 };
  }
  const authResult = await validateToken(req, ctx);
  if (!authResult.isValid || !authResult.token) {
    ctx.log?.("Authentication failed for listFavouritesHttp", authResult.error);
    return {
      status: 401,
      jsonBody: { message: authResult.error || "Unauthorized" },
    };
  }
  const rawUserId = req.params.userId ?? "";
  const userId = decodeURIComponent(rawUserId).trim();
  if (!userId) {
    return {
      status: 400,
      jsonBody: { message: "userId route parameter is required" },
    };
  }
  if (
    !isAdmin(authResult.token) &&
    !verifyUserAccess(authResult.userId ?? "", userId)
  ) {
    return {
      status: 403,
      jsonBody: { message: "Access denied: Cannot view other user favorites" },
    };
  }
  const { resources } = await favouritesContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.userId = @userId",
      parameters: [{ name: "@userId", value: userId }],
    })
    .fetchAll();
  return { status: 200, jsonBody: resources };
}

app.http("listFavouritesHttp", {
  methods: ["GET"],
  route: "loans/user/{userId}/favorites",
  authLevel: "anonymous",
  handler: listFavouritesHttp,
});
