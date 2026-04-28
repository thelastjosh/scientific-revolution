import mammoth from "mammoth";

function summarizeText(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "No readable text could be extracted from this CV.";
  return compact.slice(0, 3000);
}

export async function extractCvText(input: {
  filename: string;
  mimeType: string;
  contentBase64: string;
}) {
  const fileNameLower = input.filename.toLowerCase();
  const mimeLower = input.mimeType.toLowerCase();
  const buffer = Buffer.from(input.contentBase64, "base64");
  if (!buffer.length) throw new Error("Empty upload");

  let text = "";
  if (
    mimeLower.includes("pdf") ||
    fileNameLower.endsWith(".pdf")
  ) {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      text = parsed.text ?? "";
    } catch (error) {
      console.warn("[onboarding-cv] PDF parsing unavailable in runtime", error);
      throw new Error(
        "PDF parsing is unavailable in this runtime. Please upload DOCX or TXT, or enable PDF runtime dependencies."
      );
    }
  } else if (
    mimeLower.includes("word") ||
    mimeLower.includes("docx") ||
    fileNameLower.endsWith(".docx")
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    text = parsed.value ?? "";
  } else if (
    mimeLower.includes("text/plain") ||
    fileNameLower.endsWith(".txt") ||
    fileNameLower.endsWith(".md")
  ) {
    text = buffer.toString("utf8");
  } else {
    throw new Error("Unsupported file type. Use PDF, DOCX, TXT, or MD.");
  }

  const summary = summarizeText(text);
  const manifestAppendBlock = [
    "## CV Import",
    `Source file: ${input.filename}`,
    "",
    summary,
  ].join("\n");

  return {
    extractedText: text,
    summary,
    manifestAppendBlock,
  };
}

