import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deleteTag } from "@/actions/tags";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { tagId: string } }
) {
  try {
    await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteTag(params.tagId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    const status = message.includes("Permission") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
