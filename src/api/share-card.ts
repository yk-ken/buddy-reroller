// src/api/share-card.ts — POST /api/share-card (stub)
export async function handleShareCard(req: Request): Promise<Response> {
  const body = await req.json();
  return Response.json({ message: "Use client-side Canvas API", data: body });
}
