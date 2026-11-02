import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
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
    await fs.promises.writeFile(filePath, Buffer.from(bytes));

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
