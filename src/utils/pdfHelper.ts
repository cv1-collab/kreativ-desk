export const preparePdfExport = async () => {
  // No longer needed for native print
};

export const fixPdfColors = (clonedDoc: Document) => {
  // No longer needed for native print
};

/**
 * Opens a new window with the specified element and triggers the browser's native print dialog.
 * This is the most robust way to generate PDFs as it supports all modern CSS (including oklab),
 * keeps text selectable (vector), and handles page breaks perfectly.
 */
export const printElementToPdf = (element: HTMLElement, title: string = 'Document') => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Bitte erlaube Popups für diese Seite, um das PDF zu generieren.');
    return;
  }

  // Gather all styles from the current document
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
  let stylesHtml = '';
  styles.forEach(s => {
    stylesHtml += s.outerHTML;
  });

  // Write the content to the new window
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        ${stylesHtml}
        <style>
          /* Reset body for printing */
          body { 
            margin: 0; 
            padding: 20px; 
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Force all elements to print backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide UI elements that shouldn't be printed */
          .no-print { display: none !important; }
          
          @media print {
            @page { margin: 1.5cm; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body class="bg-white text-black">
        ${element.outerHTML}
        <script>
          // Wait a moment for external stylesheets to load and render
          setTimeout(() => {
            window.focus();
            window.print();
            // Close the window after printing/saving
            setTimeout(() => {
              window.close();
            }, 100);
          }, 750);
        </script>
      </body>
    </html>
  `);
  
  printWindow.document.close();
};
