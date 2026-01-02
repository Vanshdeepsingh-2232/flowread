// Note: We use window.pdfjsLib from the script tag in index.html to ensure 
// the worker version matches the library version (CDN).
// Importing pdfjs-dist directly can cause version mismatches with the CDN worker.

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

/**
 * Main function: Converts a PDF file into a single clean string.
 * @param {File} file - The file object from the upload input
 * @param {Function} onProgress - Optional callback for progress bar (0-100)
 */
export const extractTextFromPdf = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js library not loaded. Please refresh the page.");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";
    const totalPages = pdf.numPages;

    console.log(`📄 PDF Loaded: ${totalPages} pages.`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // 1. Get the page
      const page = await pdf.getPage(pageNum);

      // 2. Extract text items with their coordinates (transform matrices)
      const textContent = await page.getTextContent();

      // 3. Sort lines based on Y-coordinates (The "Line Sorting Logic")
      const rawLines = sortTextByLines(textContent.items);

      // 4. Remove Headers/Footers (The "Page 42 remover")
      const cleanedLines = removePageArtifacts(rawLines, pageNum);

      // 5. Join lines and add to full text
      fullText += cleanedLines.join(' ') + "\n\n";

      // Report progress
      if (onProgress) {
        onProgress(Math.round((pageNum / totalPages) * 100));
      }
    }

    // 6. Final Polish (De-hyphenation and spacing)
    return postProcessCleaner(fullText);

  } catch (error) {
    console.error("❌ PDF Parsing Error:", error);
    // Fallback? Or throw?
    // If pdfjsLib via import fails, maybe try window.pdfjsLib if present?
    // For now, let's stick to the throw.
    throw new Error("Failed to parse PDF. It might be encrypted or corrupted.");
  }
};

export const extractTextFromTxt = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(postProcessCleaner(e.target?.result as string));
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};


/**
 * 🧩 LOGIC 1: Line Sorting
 * PDFs don't know what a "line" is. They just have letters at X,Y coordinates.
 * We must group items that have roughly the same Y coordinate.
 */
function sortTextByLines(items: any[]): string[] {
  const lines: Record<number, { x: number; text: string }[]> = {};
  const Y_TOLERANCE = 5; // Pixels. If items are within 5px of Y, they are on same line.

  items.forEach((item: any) => {
    const text = item.str.trim();
    if (!text) return;

    // In PDF structure, transform[5] is the Y coordinate (vertical position)
    // Note: PDF coordinates usually start from Bottom-Left!
    // @ts-ignore
    const y = Math.round(item.transform[5]);

    // Check if we already have a line close to this Y
    const existingY = Object.keys(lines).find(key => Math.abs(Number(key) - y) < Y_TOLERANCE);

    if (existingY) {
      // @ts-ignore
      lines[existingY].push({ x: item.transform[4], text: text });
    } else {
      // @ts-ignore
      lines[y] = [{ x: item.transform[4], text: text }];
    }
  });

  // 1. Sort lines by Y descending (Top to Bottom of page)
  const sortedY = Object.keys(lines).sort((a, b) => Number(b) - Number(a));

  // 2. Within each line, sort by X ascending (Left to Right)
  return sortedY.map(y => {
    // @ts-ignore
    const lineItems = lines[y];
    lineItems.sort((a: any, b: any) => a.x - b.x);
    return lineItems.map((item: any) => item.text).join(' '); // Combine words
  });
}

/**
 * 🧹 LOGIC 2: Header & Footer Removal
 * We assume the first and last lines of a page are suspects.
 */
function removePageArtifacts(lines: string[], pageNum: number): string[] {
  if (lines.length < 3) return lines; // Too short to have headers

  const firstLine = lines[0].trim();
  // @ts-ignore
  const lastLine = lines[lines.length - 1].trim();

  // Regex to detect "Page 1", "1", "1 of 24", "Chapter 5"
  const isPageNumber = (str: string) => /^(page\s?)?\d+(\s?of\s?\d+)?$/i.test(str);
  // const isChapterLabel = (str: string) => /^(chapter|part)\s?\w+$/i.test(str) && str.length < 20;

  // Check Header (First line)
  // If it's just a number OR it contains the current page number
  if (isPageNumber(firstLine) || firstLine === String(pageNum)) {
    // console.log(`🗑️ Removed Header: "${firstLine}"`);
    lines.shift();
  }

  // Check Footer (Last line)
  if (lines.length > 0) {
    const last = lines[lines.length - 1].trim();
    if (isPageNumber(last) || last === String(pageNum)) {
      //   console.log(`🗑️ Removed Footer: "${last}"`);
      lines.pop();
    }
  }

  return lines;
}

/**
 * ✨ LOGIC 3: Post-Process Polishing
 * Fixes issues created by joining PDF lines.
 */
function postProcessCleaner(text: string): string {
  return text
    // 1. De-hyphenation: "Amaz- \n ing" -> "Amazing"
    // Looks for: Word char + hyphen + whitespace + newline + whitespace + Word char
    .replace(/(\w+)-\s*[\r\n]+\s*(\w+)/g, '$1$2')

    // 2. Remove multiple spaces
    .replace(/[ \t]+/g, ' ')

    // 3. Fix paragraph breaks
    // If there are 3+ newlines, treat as section break
    .replace(/\n{3,}/g, '\n\n')

    .trim();
}