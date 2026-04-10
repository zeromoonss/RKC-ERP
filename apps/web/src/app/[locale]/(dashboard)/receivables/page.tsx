'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle, CheckCircle2, Clock, Search, DollarSign,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

interface ReceivableData {
  id: string;
  student: { firstName: string; lastName: string; studentCode: string };
  billingMonth: string;
  amount: number;
  dueDate: string;
  isOverdue: boolean;
  resolvedAt: string | null;
}

export default function ReceivablesPage() {
  const t = useTranslations('receivables');
  const [receivables, setReceivables] = useState<ReceivableData[]>([]);
  const [search, setSearch] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadReceivables = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (!showResolved) params.resolved = 'false';
      const result = await api.get<{ data: any[] }>('/receivables', params);
      const now = new Date();
      setReceivables(result.data.map((r: any) => ({
        id: r.id,
        student: r.student || { firstName: '', lastName: '', studentCode: '' },
        billingMonth: r.billing?.billingMonth || '',
        amount: r.amount,
        dueDate: r.dueDate,
        isOverdue: r.dueDate && new Date(r.dueDate) < now && !r.resolvedAt,
        resolvedAt: r.resolvedAt,
      })));
    } catch (err) {
      console.error('Failed to load receivables:', err);
    } finally {
      setIsLoading(false);
    }
  }, [showResolved]);

  useEffect(() => { loadReceivables(); }, [loadReceivables]);

  const active = receivables.filter(r => !r.resolvedAt);
  const overdue = active.filter(r => r.isOverdue);
  const totalOutstanding = active.reduce((s, r) => s + r.amount, 0);
  const overdueTotal = overdue.reduce((s, r) => s + r.amount, 0);

  const filtered = receivables.filter((r) => {
    if (!search) return true;
    return r.student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      r.student.lastName.toLowerCase().includes(search.toLowerCase()) ||
      r.student.studentCode.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('totalOutstanding')}</p>
                <p className="text-lg font-bold mt-1 text-amber-600">{formatVND(totalOutstanding)}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('activeCount')}</p>
            <p className="text-2xl font-bold mt-1">{active.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-2 border-l-red-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-muted-foreground font-medium">{t('overdueCount')}</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{overdue.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('overdueTotal')}</p>
            <p className="text-lg font-bold mt-1 text-red-600">{formatVND(overdueTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="rounded" />
          {t('showResolved')}
        </label>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('studentLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('monthLabel')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('amountLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('dueDateLabel')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('statusLabel')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${r.isOverdue ? 'bg-red-500/5' : ''} ${r.resolvedAt ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="font-medium">{r.student.lastName} {r.student.firstName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.student.studentCode}</div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{new Date(r.billingMonth).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })}</td>
                  <td className="py-3 px-4 text-right font-semibold text-amber-600">{formatVND(r.amount)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{new Date(r.dueDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-center">
                    {r.resolvedAt ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{t('resolved')}</Badge>
                    ) : r.isOverdue ? (
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 gap-1"><AlertTriangle className="h-3.5 w-3.5" />{t('overdue')}</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1"><Clock className="h-3.5 w-3.5" />{t('pending')}</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">{t('noReceivables')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
