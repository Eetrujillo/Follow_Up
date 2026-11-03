/**
 * The backend stores document and draft bodies as HTML (`contentHtml`), while the
 * library editor is a plain `<textarea>`. These two helpers keep the column
 * consistently HTML without letting stored markup run as markup.
 */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

/** Plain text to HTML: one paragraph per line, empty lines preserved as `<p><br></p>`. */
export function textToHtml(text: string): string {
  if (!text) {
    return '';
  }

  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? '<p><br></p>' : `<p>${escapeHtml(line)}</p>`))
    .join('');
}

/** HTML back to plain text for the textarea, without executing or trusting stored markup. */
export function htmlToText(html: string): string {
  if (!html) {
    return '';
  }

  return html
    .replace(/<p><br><\/p>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n$/, '');
}
