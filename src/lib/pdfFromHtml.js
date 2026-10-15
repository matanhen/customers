// Renders an HTML document to a PDF (A4, multi-page) and returns it as base64.
export async function htmlToPdfBase64(html, { width = 794 } = {}) {
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;right:-9999px;top:0;width:${width}px;padding:40px;background:#ffffff;`;
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297;

    while (heightLeft > 0) {
      position -= 297;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    const dataUri = pdf.output('datauristring');
    return dataUri.split(',')[1];
  } finally {
    document.body.removeChild(container);
  }
}