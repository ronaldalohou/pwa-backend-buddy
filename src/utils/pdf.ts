import jsPDF from 'jspdf';
import { formatCurrency, CurrencyCode } from './currency';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceData {
  saleNumber: string;
  date: Date;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: CurrencyCode;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  customerName?: string;
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.storeName, pageWidth / 2, y, { align: 'center' });
  
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.storeAddress) {
    doc.text(data.storeAddress, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }
  if (data.storePhone) {
    doc.text(`Tel: ${data.storePhone}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  y += 10;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  // Invoice info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`FACTURE N° ${data.saleNumber}`, 15, y);
  
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date: ${data.date.toLocaleDateString('fr-FR')}`, 15, y);
  
  if (data.customerName) {
    y += 5;
    doc.text(`Client: ${data.customerName}`, 15, y);
  }

  y += 10;

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text('Produit', 17, y + 5);
  doc.text('Qté', pageWidth - 80, y + 5);
  doc.text('P.U.', pageWidth - 60, y + 5);
  doc.text('Total', pageWidth - 30, y + 5, { align: 'right' });
  
  y += 10;

  // Items
  doc.setFont('helvetica', 'normal');
  data.items.forEach((item) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    doc.text(item.name.substring(0, 40), 17, y);
    doc.text(item.quantity.toString(), pageWidth - 80, y);
    doc.text(formatCurrency(item.price, data.currency), pageWidth - 60, y);
    doc.text(formatCurrency(item.total, data.currency), pageWidth - 17, y, { align: 'right' });
    
    y += 7;
  });

  y += 5;
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Totals
  doc.text('Sous-total:', pageWidth - 80, y);
  doc.text(formatCurrency(data.subtotal, data.currency), pageWidth - 17, y, { align: 'right' });
  
  if (data.discount > 0) {
    y += 6;
    doc.text('Remise:', pageWidth - 80, y);
    doc.text(`-${formatCurrency(data.discount, data.currency)}`, pageWidth - 17, y, { align: 'right' });
  }
  
  if (data.tax > 0) {
    y += 6;
    doc.text('TVA:', pageWidth - 80, y);
    doc.text(formatCurrency(data.tax, data.currency), pageWidth - 17, y, { align: 'right' });
  }

  y += 8;
  doc.setLineWidth(1);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageWidth - 80, y);
  doc.text(formatCurrency(data.total, data.currency), pageWidth - 17, y, { align: 'right' });

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Merci pour votre confiance!', pageWidth / 2, 280, { align: 'center' });

  return doc;
}