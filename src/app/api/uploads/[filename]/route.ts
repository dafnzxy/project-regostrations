import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

interface RouteParams {
  params: Promise<{ filename: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteParams
) {
  try {
    const { filename } = await context.params;
    const sanitizedFilename = path.basename(filename);

    if (!/^[a-zA-Z0-9._-]+$/.test(sanitizedFilename)) {
      return new NextResponse("Nama file tidak valid", { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "uploads", sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File tidak ditemukan", { status: 404 });
    }

    const buffer = await fs.promises.readFile(filePath);
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentType = MIME_MAP[ext];
    if (!contentType) {
      return new NextResponse("Tipe file tidak diizinkan", { status: 403 });
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving uploaded file:", error);
    return new NextResponse("Gagal memuat file", { status: 500 });
  }
}
