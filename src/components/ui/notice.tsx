import { ReactNode } from 'react'

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-red-100 px-4 py-2 text-red-900">
      {children}
    </p>
  )
}
