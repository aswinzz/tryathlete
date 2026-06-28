import { NextResponse } from "next/server";

// JWT is stateless — client just drops the token. Nothing to revoke server-side.
export async function POST() {
  return NextResponse.json({ ok: true });
}
