import katex from 'katex'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Documentation text to HTML: $...$ is typeset as inline maths, [n] becomes a link to reference n.
// The input is our own static text (docs/topics.ts), never user input.
function html(text: string): string {
  return text.split(/\$([^$]+)\$/).map((part, i) =>
    i % 2 ? katex.renderToString(part, { throwOnError: false })
      : esc(part).replace(/\[(\d+)\]/g, '<a class="cite" data-ref="$1" href="#">[$1]</a>'),
  ).join('')
}

export function Rich({ text, as: Tag = 'span' }: { text: string; as?: 'span' | 'p' | 'td' | 'th' }) {
  return <Tag dangerouslySetInnerHTML={{ __html: html(text) }} />
}

export function Equation({ tex }: { tex: string }) {
  return <div className="docs-eq" dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { displayMode: true, throwOnError: false }) }} />
}
