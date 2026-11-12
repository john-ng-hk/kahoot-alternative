import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold text-ink mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-bold text-ink mt-8 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-ink mt-6 mb-2">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="mb-3 leading-relaxed text-gray-700">{children}</p>
    ),
    ul: ({ children }) => <ul className="list-disc pl-6 mb-2">{children}</ul>,
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 mb-2">{children}</ol>
    ),
    li: ({ children }) => <li className="mb-2">{children}</li>,
    ...components,
  }
}
