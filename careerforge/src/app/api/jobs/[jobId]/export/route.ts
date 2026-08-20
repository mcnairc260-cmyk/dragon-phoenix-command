import { NextResponse } from "next/server";

import {
  exportFilename,
  packToMarkdown,
  toPlainText,
  type ExportableMaterial,
} from "@/lib/domain/export";
import { prisma } from "@/lib/server/prisma";
import { UnauthorizedError, requireUserOrThrow } from "@/lib/server/session";

/**
 * Downloads every draft for one job as a single file.
 *
 * The response is served as an attachment with a `nosniff` header so a browser
 * cannot be talked into rendering user-authored content as HTML from this
 * origin.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const user = await requireUserOrThrow();
    const { jobId } = await params;

    const format =
      new URL(request.url).searchParams.get("format") === "txt" ? "txt" : "md";

    const job = await prisma.jobOpportunity.findFirst({
      where: { id: jobId, userId: user.id },
      include: { materials: { orderBy: { kind: "asc" } } },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (job.materials.length === 0) {
      return NextResponse.json(
        { error: "Nothing to export yet" },
        { status: 409 },
      );
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { fullName: true },
    });

    const context = {
      jobTitle: job.title,
      company: job.company,
      candidateName: profile?.fullName ?? user.name ?? "Candidate",
    };

    const materials: ExportableMaterial[] = job.materials.map((m) => ({
      kind: m.kind,
      content: m.content,
      isEdited: m.isEdited,
      updatedAt: m.updatedAt,
    }));

    const markdown = packToMarkdown(materials, context);
    const body = format === "txt" ? toPlainText(markdown) : markdown;
    const filename = exportFilename(context, "ALL", format);

    return new NextResponse(body, {
      headers: {
        "content-type": `text/${format === "md" ? "markdown" : "plain"}; charset=utf-8`,
        "content-disposition": `attachment; filename="${filename}"`,
        "x-content-type-options": "nosniff",
        // Application material is personal; never let a proxy hold a copy.
        "cache-control": "no-store, private",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[export] failed");
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
