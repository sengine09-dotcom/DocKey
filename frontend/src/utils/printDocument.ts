type PrintDocumentOptions = {
  bodyPadding?: string;
  extraCss?: string;
};

export const printDocumentContent = (title: string, html: string, options: PrintDocumentOptions = {}) => {
  const styleMarkup = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');
  const bodyPadding = options.bodyPadding ?? '12mm';
  const extraCss = options.extraCss ?? '';

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', title);
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 300);
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      window.alert('Unable to prepare print document.');
      return;
    }

    frameWindow.focus();
    window.setTimeout(() => {
      frameWindow.print();
      cleanup();
    }, 250);
  };

  document.body.appendChild(iframe);

  const frameDocument = iframe.contentDocument;
  if (!frameDocument) {
    cleanup();
    window.alert('Unable to prepare print document.');
    return;
  }

  frameDocument.open();
  frameDocument.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        ${styleMarkup}
        <style>
          html, body {
            background: #ffffff;
            margin: 0;
            padding: 0;
          }
          body {
            padding: ${bodyPadding};
          }
          ${extraCss}
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  frameDocument.close();
};