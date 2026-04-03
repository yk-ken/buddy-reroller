// src/api/preview.ts — POST /api/preview
import { rollCompanion } from "../core/buddy";

export async function handlePreview(req: Request): Promise<Response> {
  const { userID } = await req.json();
  if (!userID || typeof userID !== "string") {
    return Response.json({ error: "userID required" }, { status: 400 });
  }
  const companion = rollCompanion(userID);
  return Response.json({ companion, userID });
}
