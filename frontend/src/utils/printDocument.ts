import { showAppAlert } from '../services/dialogService';

type PrintDocumentOptions = {
  bodyPadding?: string;
  extraCss?: string;
  title?: string;
  fileName?: string;
};

export const printDocumentContent = async (title: string = '', html: string, options: PrintDocumentOptions = {}) => {
  const resolvedTitle = options.title ?? title ?? '';
  const bodyPadding = options.bodyPadding ?? '12mm';
  const extraCss = options.extraCss ?? '';
  const renderHost = document.createElement('div');
  const safeBaseName = (options.fileName || resolvedTitle || 'document')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-') || 'document';

  renderHost.setAttribute('aria-hidden', 'true');
  renderHost.style.position = 'fixed';
  renderHost.style.left = '-200vw';
  renderHost.style.top = '0';
  renderHost.style.width = '210mm';
  renderHost.style.background = '#ffffff';
  renderHost.style.pointerEvents = 'none';
  renderHost.style.opacity = '0';
  renderHost.innerHTML = `
    <style>
      .pdf-print-root {
        background: #ffffff;
        padding: ${bodyPadding};
      }

      .pdf-print-root * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      ${extraCss}
    </style>
    <div class="pdf-print-root">${html}</div>
  `;

  document.body.appendChild(renderHost);

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;
    const pdfRoot = renderHost.querySelector('.pdf-print-root');

    if (!(pdfRoot instanceof HTMLElement)) {
      throw new Error('PDF root element is not available');
    }

    const worker = html2pdf()
      .set({
        margin: 0,
        filename: `${safeBaseName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      })
      .from(pdfRoot);

    const pdfBlob = await worker.outputPdf('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);
  } catch (_error) {
    void showAppAlert({ title: 'Print Error', message: 'Unable to generate PDF for printing.', tone: 'danger' });
  } finally {
    renderHost.remove();
  }
};