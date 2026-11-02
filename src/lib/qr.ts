import QRCode from "qrcode";

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 360,
      margin: 2,
      color: {
        dark: "#1e1b4b", // deep indigo
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });
  } catch (err) {
    console.error("Failed to generate QR code:", err);
    throw err;
  }
}
