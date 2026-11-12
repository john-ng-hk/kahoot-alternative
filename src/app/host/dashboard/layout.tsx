import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../../globals.css'
import Link from 'next/link'
import SignInGate from './sign-in-gate'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SupaQuiz',
  description: 'Fun quiz game powered by Supabase',
}

const menuItems: {
  label: string
  href: string
  icon: React.ReactNode
}[] = [
  {
    label: 'Home',
    href: '/host/dashboard',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    ),
  },
  {
    label: 'My quizzes',
    href: '/host/dashboard/quizzes',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
        />
      </svg>
    ),
  },
  {
    label: 'How to Play',
    href: '/host/dashboard/how-to',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
        />
      </svg>
    ),
  },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <header className="h-16 px-4 flex justify-between border-b border-gray-200 items-center text-ink">
        <h1 className="text-xl font-bold">SupaQuiz</h1>
      </header>
      <div className="flex flex-col md:flex-row">
        <nav className="border-b border-b-gray-200 text-ink md:border-b-0 md:border-r md:border-r-gray-200">
          <ul className="flex flex-wrap md:block">
            {menuItems.map((item) => (
              <li key={item.href} className="">
                <Link
                  className="flex min-h-[44px] items-center px-3 hover:bg-gray-100 md:w-52 md:px-0"
                  href={item.href}
                >
                  <div className="px-2">{item.icon}</div>
                  <div className="flex-grow">{item.label}</div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-grow p-2">
          <SignInGate>{children}</SignInGate>
        </main>
      </div>
    </>
  )
}
