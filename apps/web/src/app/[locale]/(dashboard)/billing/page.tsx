'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus, Search, FileText, CreditCard, XCircle, CheckCircle2,
  Clock, AlertTriangle, DollarSign, TrendingUp, MoreHorizontal, Eye,
  Banknote, Building2, Wallet, CalendarRange, Package, Trash2, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

// ─── Fee Item Categories ───
type FeeCategory = 'TUITION' | 'SHUTTLE' | 'LUNCH' | 'SNACK' | 'TEXTBOOK' | 'ACTIVITY';
interface FeeItem {
  category: FeeCategory;
  label: string;
  defaultAmount: number;
  emoji: string;
}

const FEE_ITEMS: FeeItem[] = [
  { category: 'TUITION', label: 'cat_TUITION', defaultAmount: 4_000_000, emoji: '🎓' },
  { category: 'SHUTTLE', label: 'cat_SHUTTLE', defaultAmount: 600_000, emoji: '🚌' },
  { category: 'LUNCH', label: 'cat_LUNCH', defaultAmount: 500_000, emoji: '🍱' },
  { category: 'SNACK', label: 'cat_SNACK', defaultAmount: 200_000, emoji: '🍪' },
  { category: 'TEXTBOOK', label: 'cat_TEXTBOOK', defaultAmount: 300_000, emoji: '📚' },
  { category: 'ACTIVITY', label: 'cat_ACTIVITY', defaultAmount: 500_000, emoji: '⚽' },
];

// ─── Billing Data ───
interface BillingItem {
  category: FeeCategory;
  itemName: string;
  months: number;          // Payment months (1~12)
  monthlyAmount: number;
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
}

interface BillingData {
  id: string;
  billingMonth: string;
  student: { id: string; firstName: string; lastName: string; studentCode: string; programType: string };
  items: BillingItem[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string | null;
  issuedAt: string | null;
  note: string | null;
  payments: Array<{ id: string; amount: number; paymentMethod: string; paymentDate: string; reference?: string | null; items: string[] }>;
}

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

// ─── Payment Methods ───
const PAYMENT_METHODS = [
  { value: 'CARD', icon: CreditCard, color: 'text-blue-600 bg-blue-500/10 border-blue-200' },
  { value: 'BANK_TRANSFER', icon: Building2, color: 'text-violet-600 bg-violet-500/10 border-violet-200' },
  { value: 'CASH', icon: Banknote, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-200' },
] as const;

interface StudentListItem {
  id: string;
  name: string;
  code: string;
  programType: string;
}

export default function BillingPage() {
  const t = useTranslations('billing');
  const { user } = useAuth();
  const isOwner = user?.role?.code === 'OWNER';
  const isAdmin = user?.role?.code === 'ADMIN';
  const [billings, setBillings] = useState<BillingData[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedBilling, setSelectedBilling] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteBillingTarget, setDeleteBillingTarget] = useState<BillingData | null>(null);

  // ─── Create Billing Dialog ───
  const [showCreate, setShowCreate] = useState(false);
  const [createStudent, setCreateStudent] = useState('');
  const [createFees, setCreateFees] = useState<Record<FeeCategory, { checked: boolean; months: number; customAmount: number }>>(
    Object.fromEntries(FEE_ITEMS.map(fi => [fi.category, { checked: fi.category === 'TUITION', months: 1, customAmount: fi.defaultAmount }])) as any
  );

  // ─── Payment Dialog ───
  const [paymentTarget, setPaymentTarget] = useState<BillingData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentSelectedItems, setPaymentSelectedItems] = useState<FeeCategory[]>([]);

