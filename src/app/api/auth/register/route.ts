import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/actions/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email: string; password: string; name?: string };
    const result = await registerUser(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
