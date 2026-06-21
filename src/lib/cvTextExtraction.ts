export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  GlobalWorkerOptions.workerSrc = workerUrl

  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n')
}

export async function extractTextFromDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export async function extractCvText(fileType: 'pdf' | 'docx', arrayBuffer: ArrayBuffer): Promise<string> {
  return fileType === 'pdf' ? extractTextFromPDF(arrayBuffer) : extractTextFromDOCX(arrayBuffer)
}