  // ─── API Data Loading ───
  const loadBillings = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const result = await api.get<{ data: any[] }>('/billing', params);
      const mapped: BillingData[] = result.data.map((b: any) => ({
        id: b.id,
        billingMonth: b.billingMonth,
        student: b.student,
        items: (b.items || []).map((item: any) => ({
          category: (item.itemName || '').includes('Tuition') ? 'TUITION' : (item.itemName || '').includes('Shuttle') ? 'SHUTTLE' : (item.itemName || '').includes('Lunch') ? 'LUNCH' : (item.itemName || '').includes('Snack') ? 'SNACK' : (item.itemName || '').includes('Activity') ? 'ACTIVITY' : 'TEXTBOOK',
          itemName: item.itemName,
          months: 1,
          monthlyAmount: item.originalAmount,
          totalAmount: item.finalAmount,
          paidAmount: 0,
          isPaid: false,
        })),
        subtotal: b.subtotal,
        discountTotal: b.discountTotal,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        status: b.status,
        dueDate: b.dueDate,
        issuedAt: b.issuedAt,
        note: b.note,
        payments: (b.payments || []).map((p: any) => ({ id: p.id, amount: p.amount, paymentMethod: p.paymentMethod, paymentDate: p.paymentDate, reference: p.reference, items: [] })),
      }));
      setBillings(mapped);
    } catch (err) {
      console.error('Failed to load billings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const loadStudents = useCallback(async () => {
    try {
      const result = await api.get<{ data: any[] }>('/students', { limit: 100 });
      setStudents(result.data.map((s: any) => ({
        id: s.id,
        name: `${s.lastName || ''} ${s.firstName || ''}`.trim(),
        code: s.studentCode,
        programType: s.programType,
      })));
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }, []);

  useEffect(() => { loadBillings(); }, [loadBillings]);
  useEffect(() => { loadStudents(); }, [loadStudents]);

  // ─── Stats ───
  const totalBilled = billings.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = billings.reduce((s, b) => s + b.paidAmount, 0);
  const outstanding = totalBilled - totalPaid;
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
  const overdueCount = billings.filter(b => b.status === 'OVERDUE').length;

  const filtered = billings.filter((b) => {
    const matchSearch = !search ||
      b.student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      b.student.lastName.toLowerCase().includes(search.toLowerCase()) ||
      b.student.studentCode.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  // ─── Create Billing ───
  const getCreateTotal = () => {
    return FEE_ITEMS.reduce((sum, fi) => {
      const cfg = createFees[fi.category];
      return sum + (cfg.checked ? cfg.customAmount * cfg.months : 0);
    }, 0);
  };

  const handleCreateBilling = async () => {
    const student = students.find(s => s.id === createStudent);
    if (!student) { toast.error(t('selectStudentError')); return; }
    const selectedFees = FEE_ITEMS.filter(fi => createFees[fi.category].checked);
    if (selectedFees.length === 0) { toast.error(t('selectFeesError')); return; }

    const items = selectedFees.map(fi => {
      const cfg = createFees[fi.category];
      return {
        itemName: fi.label,
        originalAmount: cfg.customAmount * cfg.months,
        discountAmount: 0,
      };
    });

    try {
      await api.post('/billing', {
        studentId: student.id,
        billingMonth: new Date().toISOString().slice(0, 8) + '01',
        items,
      });
      setShowCreate(false);
      setCreateStudent('');
      setCreateFees(
        Object.fromEntries(FEE_ITEMS.map(fi => [fi.category, { checked: fi.category === 'TUITION', months: 1, customAmount: fi.defaultAmount }])) as any
      );
      toast.success(t('createSuccess'));
      loadBillings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create billing');
    }
  };

  // ─── Open Payment (Item-level) ───
  const openPaymentDialog = (billing: BillingData) => {
    setPaymentTarget(billing);
    setPaymentMethod('');
    setPaymentRef('');
    // Pre-select unpaid items
    setPaymentSelectedItems(billing.items.filter(i => !i.isPaid).map(i => i.category));
  };

  const getPaymentTotal = () => {
    if (!paymentTarget) return 0;
    return paymentTarget.items
      .filter(i => !i.isPaid && paymentSelectedItems.includes(i.category))
      .reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  };

  const handlePayment = async () => {
    if (!paymentTarget || !paymentMethod) { toast.error(t('selectMethodFirst')); return; }
    const amount = getPaymentTotal();
    if (amount <= 0) { toast.error(t('selectPayItemsError')); return; }

    try {
      setIsLoading(true);
      await api.post(`/billing/${paymentTarget.id}/payments`, {
        amount,
        paymentMethod,
        paymentDate: new Date().toISOString(),
        reference: paymentRef || undefined,
        note: `Items: ${paymentSelectedItems.join(', ')}`,
      });
      const methodLabel = t(`method_${paymentMethod}`);
      toast.success(`${formatVND(amount)} ${methodLabel} ${t('paymentSuccess')}`);
      setPaymentTarget(null);
      loadBillings();
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Issue Billing (DRAFT → ISSUED) ───
  const handleIssueBilling = async (billing: BillingData) => {
    try {
      setIsLoading(true);
      await api.patch(`/billing/${billing.id}/issue`, {
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      toast.success(t('issuedSuccess'));
      setSelectedBilling(null);
      loadBillings();
    } catch (err: any) {
      toast.error(err.message || 'Issue failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Cancel Billing ───
  const handleCancelBilling = async (billing: BillingData) => {
    const reason = window.prompt(t('cancelReason'));
    if (!reason) return;
    try {
      setIsLoading(true);
      await api.patch(`/billing/${billing.id}/cancel`, { reason });
      toast.success(t('cancelledSuccess'));
      setSelectedBilling(null);
      loadBillings();
    } catch (err: any) {
      toast.error(err.message || 'Cancel failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Helpers ───
  const statusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'PARTIALLY_PAID': return <CreditCard className="h-3.5 w-3.5" />;
      case 'ISSUED': return <FileText className="h-3.5 w-3.5" />;
      case 'OVERDUE': return <AlertTriangle className="h-3.5 w-3.5" />;
      case 'DRAFT': return <Clock className="h-3.5 w-3.5" />;
      case 'CANCELLED': return <XCircle className="h-3.5 w-3.5" />;
      default: return null;
    }
  };
  const statusStyle = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'PARTIALLY_PAID': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'ISSUED': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'OVERDUE': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'DRAFT': return 'bg-gray-500/10 text-gray-500 border-gray-200';
      case 'CANCELLED': return 'bg-gray-300/20 text-gray-400 border-gray-200';
      default: return '';
    }
  };
  const statusLabel = (status: string) => {
    const map: Record<string, string> = { DRAFT: t('draft'), ISSUED: t('issued'), PARTIALLY_PAID: t('partiallyPaid'), PAID: t('paid'), OVERDUE: t('overdue'), CANCELLED: t('cancelled') };
    return map[status] || status;
  };
  const methodIcon = (method: string) => {
    switch (method) {
      case 'CARD': return <CreditCard className="h-3.5 w-3.5 text-blue-600" />;
      case 'BANK_TRANSFER': return <Building2 className="h-3.5 w-3.5 text-violet-600" />;
      case 'CASH': return <Banknote className="h-3.5 w-3.5 text-emerald-600" />;
      default: return <Wallet className="h-3.5 w-3.5" />;
    }
  };
  const canCollect = (status: string) => ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(status);

  const itemSummary = (items: BillingItem[]) => {
    const paid = items.filter(i => i.isPaid).length;
    return `${paid}/${items.length}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <Button
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('createBilling')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('totalBilled')}</p>
                <p className="text-lg font-bold mt-1">{formatVND(totalBilled)}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <DollarSign className="h-4120 w-4 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('totalPaid')}</p>
            <p className="text-lg font-bold mt-1 text-emerald-600">{formatVND(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('outstanding')}</p>
            <p className="text-lg font-bold mt-1 text-amber-600">{formatVND(outstanding)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('collectionRate')}</p>
                <p className="text-lg font-bold mt-1 text-indigo-600">{collectionRate}%</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('overdueLabel')}</p>
            <p className={`text-lg font-bold mt-1 ${overdueCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {overdueCount}{overdueCount > 0 ? ' ⚠' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('allStatus')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('allStatus')}</SelectItem>
            <SelectItem value="DRAFT">{t('draft')}</SelectItem>
            <SelectItem value="ISSUED">{t('issued')}</SelectItem>
            <SelectItem value="PARTIALLY_PAID">{t('partiallyPaid')}</SelectItem>
            <SelectItem value="PAID">{t('paid')}</SelectItem>
            <SelectItem value="OVERDUE">{t('overdue')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Billing Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('studentLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('itemsLabel')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('amountLabel')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('paidLabel')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('balanceLabel')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('statusLabel')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('paymentMethodLabel')}</th>
                <th className="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((billing) => {
                const balance = billing.totalAmount - billing.paidAmount;
                return (
                  <tr key={billing.id}
                    className={`border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${billing.status === 'OVERDUE' ? 'bg-red-500/5' : ''}`}
                    onClick={() => setSelectedBilling(billing)}>
                    <td className="py-3 px-4">
                      <div className="font-medium">{billing.student.lastName} {billing.student.firstName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{billing.student.studentCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {billing.items.map((item, i) => (
                          <Badge key={i} variant="outline" className={`text-[10px] py-0 px-1.5 ${item.isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-muted/50'}`}>
                            {FEE_ITEMS.find(f => f.category === item.category)?.emoji || '📋'}
                            {item.months > 1 ? ` ${item.months}M` : ''}
                            {item.isPaid && ' ✓'}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatVND(billing.totalAmount)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                      {billing.paidAmount > 0 ? formatVND(billing.paidAmount) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {balance > 0
                        ? <span className="text-amber-600">{formatVND(balance)}</span>
                        : <span className="text-emerald-600">₫0</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className={`${statusStyle(billing.status)} gap-1`}>
                        {statusIcon(billing.status)} {statusLabel(billing.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {billing.payments.length > 0 ? billing.payments.map((p, i) => (
                          <span key={i} title={t(`method_${p.paymentMethod}`)}>{methodIcon(p.paymentMethod)}</span>
                        )) : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {canCollect(billing.status) ? (
                        <Button size="sm" variant="outline"
                          className="h-8 px-3 text-xs font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => openPaymentDialog(billing)}>
                          <Wallet className="h-3.5 w-3.5 mr-1" />{t('collect')}
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedBilling(billing)}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">{t('noBillings')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Create Billing Dialog ─── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> {t('createBilling')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Student Select */}
            <div className="space-y-1.5">
              <Label>{t('studentLabel')}</Label>
              <Select value={createStudent} onValueChange={(v) => setCreateStudent(v ?? '')}>
                <SelectTrigger><SelectValue placeholder={t('selectStudent')} /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Fee Items with Month Selector */}
            <div>
              <Label className="mb-3 block">{t('feeItems')}</Label>
              <div className="space-y-2.5">
                {FEE_ITEMS.map((fi) => {
                  const cfg = createFees[fi.category];
                  return (
                    <div key={fi.category} className={`p-3 rounded-xl border-2 transition-all ${cfg.checked ? 'border-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/10' : 'border-muted'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            id={fi.category}
                            checked={cfg.checked}
                            onCheckedChange={(checked) =>
                              setCreateFees(prev => ({ ...prev, [fi.category]: { ...prev[fi.category], checked: !!checked } }))
                            }
                          />
                          <label htmlFor={fi.category} className="text-sm font-medium cursor-pointer">
                            {fi.emoji} {fi.label}
                          </label>
                        </div>
                        <span className="text-xs text-muted-foreground">{t('defaultAmount', { amount: formatVND(fi.defaultAmount) })}</span>
                      </div>
                      {cfg.checked && (
                        <div className="mt-3 ml-7 space-y-2">
                          {/* Amount input */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground min-w-[50px]">{t('monthlyAmount')}</span>
                            <Input
                              type="number"
                              className="h-8 w-36 text-sm"
                              value={cfg.customAmount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setCreateFees(prev => ({ ...prev, [fi.category]: { ...prev[fi.category], customAmount: val } }));
                              }}
                            />
                            <span className="text-xs text-muted-foreground">₫</span>
                          </div>
                          {/* Months */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{t('paymentPeriod')}</span>
                            </div>
                            <Select value={String(cfg.months)} onValueChange={(v) =>
                              setCreateFees(prev => ({ ...prev, [fi.category]: { ...prev[fi.category], months: Number(v) } }))
                            }>
                              <SelectTrigger className="h-8 w-24 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                  <SelectItem key={m} value={String(m)}>{t('monthsUnit', { count: m })}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-sm font-semibold text-indigo-600 ml-auto">
                              {formatVND(cfg.customAmount * cfg.months)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Total */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50">
              <span className="font-medium">{t('totalLabel')}</span>
              <span className="text-xl font-bold text-indigo-600">{formatVND(getCreateTotal())}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('cancelBtn')}</Button>
            <Button onClick={handleCreateBilling} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Plus className="h-4 w-4 mr-2" />{t('createBilling')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Payment Dialog (Item-level selection) ─── */}
      <Dialog open={!!paymentTarget} onOpenChange={() => setPaymentTarget(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('collectPayment')}</DialogTitle>
          </DialogHeader>
          {paymentTarget && (
            <div className="space-y-4 py-2">
              {/* Student */}
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium">{paymentTarget.student.lastName} {paymentTarget.student.firstName}</p>
                <p className="text-xs text-muted-foreground font-mono">{paymentTarget.student.studentCode}</p>
              </div>

              {/* Select Items to Pay */}
              <div>
                <Label className="mb-2 block text-sm font-medium">{t('paymentItems')}</Label>
                <div className="space-y-2">
                  {paymentTarget.items.filter(i => !i.isPaid).map((item) => {
                    const selected = paymentSelectedItems.includes(item.category);
                    const fi = FEE_ITEMS.find(f => f.category === item.category);
                    return (
                      <div key={item.category}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-emerald-400 bg-emerald-50/30' : 'border-muted hover:border-muted-foreground/30'}`}
                        onClick={() => setPaymentSelectedItems(prev =>
                          prev.includes(item.category) ? prev.filter(c => c !== item.category) : [...prev, item.category]
                        )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Checkbox checked={selected} readOnly />
                            <span className="text-sm font-medium">{fi?.emoji} {item.itemName}</span>
                          </div>
                          <div className="text-right">
                            {item.months > 1 && <p className="text-[10px] text-muted-foreground">{t('monthsUnit', { count: item.months })}</p>}
                            <p className="text-sm font-semibold">{formatVND(item.totalAmount - item.paidAmount)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {paymentTarget.items.filter(i => i.isPaid).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">{t('allPaid')}</p>
                      {paymentTarget.items.filter(i => i.isPaid).map(item => (
                        <div key={item.category} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 opacity-60 mb-1">
                          <span className="text-xs">{FEE_ITEMS.find(f => f.category === item.category)?.emoji} {item.itemName}</span>
                          <span className="text-xs text-emerald-600">{formatVND(item.totalAmount)} ✓</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Method */}
              <div>
                <Label className="text-sm font-medium">{t('paymentMethodLabel')}</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    const sel = paymentMethod === m.value;
                    return (
                      <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${sel ? `${m.color} border-current ring-2 ring-current/20 scale-105` : 'border-muted hover:border-muted-foreground/30'}`}>
                        <Icon className={`h-5 w-5 ${sel ? '' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-medium ${sel ? '' : 'text-muted-foreground'}`}>{t(`method_${m.value}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <Label>{t('referenceLabel')}</Label>
                <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder={t('referencePlaceholder')} />
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50">
                <span className="font-medium">{t('paymentAmount')}</span>
                <span className="text-xl font-bold text-emerald-600">{formatVND(getPaymentTotal())}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentTarget(null)}>{t('cancelBtn')}</Button>
            <Button onClick={handlePayment} disabled={!paymentMethod || getPaymentTotal() <= 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" />{t('confirmPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={!!selectedBilling} onOpenChange={() => setSelectedBilling(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('billingDetail')}</DialogTitle>
          </DialogHeader>
          {selectedBilling && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedBilling.student.lastName} {selectedBilling.student.firstName}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{selectedBilling.student.studentCode}</p>
                </div>
                <Badge variant="outline" className={`${statusStyle(selectedBilling.status)} gap-1`}>
                  {statusIcon(selectedBilling.status)} {statusLabel(selectedBilling.status)}
                </Badge>
              </div>

              <Separator />

              {/* Items with paid/unpaid visual distinction */}
              <div>
                <p className="text-sm font-medium mb-2">{t('itemsLabel')}</p>
                <div className="space-y-2">
                  {selectedBilling.items.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg border ${item.isPaid ? 'bg-emerald-50/50 border-emerald-200/50' : 'bg-muted/30 border-transparent'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{FEE_ITEMS.find(f => f.category === item.category)?.emoji}</span>
                        <div>
                          <p className="text-sm font-medium">{item.itemName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {item.months > 1 && <span className="flex items-center gap-0.5"><CalendarRange className="h-3 w-3" />{t('monthsUnit', { count: item.months })}</span>}
                            <span>{formatVND(item.monthlyAmount)}/mo</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatVND(item.totalAmount)}</p>
                        {item.isPaid
                          ? <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">{t('paidCheck')}</Badge>
                          : <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">{t('unpaid')}</Badge>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between font-semibold text-base pt-1">
                  <span>{t('totalLabel')}</span>
                  <span>{formatVND(selectedBilling.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>{t('paidLabel')}</span>
                  <span>{formatVND(selectedBilling.paidAmount)}</span>
                </div>
                {selectedBilling.totalAmount - selectedBilling.paidAmount > 0 && (
                  <div className="flex justify-between text-amber-600 font-medium">
                    <span>{t('balanceLabel')}</span>
                    <span>{formatVND(selectedBilling.totalAmount - selectedBilling.paidAmount)}</span>
                  </div>
                )}
              </div>

              {/* Payment History */}
              {selectedBilling.payments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">{t('paymentHistory')}</p>
                    <div className="space-y-1.5">
                      {selectedBilling.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-100">
                          <div className="flex items-center gap-2">
                            {methodIcon(p.paymentMethod)}
                            <div>
                              <p className="text-sm font-medium">{formatVND(p.amount)}</p>
                              <p className="text-xs text-muted-foreground">
                                {t(`method_${p.paymentMethod}`)} · {new Date(p.paymentDate).toLocaleDateString()}
                              </p>
                              {p.items.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {p.items.map(cat => (
                                    <span key={cat} className="text-[10px]">{FEE_ITEMS.find(f => f.category === cat)?.emoji}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {p.reference && <span className="text-xs text-muted-foreground font-mono">{p.reference}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              {selectedBilling.status === 'DRAFT' && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                      onClick={() => handleIssueBilling(selectedBilling)}>
                      <FileText className="h-4 w-4 mr-2" /> {t('issue')}
                    </Button>
                    <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => handleCancelBilling(selectedBilling)}>
                      <XCircle className="h-4 w-4 mr-1" /> {t('cancelBtn')}
                    </Button>
                  </div>
                </>
              )}

              {/* Collect Button */}
              {canCollect(selectedBilling.status) && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={() => { setSelectedBilling(null); openPaymentDialog(selectedBilling); }}>
                      <Wallet className="h-4 w-4 mr-2" />
                      {t('collectPayment')} — {formatVND(selectedBilling.totalAmount - selectedBilling.paidAmount)}
                    </Button>
                    {selectedBilling.status !== 'PAID' && (
                      <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancelBilling(selectedBilling)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Delete Button — always visible for OWNER / ADMIN */}
              {(isOwner || isAdmin) && (
                <>
                  <Separator />
                  <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setDeleteBillingTarget(selectedBilling)}>
                    <Trash2 className="h-4 w-4 mr-2" /> {t('delete')}
                  </Button>
                </>
              )}

              {selectedBilling.note && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('noteLabel')}</p>
                    <p className="text-sm mt-1">{selectedBilling.note}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Billing Delete Confirmation ─── */}
      <AlertDialog open={!!deleteBillingTarget} onOpenChange={(open) => !open && setDeleteBillingTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelBtn')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500 text-white" onClick={async () => {
              if (!deleteBillingTarget) return;
              try {
                await api.delete(`/billing/${deleteBillingTarget.id}`);
                toast.success(t('deleteSuccess'));
                setDeleteBillingTarget(null);
                setSelectedBilling(null);
                loadBillings();
              } catch (err: any) {
                toast.error(err.message || t('deleteFailed'));
              }
            }}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
