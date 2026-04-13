'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Handshake, TrendingUp, DollarSign, Users, Calendar,
  ChevronDown, Download, Filter, Percent, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface MonthlyRevenue {
  month: string;
  tuitionRevenue: number;
  shuttleRevenue: number;
  textbookRevenue: number;
  snackRevenue: number;
  otherRevenue: number;
  studentCount: number;
  isEstimate: boolean;
}

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

const monthLabel = (month: string) => {
  const [y, m] = month.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
};

export default function RoyaltyPage() {
  const t = useTranslations('royalty');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [royaltyRate, setRoyaltyRate] = useState(8);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [isEstimate, setIsEstimate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleRateChange = (val: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(val)));
    setRoyaltyRate(clamped);
  };

  const loadRoyaltyData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.get<{ months: MonthlyRevenue[]; isEstimate: boolean }>('/dashboard/royalty', { year });
      setMonthlyData(result.months);
      setIsEstimate(result.isEstimate);
    } catch (err) {
      console.error('Failed to load royalty data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [year]);

  useEffect(() => { loadRoyaltyData(); }, [loadRoyaltyData]);

  const filteredData = monthlyData;

  const totalTuition = filteredData.reduce((s, d) => s + d.tuitionRevenue, 0);
  const totalRoyalty = totalTuition * royaltyRate / 100;
  const avgStudents = filteredData.length > 0
    ? Math.round(filteredData.reduce((s, d) => s + d.studentCount, 0) / filteredData.length) : 0;

  const detail = selectedMonth ? filteredData.find(d => d.month === selectedMonth) : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Handshake className="h-7 w-7 text-cyan-600" />
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => toast.success(t('exportSuccess'))}>
            <Download className="h-4 w-4 mr-2" />{t('export')}
          </Button>
        </div>
      </div>

      {/* Estimate notice */}
      {isEstimate && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">추정 데이터</p>
                <p className="text-xs text-amber-600 mt-0.5">아직 발행된 청구서가 없어 청구 템플릿 × 활성 원생 수 기반 추정치를 표시합니다. 청구서를 발행하면 실제 데이터로 자동 전환됩니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Royalty notice */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center flex-shrink-0">
              <Handshake className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('notice')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('noticeDetail')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Royalty Rate Input */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-cyan-50/50 to-white dark:from-cyan-950/10 dark:to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Percent className="h-5 w-5 text-cyan-600" />
              <p className="text-sm font-medium">{t('royaltyRate')}</p>
            </div>
            <div className="flex-1 max-w-md">
              <Slider
                value={[royaltyRate]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => handleRateChange(v)}
                className="cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">1%</span>
                <span className="text-[10px] text-muted-foreground">5%</span>
                <span className="text-[10px] text-muted-foreground">10%</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Input
                type="number"
                min={1}
                max={10}
                value={royaltyRate}
                onChange={(e) => handleRateChange(Number(e.target.value))}
                className="w-16 text-center font-bold text-lg h-10"
              />
              <span className="text-lg font-bold text-cyan-600">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{t('tuitionRevenue')}</p>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatVND(totalTuition)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('tuitionOnly')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-cyan-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{t('royaltyAmount')}</p>
              <Handshake className="h-4 w-4 text-cyan-500" />
            </div>
            <p className="text-2xl font-bold text-cyan-600">{formatVND(totalRoyalty)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('royaltyRate')}: {royaltyRate}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{t('avgStudents')}</p>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{avgStudents}{t('studentsUnit')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('kindergartenOnly')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{t('monthsCount')}</p>
              <Calendar className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-2xl font-bold">{filteredData.length}{t('monthUnit')}</p>
            <p className="text-xs text-muted-foreground mt-1">{year}{t('yearData')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('monthlyBreakdown')}</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('monthLabel')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('studentCount')}</th>
                <th className="text-right py-3 px-4 font-medium text-emerald-600">{t('tuitionCol')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('excludedCol')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('rateCol')}</th>
                <th className="text-right py-3 px-4 font-medium text-cyan-600">{t('royaltyCol')}</th>
                <th className="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((d) => {
                const excluded = d.shuttleRevenue + d.textbookRevenue + d.snackRevenue + (d.otherRevenue || 0);
                const royalty = d.tuitionRevenue * royaltyRate / 100;
                return (
                  <tr key={d.month}
                    className={`border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${selectedMonth === d.month ? 'bg-cyan-50/50 dark:bg-cyan-950/10' : ''}`}
                    onClick={() => setSelectedMonth(selectedMonth === d.month ? null : d.month)}>
                    <td className="py-3.5 px-4 font-medium">{monthLabel(d.month)}</td>
                    <td className="py-3.5 px-4 text-right">{d.studentCount}{t('studentsUnit')}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">{formatVND(d.tuitionRevenue)}</td>
                    <td className="py-3.5 px-4 text-right text-muted-foreground">{formatVND(excluded)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-200">{royaltyRate}%</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-cyan-600">{formatVND(royalty)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${selectedMonth === d.month ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">{t('noData')}</td></tr>
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="bg-muted/40 border-t-2">
                  <td className="py-3.5 px-4 font-bold">{t('total')}</td>
                  <td className="py-3.5 px-4 text-right font-medium">{avgStudents}{t('avgUnit')}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600">{formatVND(totalTuition)}</td>
                  <td className="py-3.5 px-4 text-right text-muted-foreground">
                    {formatVND(filteredData.reduce((s, d) => s + d.shuttleRevenue + d.textbookRevenue + d.snackRevenue + (d.otherRevenue || 0), 0))}
                  </td>
                  <td className="py-3.5 px-4 text-center">—</td>
                  <td className="py-3.5 px-4 text-right font-bold text-cyan-600">{formatVND(totalRoyalty)}</td>
                  <td className="py-3.5 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Detail Breakdown */}
      {detail && (
        <Card className="border-0 shadow-sm border-l-4 border-l-cyan-400 animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {monthLabel(detail.month)} — {t('detailBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50">
                <p className="text-xs text-emerald-600 font-medium mb-1">✅ {t('tuitionFee')}</p>
                <p className="text-lg font-bold text-emerald-700">{formatVND(detail.tuitionRevenue)}</p>
                <p className="text-xs text-emerald-500 mt-0.5">{t('royaltyTarget')}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">🚌 {t('shuttleFee')}</p>
                <p className="text-lg font-bold text-muted-foreground">{formatVND(detail.shuttleRevenue)}</p>
                <p className="text-xs text-red-400 mt-0.5">{t('excluded')}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">📚 {t('textbookFee')}</p>
                <p className="text-lg font-bold text-muted-foreground">{formatVND(detail.textbookRevenue)}</p>
                <p className="text-xs text-red-400 mt-0.5">{t('excluded')}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">🍪 {t('snackFee')}</p>
                <p className="text-lg font-bold text-muted-foreground">{formatVND(detail.snackRevenue)}</p>
                <p className="text-xs text-red-400 mt-0.5">{t('excluded')}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between p-4 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200/50">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('calculation')}</p>
                <p className="text-xs text-muted-foreground">
                  {formatVND(detail.tuitionRevenue)} × {royaltyRate}% = <span className="font-bold text-cyan-600">{formatVND(detail.tuitionRevenue * royaltyRate / 100)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t('monthlyRoyalty')}</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {formatVND(detail.tuitionRevenue * royaltyRate / 100)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
