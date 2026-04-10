'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tFooter = useTranslations('footer');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error('Login failed');
      }

      const data = await res.json();
      
      // Store tokens
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success(t('welcomeBack'));
      router.push(`/${data.user.locale || 'en'}`);
    } catch {
      toast.error(t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Royal Kids College"
            width={120}
            height={120}
            className="mx-auto mb-3 drop-shadow-2xl"
            priority
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Royal Kids College
          </h1>
          <p className="text-xs text-slate-400 mt-1 tracking-widest uppercase">
            English Immersion Campus
          </p>
        </div>

        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white text-center">
              {t('loginTitle')}
            </CardTitle>
            <CardDescription className="text-slate-400 text-center">
              {t('loginSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  {t('email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@rkc.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  {t('password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium h-11 transition-all duration-200 shadow-lg shadow-indigo-500/25"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : (
                  t('loginButton')
                )}
              </Button>
            </form>

            {/* Language Switch */}
            <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-slate-700/50">
              <a
                href="/en/login"
                className="text-xs text-slate-500 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-slate-700/50"
              >
                English
              </a>
              <span className="text-slate-600">|</span>
              <a
                href="/ko/login"
                className="text-xs text-slate-500 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-slate-700/50"
              >
                한국어
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          {tFooter('productBy')}
        </p>
      </div>
    </div>
  );
}
