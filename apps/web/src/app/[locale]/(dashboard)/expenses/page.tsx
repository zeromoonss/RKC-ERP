'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus, Search, FileText, CheckCircle2, XCircle, Clock,
  Send, DollarSign, MoreHorizontal, TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

interface ExpenseData {
  id: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  status: string;
  requestedBy: string;
  submittedAt: string | null;
  paidAt: string | null;
  note: string | null;
  createdAt: string;
}

const CATEGORIES = ['Office Supplies', 'Maintenance', 'Events', 'Teaching Materials', 'Utilities', 'Catering', 'Other'];

export default function ExpensesPage() {
  const t = useTranslations('expenses');
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ExpenseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', category: 'Office Supplies', description: '', amount: '' });

  const loadExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const result = await api.get<{ data: any[] }>('/expenses', params);
      setExpenses(result.data.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description || '',
        category: e.category,
        amount: e.amount,
        status: e.status,
        requestedBy: e.requestedBy || 'System',
        submittedAt: e.submittedAt,
        paidAt: e.paidAt,
        note: e.note,
        createdAt: e.createdAt,
      })));
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const filtered = expenses.filter((e) => {
    const matchSearch = !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.requestedBy.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalPaid = expenses.filter(e => e.status === 'PAID').reduce((s, e) => s + e.amount, 0);
  const totalPending = expenses.filter(e => ['SUBMITTED', 'APPROVED'].includes(e.status)).reduce((s, e) => s + e.amount, 0);

  const handleCreateExpense = async () => {
    if (!createForm.title || !createForm.amount) {
      toast.error(t('titleAndAmountRequired'));
      return;
    }
    try {
      setIsLoading(true);
      await api.post('/expenses', {
        title: createForm.title,
        category: createForm.category,
        description: createForm.description || undefined,
        amount: parseInt(createForm.amount) || 0,
      });
      toast.success(t('submitSuccess'));
      setShowCreate(false);
      setCreateForm({ title: '', category: 'Office Supplies', description: '', amount: '' });
      loadExpenses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (expense: ExpenseData) => {
    try {
      setIsLoading(true);
      await api.patch(`/expenses/${expense.id}/approve`, {});
      toast.success(t('approveSuccess'));
      setSelected(null);
      loadExpenses();
    } catch (err: any) {
      toast.error(err.message || 'Approve failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (expense: ExpenseData) => {
    try {
      setIsLoading(true);
      await api.patch(`/expenses/${expense.id}/reject`, {});
      toast.success(t('rejectSuccess'));
      setSelected(null);
      loadExpenses();
    } catch (err: any) {
      toast.error(err.message || 'Reject failed');
    } finally {
      setIsLoading(false);
    }
  };

  const statusStyle = (s: string) => {
    switch (s) {
      case 'DRAFT': return 'bg-gray-500/10 text-gray-500 border-gray-200';
      case 'SUBMITTED': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'REJECTED': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'PAID': return 'bg-violet-500/10 text-violet-600 border-violet-200';
      case 'CLOSED': return 'bg-gray-300/20 text-gray-400 border-gray-200';
      default: return '';
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'DRAFT': return <Clock className="h-3.5 w-3.5" />;
      case 'SUBMITTED': return <Send className="h-3.5 w-3.5" />;
      case 'APPROVED': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'REJECTED': return <XCircle className="h-3.5 w-3.5" />;
      case 'PAID': return <DollarSign className="h-3.5 w-3.5" />;
      case 'CLOSED': return <FileText className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: t('draft'), SUBMITTED: t('submitted'), APPROVED: t('approved'),
      REJECTED: t('rejected'), PAID: t('paid'), CLOSED: t('closed'),
    };
    return map[s] || s;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25"
          onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('createExpense')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('totalRequested')}</p>
                <p className="text-lg font-bold mt-1">{formatVND(totalExpenses)}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('totalPaid')}</p>
            <p className="text-lg font-bold mt-1 text-violet-600">{formatVND(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('pendingApproval')}</p>
            <p className="text-lg font-bold mt-1 text-amber-600">{formatVND(totalPending)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('totalCount')}</p>
            <p className="text-2xl font-bold mt-1">{expenses.length}</p>
          </CardContent>
        </Card>
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
            <SelectItem value="DRAFT">{t('draft')}</SelectItem>
            <SelectItem value="SUBMITTED">{t('submitted')}</SelectItem>
            <SelectItem value="APPROVED">{t('approved')}</SelectItem>
            <SelectItem value="REJECTED">{t('rejected')}</SelectItem>
            <SelectItem value="PAID">{t('paid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('titleLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('categoryLabel')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('amountLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('requestedByLabel')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('statusLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('dateLabel')}</th>
                <th className="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(e)}>
                  <td className="py-3 px-4">
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{e.description}</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="text-xs">{e.category}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">{formatVND(e.amount)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{e.requestedBy}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className={`${statusStyle(e.status)} gap-1`}>{statusIcon(e.status)} {statusLabel(e.status)}</Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-sm">{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right" onClick={(ev) => ev.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {e.status === 'DRAFT' && <DropdownMenuItem onClick={() => toast.success(t('submitSuccess'))}><Send className="h-4 w-4 mr-2" />{t('submit')}</DropdownMenuItem>}
                        {e.status === 'SUBMITTED' && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(e)}><CheckCircle2 className="h-4 w-4 mr-2" />{t('approve')}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReject(e)}><XCircle className="h-4 w-4 mr-2" />{t('reject')}</DropdownMenuItem>
                          </>
                        )}
                        {e.status === 'APPROVED' && <DropdownMenuItem onClick={() => toast.success(t('markPaidSuccess'))}><DollarSign className="h-4 w-4 mr-2" />{t('markPaid')}</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">{t('noExpenses')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('expenseDetail')}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selected.title}</h3>
                <Badge variant="outline" className={`${statusStyle(selected.status)} gap-1`}>{statusIcon(selected.status)} {statusLabel(selected.status)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">{t('categoryLabel')}</p><Badge variant="secondary">{selected.category}</Badge></div>
                <div><p className="text-muted-foreground text-xs">{t('amountLabel')}</p><p className="font-bold text-lg">{formatVND(selected.amount)}</p></div>
                <div><p className="text-muted-foreground text-xs">{t('requestedByLabel')}</p><p className="font-medium">{selected.requestedBy}</p></div>
                <div><p className="text-muted-foreground text-xs">{t('dateLabel')}</p><p>{new Date(selected.createdAt).toLocaleDateString()}</p></div>
              </div>
              {selected.note && (
                <><Separator /><div><p className="text-xs text-muted-foreground">{t('noteLabel')}</p><p className="text-sm">{selected.note}</p></div></>
              )}

              {/* Action Buttons */}
              {selected.status === 'SUBMITTED' && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => handleApprove(selected)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> {t('approve')}
                    </Button>
                    <Button variant="outline" className="flex-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleReject(selected)}>
                      <XCircle className="h-4 w-4 mr-2" /> {t('reject')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Create Expense Dialog ─── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> {t('createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('titleLabel')}</label>
              <Input value={createForm.title} onChange={(e) => setCreateForm({...createForm, title: e.target.value})} placeholder={t('titlePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('categoryLabel')}</label>
              <Select value={createForm.category} onValueChange={(v) => setCreateForm({...createForm, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('amountLabel')} (VND)</label>
              <Input type="number" value={createForm.amount} onChange={(e) => setCreateForm({...createForm, amount: e.target.value})} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('descriptionLabel')}</label>
              <Input value={createForm.description} onChange={(e) => setCreateForm({...createForm, description: e.target.value})} placeholder={t('descriptionPlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateExpense} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Send className="h-4 w-4 mr-2" /> {t('submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
