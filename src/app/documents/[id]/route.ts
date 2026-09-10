import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSessionUser()) return new Response("Sign in to download this document.", { status: 401 });
  const { id } = await params;
  const client = await createClient();
  const { data: document, error } = await client.from("student_documents").select("storage_path,name").eq("id", id).maybeSingle();
  if (error || !document) return new Response("Document not found.", { status: 404 });
  const { data, error: downloadError } = await client.storage.from("student-documents").download(document.storage_path);
  if (downloadError || !data) return new Response("Document unavailable.", { status: 404 });
  return new Response(await data.arrayBuffer(), { headers: {
    "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.name)}`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } });
}
