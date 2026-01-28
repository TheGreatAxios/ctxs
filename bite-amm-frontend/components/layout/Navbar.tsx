'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/swap', label: 'Swap' },
  { href: '/pools', label: 'Pools' },
  { href: '/orders', label: 'Limit Orders' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b-3 border-black bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" className="font-black text-xl text-stone-900 uppercase tracking-wider">
            BITE AMM
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    px-4 py-2 rounded-lg font-semibold text-sm uppercase tracking-wide
                    transition-all duration-200
                    ${isActive
                      ? 'bg-accent text-accent-foreground border-2 border-black brutalist-shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
