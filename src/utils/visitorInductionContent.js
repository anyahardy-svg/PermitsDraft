export const structuredLinesToMarkdown = (lines = []) => {
  if (!Array.isArray(lines)) return '';

  return lines
    .map((line) => {
      const text = line?.text || '';
      if (!text.trim()) return '';

      switch (line?.type) {
        case 'h1':
          return `# ${text}`;
        case 'h2':
          return `## ${text}`;
        case 'h3':
          return `### ${text}`;
        case 'bold':
          return `<b>${text}</b>`;
        case 'list':
          return `• ${text}`;
        default:
          return text;
      }
    })
    .join('\n');
};

export const normalizeVisitorInductionContent = (content = '') => {
  if (!content) return '';

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed[0]?.text !== undefined) {
      return structuredLinesToMarkdown(parsed);
    }
  } catch (error) {
    // Existing non-JSON content is already editable text/markdown/HTML.
  }

  return content;
};
