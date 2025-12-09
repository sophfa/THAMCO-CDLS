import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { favouritesContainer } from "../../config/cosmosClient";

export async function listFavouritesHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  const userId = req.params.userId;
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
