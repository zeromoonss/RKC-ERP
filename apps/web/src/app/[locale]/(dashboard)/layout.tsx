import { AppSidebar, AppHeader } from '@/components/layout/app-shell';
import { AuthProviderWrapper } from '@/components/providers/auth-wrapper';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <AuthProviderWrapper>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <AppSidebar locale={locale} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader locale={locale} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthProviderWrapper>
  );
}
