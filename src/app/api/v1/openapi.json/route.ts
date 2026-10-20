import schema from "@/lib/blog-openapi.json";
// OpenAPI is deliberately public and has no article data, identifiers or secrets.
export async function GET() { return Response.json(schema); }
