'use client';

import { Mail, Shield, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl opacity-75 blur-sm group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-2.5 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                DropEmail
              </h1>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono -mt-1">
                dropemail.net
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-3">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md text-sm ${
                pathname === '/'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              Headers
            </Link>
            <Link
              href="/domain"
              className={`px-3 py-1.5 rounded-md text-sm ${
                pathname?.startsWith('/domain')
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              Domain
            </Link>
          </nav>

          {/* Mobile Menu (simple for now) */}
          <div className="md:hidden">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

