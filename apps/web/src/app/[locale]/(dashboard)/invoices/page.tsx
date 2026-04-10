'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText, Download, XCircle, CheckCircle2, Send, Search,
  MoreHorizontal, Eye, Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

interface InvoiceData {
  id: string;
  invoiceNo: string;
  billingId: string;
  student: { firstName: string; lastName: string; studentCode: string };
  billingMonth: string;
  totalAmount: number;
  status: string;
  issuedAt: string;
  downloadedAt: string | null;
  items: Array<{ itemName: string; amount: number }>;
}

export default function InvoicesPage() {
  const t = useTranslations('invoices');
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.get<{ data: any[] }>('/invoices');
      setInvoices(result.data.map((inv: any) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo || inv.invoiceNumber || `INV-${inv.id.slice(0, 8).toUpperCase()}`,
        billingId: inv.billingId,
        student: inv.billing?.student || { firstName: '', lastName: '', studentCode: '' },
        billingMonth: inv.billing?.billingMonth || '',
        totalAmount: inv.billing?.totalAmount || 0,
        status: inv.status || 'GENERATED',
        issuedAt: inv.issuedAt || inv.createdAt,
        downloadedAt: inv.downloadedAt,
        items: (inv.billing?.items || []).map((item: any) => ({
          itemName: item.itemName,
          amount: item.finalAmount,
        })),
      })));
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const filtered = invoices.filter((inv) => {
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchSearch = !search ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      inv.student.lastName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusStyle = (s: string) => {
    switch (s) {
      case 'GENERATED': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'SENT_INTERNAL': return 'bg-violet-500/10 text-violet-600 border-violet-200';
      case 'DOWNLOADED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'VOIDED': return 'bg-gray-300/20 text-gray-400 border-gray-200';
      default: return '';
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      GENERATED: t('generated'), SENT_INTERNAL: t('sentInternal'),
      DOWNLOADED: t('downloaded'), VOIDED: t('voided'),
    };
    return map[s] || s;
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'GENERATED': return <FileText className="h-3.5 w-3.5" />;
      case 'SENT_INTERNAL': return <Send className="h-3.5 w-3.5" />;
      case 'DOWNLOADED': return <Download className="h-3.5 w-3.5" />;
      case 'VOIDED': return <XCircle className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['GENERATED', 'SENT_INTERNAL', 'DOWNLOADED', 'VOIDED'] as const).map((s) => (
          <Card key={s} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{statusLabel(s)}</p>
              <p className="text-2xl font-bold mt-1">{invoices.filter(i => i.status === s).length}</p>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('allStatus')}</SelectItem>
            <SelectItem value="GENERATED">{t('generated')}</SelectItem>
            <SelectItem value="SENT_INTERNAL">{t('sentInternal')}</SelectItem>
            <SelectItem value="DOWNLOADED">{t('downloaded')}</SelectItem>
            <SelectItem value="VOIDED">{t('voided')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('invoiceNo')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('studentLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('monthLabel')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('amountLabel')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('statusLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('issuedAt')}</th>
                <th className="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${inv.status === 'VOIDED' ? 'opacity-50' : ''}`} onClick={() => setSelected(inv)}>
                  <td className="py-3 px-4 font-mono text-xs font-medium">{inv.invoiceNo}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{inv.student.lastName} {inv.student.firstName}</div>
                    <div className="text-xs text-muted-foreground">{inv.student.studentCode}</div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{new Date(inv.billingMonth).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatVND(inv.totalAmount)}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className={`${statusStyle(inv.status)} gap-1`}>{statusIcon(inv.status)} {statusLabel(inv.status)}</Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-sm">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(inv)}><Eye className="h-4 w-4 mr-2" />{t('viewDetail')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/invoices/${inv.id}/html`, '_blank'); toast.success(t('downloadStarted')); }}><Download className="h-4 w-4 mr-2" />{t('download')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/invoices/${inv.id}/html`, '_blank'); }}><Printer className="h-4 w-4 mr-2" />{t('print')}</DropdownMenuItem>
                        {inv.status !== 'VOIDED' && <DropdownMenuItem onClick={async () => { try { await api.patch(`/invoices/${inv.id}/void`, {}); toast.success('인보이스가 무효화되었습니다'); loadInvoices(); } catch { toast.error('Failed'); } }} className="text-red-500"><XCircle className="h-4 w-4 mr-2" />{t('voided')}</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">{t('noInvoices')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('invoiceDetail')}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-bold">{selected.invoiceNo}</p>
                  <p className="text-sm text-muted-foreground">{selected.student.lastName} {selected.student.firstName}</p>
                </div>
                <Badge variant="outline" className={`${statusStyle(selected.status)} gap-1`}>{statusIcon(selected.status)} {statusLabel(selected.status)}</Badge>
              </div>
              <Separator />
              <div className="space-y-2">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-sm">{item.itemName}</span>
                    <span className="text-sm font-medium">{formatVND(item.amount)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{t('totalLabel')}</span>
                <span>{formatVND(selected.totalAmount)}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/invoices/${selected.id}/html`, '_blank'); toast.success(t('downloadStarted')); }}><Download className="h-4 w-4 mr-1" />{t('download')}</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/invoices/${selected.id}/html`, '_blank'); }}><Printer className="h-4 w-4 mr-1" />{t('print')}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
