'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle2, UserPlus } from 'lucide-react';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Invalid invitation link');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/accept-invitation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, name, password }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to accept invitation');
      }

      const data = await res.json();

      // Auto login
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      setIsDone(true);

      setTimeout(() => {
        router.push(`/${data.user.locale || 'en'}`);
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-xl shadow-2xl max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Invalid Link</h2>
            <p className="text-slate-400 text-sm mb-6">
              This invitation link is invalid or has expired.
              <br />Please contact the administrator for a new invitation.
            </p>
            <Button
              onClick={() => router.push('/en/login')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-xl shadow-2xl max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Welcome to RKC! 🎉</h2>
            <p className="text-slate-400 text-sm">
              Your account has been created successfully.
              <br />Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            width={100}
            height={100}
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
            <CardTitle className="text-xl text-white text-center flex items-center justify-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-400" />
              Create Your Account
            </CardTitle>
            <CardDescription className="text-slate-400 text-center">
              You've been invited to join RKC ERP.
              <br />Set up your name and password to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">
                  Your Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Ms. Kim"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Enter password again"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium h-11 transition-all duration-200 shadow-lg shadow-indigo-500/25"
                disabled={isLoading || password.length < 6 || password !== confirmPassword || name.length < 2}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </div>
                ) : (
                  'Create Account & Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
              <a
                href="/en/login"
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                Already have an account? Sign In
              </a>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-600 text-xs mt-6">
          product by yaholab
        </p>
      </div>
    </div>
  );
}
