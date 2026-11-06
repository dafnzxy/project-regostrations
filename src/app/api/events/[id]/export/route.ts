import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
import {
  colIndexToLetter,
  ExcelCell,
  ExcelColumn,
  ExcelSheet,
  generateXlsxBuffer,
} from "@/lib/excel";
import { FormField } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function formatDateTimeId(date?: Date | string | null): string {
  if (!date) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(date));
  } catch {
    return "-";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "CHECKED_IN":
      return "HADIR (CHECKED-IN)";
    case "APPROVED":
      return "DISETUJUI (APPROVED)";
    case "PENDING":
      return "MENUNGGU (PENDING)";
    case "REJECTED":
      return "DITOLAK (REJECTED)";
    default:
      return status;
  }
}

function getStatusStyle(status: string): number {
  switch (status) {
    case "CHECKED_IN":
    case "APPROVED":
      return 6; // Emerald badge
    case "PENDING":
      return 7; // Amber badge
    case "REJECTED":
      return 8; // Rose badge
    default:
      return 4;
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda harus login sebagai Admin." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const statusFilter = request.nextUrl.searchParams.get("status") || "ALL";

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event tidak ditemukan." },
        { status: 404 }
      );
    }

    const regWhere: any = { eventId: event.id };
    if (statusFilter && statusFilter !== "ALL") {
      regWhere.status = statusFilter;
    }

    const registrations = await prisma.registration.findMany({
      where: regWhere,
      orderBy: { createdAt: "desc" },
      include: {
        emailLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const prizeDraws = await prisma.prizeDraw.findMany({
      where: { eventId: event.id },
      orderBy: { drawnAt: "desc" },
      include: {
        prize: true,
        registration: true,
      },
    });

    let formSchema: FormField[] = [];
    try {
      formSchema = JSON.parse(event.formSchema || "[]");
    } catch {
      formSchema = [];
    }

    const customFields = formSchema.filter(
      (f) => f.id !== "name" && f.id !== "email" && f.id !== "phone"
    );

    const appOrigin =
      process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    // =========================================================================
    // SHEET 1: DATA PESERTA
    // =========================================================================
    const columns: ExcelColumn[] = [
      { header: "No", width: 6 },
      { header: "Nama Lengkap", width: 28 },
      { header: "Alamat Email", width: 32 },
      { header: "No. WhatsApp / HP", width: 20 },
      { header: "Status Peserta", width: 24 },
      ...customFields.map((f) => ({
        header: f.label,
        width: Math.max(22, Math.min(40, f.label.length + 8)),
      })),
      { header: "Token QR Code", width: 20 },
      { header: "Link E-Tiket Digital", width: 44 },
      { header: "Status Email Tiket", width: 20 },
      { header: "Waktu Pendaftaran", width: 24 },
      { header: "Disetujui Oleh", width: 20 },
      { header: "Waktu Disetujui (ACC)", width: 24 },
      { header: "Waktu Check-In Hari-H", width: 24 },
    ];

    const lastColLetter = colIndexToLetter(columns.length - 1);

    // Row 1: Title Banner
    const titleRow: (ExcelCell | null)[] = columns.map((_, idx) => ({
      value:
        idx === 0
          ? `LAPORAN DATA PESERTA & KEHADIRAN EVENT: ${event.title.toUpperCase()}`
          : "",
      style: 1,
    }));

    // Row 2: Subtitle Info
    const subtitleRow: (ExcelCell | null)[] = columns.map((_, idx) => ({
      value:
        idx === 0
          ? `Lokasi: ${event.location || "-"}   |   Jadwal Acara: ${formatDateTimeId(
              event.startsAt
            )}   |   Total Data: ${registrations.length} Peserta   |   Diekspor: ${formatDateTimeId(
              new Date()
            )}`
          : "",
      style: 2,
    }));

    // Row 3: Blank separator
    const blankRow: (ExcelCell | null)[] = [];

    // Row 4: Table Headers
    const headerRow: (ExcelCell | null)[] = columns.map((col) => ({
      value: col.header,
      style: 3,
    }));

    const dataRows: (ExcelCell | null)[][] = registrations.map((reg, index) => {
      let answers: Record<string, any> = {};
      try {
        answers = JSON.parse(reg.answers || "{}");
      } catch {
        answers = {};
      }

      const rowStyle = index % 2 === 1 ? 5 : 4;
      const emailLog = reg.emailLogs?.[0];
      const emailStatusText = emailLog
        ? emailLog.status === "SENT"
          ? `TERKIRIM (${formatDateTimeId(emailLog.sentAt)})`
          : emailLog.status
        : "BELUM DIKIRIM";

      const customCells: ExcelCell[] = customFields.map((f) => {
        const rawVal = answers[f.id];
        const formatted = Array.isArray(rawVal)
          ? rawVal.join(", ")
          : rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ""
          ? String(rawVal)
          : "-";
        return { value: formatted, style: rowStyle };
      });

      return [
        { value: index + 1, style: 9 },
        { value: reg.name, style: rowStyle },
        { value: reg.email, style: rowStyle },
        { value: reg.phone || answers.phone || "-", style: rowStyle },
        { value: getStatusLabel(reg.status), style: getStatusStyle(reg.status) },
        ...customCells,
        { value: reg.qrToken, style: rowStyle },
        { value: `${appOrigin}/ticket/${reg.qrToken}`, style: rowStyle },
        { value: emailStatusText, style: rowStyle },
        { value: formatDateTimeId(reg.createdAt), style: rowStyle },
        { value: reg.approvedBy || "-", style: rowStyle },
        { value: formatDateTimeId(reg.approvedAt), style: rowStyle },
        { value: formatDateTimeId(reg.checkedInAt), style: rowStyle },
      ];
    });

    const sheet1: ExcelSheet = {
      name: "Data Peserta",
      columns,
      rows: [titleRow, subtitleRow, blankRow, headerRow, ...dataRows],
      merges: [`A1:${lastColLetter}1`, `A2:${lastColLetter}2`],
    };

    // =========================================================================
    // SHEET 2: REKAP & DOORPRIZE
    // =========================================================================
    const allCount = await prisma.registration.count({
      where: { eventId: event.id },
    });
    const approvedCount = await prisma.registration.count({
      where: { eventId: event.id, status: "APPROVED" },
    });
    const checkedInCount = await prisma.registration.count({
      where: { eventId: event.id, status: "CHECKED_IN" },
    });
    const pendingCount = await prisma.registration.count({
      where: { eventId: event.id, status: "PENDING" },
    });
    const rejectedCount = await prisma.registration.count({
      where: { eventId: event.id, status: "REJECTED" },
    });

    const summaryCols: ExcelColumn[] = [
      { header: "Kategori / No", width: 28 },
      { header: "Nilai / Nama Pemenang", width: 34 },
      { header: "Email Peserta", width: 32 },
      { header: "No. WhatsApp", width: 22 },
      { header: "Waktu / Status", width: 26 },
    ];

    const summaryRows: (ExcelCell | null)[][] = [
      [
        { value: `RINGKASAN STATISTIK & DOORPRIZE - ${event.title.toUpperCase()}`, style: 1 },
        { value: "", style: 1 },
        { value: "", style: 1 },
        { value: "", style: 1 },
        { value: "", style: 1 },
      ],
      [],
      [
        { value: "Metrik Statistik Event", style: 3 },
        { value: "Jumlah / Keterangan", style: 3 },
      ],
      [
        { value: "Nama Event", style: 10 },
        { value: event.title, style: 4 },
      ],
      [
        { value: "Lokasi Acara", style: 10 },
        { value: event.location || "-", style: 4 },
      ],
      [
        { value: "Waktu Pelaksanaan", style: 10 },
        { value: formatDateTimeId(event.startsAt), style: 4 },
      ],
      [
        { value: "Kapasitas Kuota", style: 10 },
        { value: `${event.quota} Kursi`, style: 4 },
      ],
      [
        { value: "Total Pendaftar Masuk", style: 10 },
        { value: allCount, style: 4 },
      ],
      [
        { value: "Peserta Hadir (Checked-In)", style: 10 },
        { value: checkedInCount, style: 6 },
      ],
      [
        { value: "Peserta Disetujui (Approved - Belum Check-In)", style: 10 },
        { value: approvedCount, style: 6 },
      ],
      [
        { value: "Peserta Menunggu Konfirmasi (Pending)", style: 10 },
        { value: pendingCount, style: 7 },
      ],
      [
        { value: "Peserta Ditolak (Rejected)", style: 10 },
        { value: rejectedCount, style: 8 },
      ],
      [],
      [
        { value: "Hadiah Doorprize", style: 3 },
        { value: "Nama Pemenang", style: 3 },
        { value: "Email Pemenang", style: 3 },
        { value: "No. WhatsApp", style: 3 },
        { value: "Status & Waktu Undian", style: 3 },
      ],
      ...(prizeDraws.length === 0
        ? [
            [
              { value: "Belum ada riwayat pemenang doorprize", style: 4 },
              { value: "-", style: 4 },
              { value: "-", style: 4 },
              { value: "-", style: 4 },
              { value: "-", style: 4 },
            ],
          ]
        : prizeDraws.map((d) => [
            { value: d.prize.name, style: 4 },
            { value: d.registration.name, style: 4 },
            { value: d.registration.email, style: 4 },
            { value: d.registration.phone || "-", style: 4 },
            {
              value: `${d.status === "VALID" ? "SAH" : "DIUNDI ULANG"} (${formatDateTimeId(
                d.drawnAt
              )})`,
              style: d.status === "VALID" ? 6 : 8,
            },
          ])),
    ];

    const sheet2: ExcelSheet = {
      name: "Rekap & Doorprize",
      columns: summaryCols,
      rows: summaryRows,
      merges: ["A1:E1"],
    };

    const xlsxBuffer = generateXlsxBuffer([sheet1, sheet2]);
    const safeFilename = `Data-Peserta-${event.slug}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    return new Response(new Uint8Array(xlsxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error exporting Excel:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal mengekspor data Excel." },
      { status: 500 }
    );
  }
}

