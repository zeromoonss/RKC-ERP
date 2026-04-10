'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Receipt,
  FileText,
  CreditCard,
  AlertCircle,
  Wallet,
  Handshake,
  UserCog,
  Settings,
  LogOut,
  Globe,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface SidebarProps {
  locale: string;
}

// roles: which role codes can see this menu. undefined = all roles
const menuItems = [
  { key: 'dashboard', icon: LayoutDashboard, href: '' },
  { key: 'students', icon: Users, href: '/students', roles: ['OWNER', 'ADMIN', 'ACADEMIC_MANAGER', 'TEACHER', 'PARTNER'] },
  { key: 'classes', icon: GraduationCap, href: '/classes', roles: ['OWNER', 'ADMIN', 'ACADEMIC_MANAGER', 'TEACHER'] },
  { key: 'billing', icon: Receipt, href: '/billing', roles: ['OWNER', 'ADMIN', 'FINANCE'] },
  { key: 'invoices', icon: FileText, href: '/invoices', roles: ['OWNER', 'ADMIN', 'FINANCE'] },
  { key: 'payments', icon: CreditCard, href: '/payments', roles: ['OWNER', 'ADMIN', 'FINANCE'] },
  { key: 'receivables', icon: AlertCircle, href: '/receivables', roles: ['OWNER', 'ADMIN', 'FINANCE'] },
  { key: 'expenses', icon: Wallet, href: '/expenses', roles: ['OWNER', 'FINANCE', 'TEACHER'] },
  { key: 'royalty', icon: Handshake, href: '/royalty', roles: ['OWNER', 'FINANCE', 'PARTNER'] },
  { key: 'staff', icon: UserCog, href: '/staff', roles: ['OWNER'] },
  { key: 'settings', icon: Settings, href: '/settings', roles: ['OWNER'] },
];

export function AppSidebar({ locale }: SidebarProps) {
  const t = useTranslations('nav');
  const tFooter = useTranslations('footer');
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const roleCode = user?.role?.code || '';

  // Filter menu items by role
  const visibleMenuItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(roleCode)
  );

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-3 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <Image
            src="/logo.png"
            alt="RKC"
            width={32}
            height={32}
            className="shrink-0"
          />
          {!collapsed && (
            <span className="text-sm font-bold text-white tracking-tight truncate">
              Royal Kids College
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              collapsed && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const fullHref = `/${locale}${item.href}`;
          const isActive =
            item.href === ''
              ? pathname === `/${locale}` || pathname === `/${locale}/`
              : pathname.startsWith(fullHref);

          return (
            <NextLink
              key={item.key}
              href={fullHref}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-indigo-400')} />
              {!collapsed && <span>{t(item.key)}</span>}
            </NextLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        {!collapsed && (
          <p className="text-center text-slate-600 text-[10px] mb-2">
            {tFooter('productBy')}
          </p>
        )}
      </div>
    </aside>
  );
}

interface HeaderProps {
  locale: string;
}

export function AppHeader({ locale }: HeaderProps) {
  const t = useTranslations('auth');
  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = `/${locale}/login`;
  };

  const switchLocale = (newLocale: string) => {
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(`/${locale}`, `/${newLocale}`);
    window.location.href = newPath;
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors">
            <Globe className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => switchLocale('en')}>
              English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchLocale('ko')}>
              한국어
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md px-3 h-9 hover:bg-accent hover:text-accent-foreground transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-indigo-600 text-white text-xs">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden md:inline">
              {user?.name || 'User'}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              {user?.role?.name && (
                <p className="text-[10px] text-indigo-500 font-medium mt-0.5">{user.role.name}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
