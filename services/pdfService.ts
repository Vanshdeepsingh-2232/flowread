declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const cleanText = (text: string): string => {
  if (!text) return "";

  // 1. Normalize horizontal whitespace (tabs, non-breaking spaces -> single space)
  // We explicitly match space, tab, nbsp to avoid matching newlines (\n)
  let cleaned = text.replace(/[ \t\u00A0]+/g, ' ');

  // 2. Normalize Newlines (remove excessive blank lines, but keep paragraph breaks)
  // Collapse 3+ newlines into 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 3. Fix broken hyphenation (e.g. "amaz-\n ing" -> "amazing")
  cleaned = cleaned.replace(/-\s*\n\s*/g, '');

  // 4. Fix "T H E" spacing artifacts (Single Uppercase Letters separated by spaces)
  // Note: Only match if on the same line (no newlines)
  let prev;
  do {
    prev = cleaned.length;
    cleaned = cleaned.replace(/\b([A-Z]) ([A-Z])\b/g, '$1$2');
  } while (cleaned.length < prev);

  return cleaned.trim();
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js library not loaded");
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = "";
  const maxPages = pdf.numPages;

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    if (items.length === 0) continue;

    let pageText = "";
    let lastY = -1;
    let lastX = -1;
    let lastWidth = 0;

    // Process items based on geometry to correctly detecting spaces
    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const tx = item.transform; // [scaleX, skewY, skewX, scaleY, x, y]
      const x = tx[4];
      const y = tx[5];
      const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]); // approximate font size scale

      // Initialize first item
      if (j === 0) {
        pageText += item.str;
        lastX = x;
        lastY = y;
        lastWidth = item.width;
        continue;
      }

      // Vertical Distance (Line Break)
      const dy = Math.abs(y - lastY);

      // Horizontal Gap
      // Note: width in PDF items can be weird. item.width is usually unscaled? 
      // Actually item.width is usually in generic units. checking documentation... 
      // In modern PDF.js, item.width is scaled? No.
      // Better heuristic: gap = x - (lastX + lastWidth).
      const gap = x - (lastX + lastWidth);

      // Decisions:

      // 1. New Line detection
      if (dy > fontSize * 0.5) {
        // Significant vertical jump -> New Line
        // Check if paragraph break (larger jump)? 
        // For now, simple newline
        pageText += "\n" + item.str;
      }
      // 2. Same Line detection
      else {
        // Threshold for space: typically 20-30% of font size is a space
        // Kerning/Split words are usually < 0 or very small (approx 0)
        // Let's settle on > 15-20% of fontSize as a space.
        // Also handle negative gaps (overlap)

        // Sometimes lastWidth is not reliable.
        // A simpler robust check: if gap > 2 (pixels/units), it's a space. 
        // Most PDF coords are 72dpi. 2pt is small.
        // Let's use fontSize relative.

        if (gap > (fontSize * 0.2)) {
          pageText += " " + item.str;
        } else {
          // No space (merge)
          pageText += item.str;
        }
      }

      lastX = x;
      lastY = y;
      lastWidth = item.width;
    }

    fullText += pageText + "\n\n";
  }

  return cleanText(fullText);
};

export const extractTextFromTxt = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(cleanText(e.target?.result as string));
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};