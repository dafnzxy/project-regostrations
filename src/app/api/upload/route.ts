import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { checkAdminAuth } from "@/actions/auth";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function hasValidImageMagicBytes(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return true;
  // GIF: "GIF87a" or "GIF89a"
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38
  )
    return true;
  // WEBP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Hanya Admin yang dapat mengunggah banner." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File gambar tidak ditemukan." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Format file tidak didukung. Harap unggah gambar JPG, PNG, WebP, GIF, atau SVG.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Ukuran file terlalu besar. Maksimal ukuran gambar adalah 10MB.",
        },
        { status: 400 }
      );
    }

    const ext = ALLOWED_TYPES[file.type] || "jpg";
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const filename = `banner-${uniqueSuffix}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!hasValidImageMagicBytes(buffer)) {
      return NextResponse.json(
        {
          success: false,
          message: "Isi file tidak valid. Pastikan file benar-benar gambar JPG, PNG, WebP, atau GIF.",
        },
        { status: 400 }
      );
    }

    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `/api/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename,
      size: file.size,
    });
  } catch (error: unknown) {
    console.error("Error uploading file:", error);
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat mengunggah file.";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
