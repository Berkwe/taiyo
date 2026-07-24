import { NextResponse } from "next/server"
import { validateRelease } from "~/features/management/release-validation"
import { requireManagementUser } from "~/features/management/server"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireManagementUser("content:publish")
  const result = await validateRelease((await params).id)
  return NextResponse.json(result)
}
