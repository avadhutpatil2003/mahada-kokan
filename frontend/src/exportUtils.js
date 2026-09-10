import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Downloads an HTML element as a high-quality PNG image
 */
export async function downloadAsImage(element, filename = 'plot_details.png') {
  if (!element) return;
  
  const canvas = await html2canvas(element, {
    scale: 3, // High DPI / Retina quality
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const image = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.href = image;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads an HTML element or generated canvas as a formatted PDF
 */
export async function downloadAsPdf(element, filename = 'plot_details.pdf', plot = null) {
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  const imgProps = pdf.getImageProperties(imgData);
  const margin = 10; // 10mm margin
  const printWidth = pdfWidth - (margin * 2);
  const printHeight = (imgProps.height * printWidth) / imgProps.width;

  if (printHeight > pdfHeight - (margin * 2)) {
    // If it exceeds one page, scale to fit one page neatly or paginate
    const scale = (pdfHeight - (margin * 2)) / printHeight;
    const finalWidth = printWidth * scale;
    const finalHeight = printHeight * scale;
    const xOffset = margin + (printWidth - finalWidth) / 2;
    pdf.addImage(imgData, 'PNG', xOffset, margin, finalWidth, finalHeight);
  } else {
    pdf.addImage(imgData, 'PNG', margin, margin, printWidth, printHeight);
  }

  pdf.save(filename);
}
