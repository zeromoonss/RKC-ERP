'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  CreditCard, Building2, Banknote, Search, Wallet, TrendingUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

interface PaymentData {
  id: string;
  billingId: string;
  student: { firstName: string; lastName: string; studentCode: string };
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference: string | null;
  collectedBy: string;
}

export default function PaymentsPage() {
  const t = useTranslations('payments');
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.get<{ data: any[] }>('/payments');
      setPayments(result.data.map((p: any) => ({
        id: p.id,
        billingId: p.billingId,
        student: p.billing?.student || { firstName: '', lastName: '', studentCode: '' },
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        reference: p.reference,
        collectedBy: p.collectedBy || 'System',
      })));
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const filtered = payments.filter((p) => {
    const matchMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter;
    const matchSearch = !search ||
      p.student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      p.student.lastName.toLowerCase().includes(search.toLowerCase()) ||
      p.student.studentCode.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference || '').toLowerCase().includes(search.toLowerCase());
    return matchMethod && matchSearch;
  });

  const totalByMethod = (m: string) => payments.filter(p => p.paymentMethod === m).reduce((s, p) => s + p.amount, 0);
  const totalAll = payments.reduce((s, p) => s + p.amount, 0);

  const methodIcon = (m: string) => {
    switch (m) {
      case 'CARD': return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'BANK_TRANSFER': return <Building2 className="h-4 w-4 text-violet-600" />;
      case 'CASH': return <Banknote className="h-4 w-4 text-emerald-600" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const methodStyle = (m: string) => {
    switch (m) {
      case 'CARD': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'BANK_TRANSFER': return 'bg-violet-500/10 text-violet-600 border-violet-200';
      case 'CASH': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      default: return '';
    }
  };

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
                <p className="text-xs text-muted-foreground font-medium">{t('totalCollected')}</p>
                <p className="text-lg font-bold mt-1">{formatVND(totalAll)}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        {(['CARD', 'BANK_TRANSFER', 'CASH'] as const).map((m) => (
          <Card key={m} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {methodIcon(m)}
                <p className="text-xs text-muted-foreground font-medium">{t(`method_${m}`)}</p>
              </div>
              <p className="text-lg font-bold">{formatVND(totalByMethod(m))}</p>
              <p className="text-xs text-muted-foreground">{payments.filter(p => p.paymentMethod === m).length} {t('transactions')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('allMethods')}</SelectItem>
            <SelectItem value="CARD">{t('method_CARD')}</SelectItem>
            <SelectItem value="BANK_TRANSFER">{t('method_BANK_TRANSFER')}</SelectItem>
            <SelectItem value="CASH">{t('method_CASH')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('dateLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('studentLabel')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('amountLabel')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('methodLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('referenceLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('collectedByLabel')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{p.student.lastName} {p.student.firstName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.student.studentCode}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatVND(p.amount)}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className={`${methodStyle(p.paymentMethod)} gap-1`}>
                      {methodIcon(p.paymentMethod)} {t(`method_${p.paymentMethod}`)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{p.reference || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground text-sm">{p.collectedBy}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t('noPayments')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
