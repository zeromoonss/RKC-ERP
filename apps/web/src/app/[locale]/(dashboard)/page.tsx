'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, GraduationCap, Receipt, CreditCard, AlertCircle, Wallet,
  TrendingUp, Loader2, Building2, Banknote, Clock, CheckCircle2,
  FileText, XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardData {
  students: { total: number; kindergarten: number; academy: number };
  billing: { totalBilled: number; totalPaid: number; collectionRate: number; byStatus?: Record<string, number> };
  receivables: { totalAmount: number; count: number };
  expenses: { totalAmount: number };
  recentBillings?: Array<{
    id: string; studentName: string; studentCode: string;
    totalAmount: number; paidAmount: number; status: string; createdAt: string;
  }>;
  classSummary?: Array<{
    id: string; name: string; classType: string;
    capacity: number; studentCount: number; teachers: string[];
  }>;
  recentPayments?: Array<{
    id: string; studentName: string; amount: number;
    paymentMethod: string; paymentDate: string;
  }>;
}

function formatVND(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M ₫`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K ₫`;
  }
  return `${value.toLocaleString()} ₫`;
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'PAID': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case 'PARTIALLY_PAID': return <CreditCard className="h-3.5 w-3.5 text-amber-500" />;
    case 'ISSUED': return <FileText className="h-3.5 w-3.5 text-blue-500" />;
    case 'DRAFT': return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    case 'CANCELLED': return <XCircle className="h-3.5 w-3.5 text-gray-400" />;
    default: return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  }
};
const statusStyle = (status: string) => {
  switch (status) {
    case 'PAID': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
    case 'PARTIALLY_PAID': return 'bg-amber-500/10 text-amber-600 border-amber-200';
    case 'ISSUED': return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'DRAFT': return 'bg-gray-500/10 text-gray-500 border-gray-200';
    default: return 'bg-gray-100 text-gray-500';
  }
};
const statusLabel: Record<string, string> = {
  DRAFT: '초안', ISSUED: '발행', PARTIALLY_PAID: '부분납부', PAID: '납부완료', OVERDUE: '연체', CANCELLED: '취소',
};
const methodIcon = (method: string) => {
  switch (method) {
    case 'CARD': return <CreditCard className="h-3.5 w-3.5 text-blue-500" />;
    case 'BANK_TRANSFER': return <Building2 className="h-3.5 w-3.5 text-violet-500" />;
    case 'CASH': return <Banknote className="h-3.5 w-3.5 text-emerald-500" />;
    default: return <Wallet className="h-3.5 w-3.5" />;
  }
};
const methodLabel: Record<string, string> = { CARD: '카드', BANK_TRANSFER: '이체', CASH: '현금' };

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const result = await api.get<DashboardData>('/dashboard');
        setData(result);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
        setData({
          students: { total: 0, kindergarten: 0, academy: 0 },
          billing: { totalBilled: 0, totalPaid: 0, collectionRate: 0 },
          receivables: { totalAmount: 0, count: 0 },
          expenses: { totalAmount: 0 },
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const kpiCards = [
    { key: 'totalStudents', value: data ? String(data.students.total) : '—', sub: `유치원 ${data?.students.kindergarten || 0} · 학원 ${data?.students.academy || 0}`, icon: Users, color: 'from-blue-600 to-indigo-500', bgColor: 'bg-blue-500/10' },
    { key: 'totalBilled', value: data ? formatVND(data.billing.totalBilled) : '—', sub: '이번 달 총 청구', icon: Receipt, color: 'from-amber-600 to-orange-400', bgColor: 'bg-amber-500/10' },
    { key: 'totalPaid', value: data ? formatVND(data.billing.totalPaid) : '—', sub: `수납률 ${data?.billing.collectionRate || 0}%`, icon: CreditCard, color: 'from-emerald-600 to-green-400', bgColor: 'bg-emerald-500/10' },
    { key: 'receivables', value: data ? formatVND(data.receivables.totalAmount) : '—', sub: `${data?.receivables.count || 0}건 미수금`, icon: AlertCircle, color: 'from-red-600 to-rose-400', bgColor: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Royal Kids College 운영 현황</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card
            key={card.key}
            className="relative overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(`cards.${card.key}`)}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isLoading ? 'animate-pulse text-muted-foreground' : ''}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.color}`} />
          </Card>
        ))}
      </div>

      {/* Middle Section: Class Summary + Collection Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Summary */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> 반 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.classSummary && data.classSummary.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.classSummary.map(cls => {
                  const ratio = cls.capacity > 0 ? (cls.studentCount / cls.capacity) * 100 : 0;
                  return (
                    <div key={cls.id} className="p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{cls.classType === 'KINDERGARTEN' ? '🎨' : '📚'}</span>
                          <span className="font-medium text-sm">{cls.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {cls.classType === 'KINDERGARTEN' ? '유치원' : '학원'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>{cls.studentCount} / {cls.capacity}명</span>
                        <span>{Math.round(ratio)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${ratio >= 90 ? 'bg-red-500' : ratio >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(ratio, 100)}%` }}
                        />
                      </div>
                      {cls.teachers.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          👩‍🏫 {cls.teachers.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">등록된 반이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collection Rate + Expenses */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> 재정 요약
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Collection Rate Visual */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-28 h-28">
                <svg className="transform -rotate-90 w-28 h-28">
                  <circle cx="56" cy="56" r="48" strokeWidth="8" className="fill-none stroke-muted" />
                  <circle cx="56" cy="56" r="48" strokeWidth="8"
                    className="fill-none stroke-emerald-500"
                    strokeDasharray={`${(data?.billing.collectionRate || 0) * 3.01} 301`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute text-2xl font-bold">{data?.billing.collectionRate || 0}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">이번 달 수납률</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2.5 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">총 청구</span>
                <span className="font-medium">{formatVND(data?.billing.totalBilled || 0)}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-emerald-50/50">
                <span className="text-emerald-600">수납 완료</span>
                <span className="font-medium text-emerald-600">{formatVND(data?.billing.totalPaid || 0)}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-red-50/50">
                <span className="text-red-600">미수금</span>
                <span className="font-medium text-red-600">{formatVND(data?.receivables.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-orange-50/50">
                <span className="text-orange-600">지출</span>
                <span className="font-medium text-orange-600">{formatVND(data?.expenses.totalAmount || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Billings */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-5 w-5" /> 최근 청구
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentBillings && data.recentBillings.length > 0 ? (
              <div className="space-y-2">
                {data.recentBillings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                      {statusIcon(b.status)}
                      <div>
                        <p className="text-sm font-medium">{b.studentName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{b.studentCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatVND(b.totalAmount)}</p>
                      <Badge variant="outline" className={`text-[10px] ${statusStyle(b.status)}`}>
                        {statusLabel[b.status] || b.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">청구 내역이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-5 w-5" /> 최근 수납
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentPayments && data.recentPayments.length > 0 ? (
              <div className="space-y-2">
                {data.recentPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      {methodIcon(p.paymentMethod)}
                      <div>
                        <p className="text-sm font-medium">{p.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {methodLabel[p.paymentMethod] || p.paymentMethod} · {new Date(p.paymentDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{formatVND(p.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">수납 내역이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error notice */}
      {error && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">⚠️ API 연결 확인 필요: {error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
