'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Building2, CreditCard, Mail, Globe, Calendar, Save,
  DollarSign, Bell, Loader2, Lock, Trash2, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [orgName, setOrgName] = useState('Royal Kids College');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [locale, setLocale] = useState('vi-VN');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');

  const [billingDay, setBillingDay] = useState('1');
  const [dueDays, setDueDays] = useState('15');
  const [currency, setCurrency] = useState('VND');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [autoReminder, setAutoReminder] = useState(true);

  const [smtpHost, setSmtpHost] = useState('smtp.resend.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [notifyOverdue, setNotifyOverdue] = useState(true);
  const [notifyPayment, setNotifyPayment] = useState(true);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Billing templates
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; amount: number; programType: string }>>([] );
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [deletingTemplates, setDeletingTemplates] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get<Record<string, string>>('/settings');
      if (data.organization_name) setOrgName(data.organization_name);
      if (data.organization_address) setOrgAddress(data.organization_address);
      if (data.organization_phone) setOrgPhone(data.organization_phone);
      if (data.organization_email) setOrgEmail(data.organization_email);
      if (data.default_locale) setLocale(data.default_locale === 'ko' ? 'ko-KR' : data.default_locale === 'en' ? 'en-US' : 'vi-VN');
      if (data.timezone) setTimezone(data.timezone);
      if (data.billing_day) setBillingDay(data.billing_day);
      if (data.due_days) setDueDays(data.due_days);
      if (data.currency) setCurrency(data.currency);
      if (data.auto_generate) setAutoGenerate(data.auto_generate === 'true');
      if (data.auto_reminder) setAutoReminder(data.auto_reminder === 'true');
      if (data.smtp_host) setSmtpHost(data.smtp_host);
      if (data.smtp_port) setSmtpPort(data.smtp_port);
      if (data.smtp_from) setSmtpFrom(data.smtp_from);
      if (data.notify_overdue) setNotifyOverdue(data.notify_overdue === 'true');
      if (data.notify_payment) setNotifyPayment(data.notify_payment === 'true');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Load billing templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const data = await api.get<any[]>('/billing/templates/all');
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.delete(`/billing/templates/${id}`);
      toast.success(t('templateDeleted'));
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleDeleteAllTemplates = async () => {
    try {
      setDeletingTemplates(true);
      await api.delete('/billing/templates/all');
      toast.success(t('allTemplatesDeleted'));
      setTemplates([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeletingTemplates(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const localeMap: Record<string, string> = { 'vi-VN': 'vi', 'ko-KR': 'ko', 'en-US': 'en' };
      await api.put('/settings', {
        organization_name: orgName,
        organization_address: orgAddress,
        organization_phone: orgPhone,
        organization_email: orgEmail,
        default_locale: localeMap[locale] || locale,
        timezone,
        billing_day: billingDay,
        due_days: dueDays,
        currency,
        auto_generate: autoGenerate.toString(),
        auto_reminder: autoReminder.toString(),
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_from: smtpFrom,
        notify_overdue: notifyOverdue.toString(),
        notify_payment: notifyPayment.toString(),
      });
      toast.success(t('saveSuccess'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t('save')}
        </Button>
      </div>

      {/* ─── General ─── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-indigo-600" />
            {t('general')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('orgName')}</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('orgEmail')}</Label>
              <Input type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{t('orgAddress')}</Label>
              <Input value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('orgPhone')}</Label>
              <Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('timezone')}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh (UTC+7)</SelectItem>
                  <SelectItem value="Asia/Seoul">Asia/Seoul (UTC+9)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('locale')}</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi-VN">Tiếng Việt</SelectItem>
                  <SelectItem value="ko-KR">Korean</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Billing ─── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            {t('billing')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{t('billingDay')}</Label>
              <Select value={billingDay} onValueChange={setBillingDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <SelectItem key={d} value={d.toString()}>{d}{t('dayUnit')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('billingDayHint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('dueDays')}</Label>
              <Select value={dueDays} onValueChange={setDueDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[7, 10, 14, 15, 20, 30].map(d => (
                    <SelectItem key={d} value={d.toString()}>{d}{t('daysUnit')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('dueDaysHint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VND">VND (₫)</SelectItem>
                  <SelectItem value="KRW">KRW (₩)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('autoGenerate')}</p>
                <p className="text-xs text-muted-foreground">{t('autoGenerateHint')}</p>
              </div>
              <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('autoReminder')}</p>
                <p className="text-xs text-muted-foreground">{t('autoReminderHint')}</p>
              </div>
              <Switch checked={autoReminder} onCheckedChange={setAutoReminder} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Billing Templates ─── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-violet-600" />
              {t('billingTemplates')}
            </CardTitle>
            {templates.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAllTemplates}
                disabled={deletingTemplates}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                {deletingTemplates ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                {t('deleteAll')}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t('billingTemplatesHint')}</p>
        </CardHeader>
        <CardContent>
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {t('noTemplates')}
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{tmpl.name}</p>
                      <p className="text-xs text-muted-foreground">{tmpl.programType} · {new Intl.NumberFormat('vi-VN').format(tmpl.amount)} ₫</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Email / Notifications ─── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-amber-600" />
            {t('email')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{t('smtpHost')}</Label>
              <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('smtpPort')}</Label>
              <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('smtpFrom')}</Label>
              <Input type="email" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4" />{t('notifications')}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{t('notifyOverdue')}</p>
                <p className="text-xs text-muted-foreground">{t('notifyOverdueHint')}</p>
              </div>
              <Switch checked={notifyOverdue} onCheckedChange={setNotifyOverdue} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{t('notifyPayment')}</p>
                <p className="text-xs text-muted-foreground">{t('notifyPaymentHint')}</p>
              </div>
              <Switch checked={notifyPayment} onCheckedChange={setNotifyPayment} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Password Change ─── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-amber-600" />
            {t('changePassword')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{t('currentPassword')}</Label>
              <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder={t('currentPasswordPlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('newPassword')}</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={t('newPasswordPlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('confirmPassword')}</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder={t('confirmPasswordPlaceholder')} />
            </div>
          </div>
          <Button
            variant="outline"
            disabled={changingPw || !currentPw || !newPw || newPw !== confirmPw || newPw.length < 6}
            onClick={async () => {
              if (newPw !== confirmPw) { toast.error(t('passwordMismatch')); return; }
              try {
                setChangingPw(true);
                await api.patch('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
                toast.success(t('passwordChanged'));
                setCurrentPw(''); setNewPw(''); setConfirmPw('');
              } catch (err: any) {
                toast.error(err.message || t('passwordChangeFailed'));
              } finally {
                setChangingPw(false);
              }
            }}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            {changingPw ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            {t('changePassword')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
