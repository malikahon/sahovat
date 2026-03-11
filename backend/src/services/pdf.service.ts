import PDFDocument from 'pdfkit';
import type { PdfService } from '../types/services.js';
import type { Donation, Campaign } from '../types/entities.js';

// ============================================================
// HELPERS
// ============================================================

/**
 * Formats a number as UZS currency with comma-separated thousands.
 * e.g. 1000000 -> "1,000,000 UZS"
 */
function formatUzs(amount: number): string {
  const formatted = amount
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${formatted} UZS`;
}

/**
 * Formats an ISO 8601 timestamp to "DD.MM.YYYY HH:mm".
 */
function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ============================================================
// PDF SERVICE IMPLEMENTATION
// ============================================================

/**
 * Generates PDF donation receipts using pdfkit.
 * All receipts are A4 with Helvetica font and 50pt margins.
 */
class DonationReceiptPdfService implements PdfService {
  /**
   * Generates a donation receipt PDF and returns it as a Buffer.
   *
   * @param donation  - The completed donation record
   * @param campaign  - The campaign that received the donation
   * @param donorName - Display name for the donor ("Anonymous" when applicable)
   * @returns A Buffer containing the complete PDF document
   */
  async generateDonationReceipt(
    donation: Donation,
    campaign: Campaign,
    donorName: string,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        font: 'Helvetica',
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log(
          `[Sahovat] PDF receipt generated for donation ${donation.id.slice(0, 8)}… (${result.length} bytes)`,
        );
        resolve(result);
      });

      doc.on('error', (err: Error) => {
        reject(err);
      });

      // --------------------------------------------------------
      // Header
      // --------------------------------------------------------
      doc
        .font('Helvetica-Bold')
        .fontSize(28)
        .text('SAHOVAT', { align: 'center' });

      doc
        .font('Helvetica')
        .fontSize(14)
        .text('Donation Receipt', { align: 'center' });

      doc.moveDown(1);

      // --------------------------------------------------------
      // Separator
      // --------------------------------------------------------
      const lineY = doc.y;
      doc
        .strokeColor('#333333')
        .lineWidth(1)
        .moveTo(50, lineY)
        .lineTo(545, lineY)
        .stroke();

      doc.moveDown(1);

      // --------------------------------------------------------
      // Receipt details
      // --------------------------------------------------------
      const receiptNo = donation.id.slice(0, 8);
      const receiptDate = formatDate(
        donation.completed_at ?? donation.created_at,
      );
      const transactionId = donation.payment_transaction_id ?? 'N/A';

      doc.font('Helvetica-Bold').fontSize(12).text('Receipt Details');
      doc.moveDown(0.3);
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(`Receipt No: ${receiptNo}`)
        .text(`Date: ${receiptDate}`)
        .text(`Transaction ID: ${transactionId}`);

      doc.moveDown(1);

      // --------------------------------------------------------
      // Donor
      // --------------------------------------------------------
      doc.font('Helvetica-Bold').fontSize(12).text('Donor');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).text(`Donor: ${donorName}`);

      doc.moveDown(1);

      // --------------------------------------------------------
      // Campaign
      // --------------------------------------------------------
      doc.font('Helvetica-Bold').fontSize(12).text('Campaign');
      doc.moveDown(0.3);
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(`Campaign: ${campaign.title}`)
        .text(`Category: ${capitalize(campaign.category)}`);

      doc.moveDown(1);

      // --------------------------------------------------------
      // Financial breakdown
      // --------------------------------------------------------
      doc.font('Helvetica-Bold').fontSize(12).text('Financial Summary');
      doc.moveDown(0.3);
      doc
        .font('Helvetica')
        .fontSize(10)
      const feePercent = donation.amount > 0
        ? ((donation.platform_fee / donation.amount) * 100).toFixed(1).replace(/\.0$/, '')
        : '0';

      doc
        .font('Helvetica')
        .fontSize(10)
        .text(`Donation Amount: ${formatUzs(donation.amount)}`)
        .text(`Platform Fee (${feePercent}%): ${formatUzs(donation.platform_fee)}`)
        .text(`Net Amount to Campaign: ${formatUzs(donation.net_amount)}`);

      doc.moveDown(1.5);

      // --------------------------------------------------------
      // Separator
      // --------------------------------------------------------
      const footerLineY = doc.y;
      doc
        .strokeColor('#333333')
        .lineWidth(1)
        .moveTo(50, footerLineY)
        .lineTo(545, footerLineY)
        .stroke();

      doc.moveDown(1);

      // --------------------------------------------------------
      // Footer
      // --------------------------------------------------------
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Thank you for your generosity!', { align: 'center' });

      doc.moveDown(0.5);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#666666')
        .text("Sahovat — Uzbekistan's Crowdfunding Platform", {
          align: 'center',
        });

      doc.moveDown(0.3);

      doc
        .fontSize(8)
        .text(`Generated on ${formatDate(new Date().toISOString())}`, {
          align: 'center',
        });

      // Finalize the document
      doc.end();
    });
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const pdfService: PdfService = new DonationReceiptPdfService();
