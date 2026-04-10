'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import {
  UserPlus, Search, Shield, ShieldCheck, ShieldAlert, MoreHorizontal,
  Mail, Key, UserCog, CheckCircle2, Clock, XCircle, Copy, Handshake, Link2, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: string[];
  joinedAt: string;
  lastLogin: string | null;
  avatar?: string;
}

const PERMISSION_GROUPS: Record<string, string[]> = {
  student: ['student.view', 'student.create', 'student.edit'],
  class: ['class.view', 'class.create', 'class.assign_student', 'class.assign_teacher'],
  billing: ['billing.view', 'billing.create', 'billing.issue'],
  payment: ['payment.view', 'payment.collect'],
  expense: ['expense.view', 'expense.create', 'expense.approve', 'expense.pay'],
  dashboard: ['dashboard.view', 'report.export'],
  staff: ['staff.invite', 'role.manage', 'permission.manage'],
};

interface RoleInfo {
  id: string;
  name: string;
  code: string;
  _count?: { users: number };
  permissions?: Array<{ permission: { code: string; name: string } }>;
}

export default function StaffPage() {
  const t = useTranslations('staff');
  const { user: currentUser } = useAuth();
  const canDelete = ['OWNER', 'ADMIN'].includes(currentUser?.role?.code || '');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; link: string; role: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.get<any[]>('/users');
      setStaff(result.map((u: any) => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        role: u.role?.code?.toUpperCase() || u.role?.name?.toUpperCase() || 'TEACHER',
        status: u.isActive !== false ? 'ACTIVE' : 'INACTIVE',
        permissions: (u.role?.permissions || []).map((p: any) => p.permission?.code?.toUpperCase()).filter(Boolean),
        joinedAt: u.createdAt,
        lastLogin: null,
      })));
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const result = await api.get<RoleInfo[]>('/permissions/roles');
      setRoles(result);
      if (result.length > 0 && !inviteRoleId) {
        setInviteRoleId(result.find(r => r.code !== 'OWNER')?.id || result[0].id);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  }, []);

  useEffect(() => { loadStaff(); loadRoles(); }, [loadStaff, loadRoles]);

  const filtered = staff.filter((s) => {
    const matchRole = roleFilter === 'ALL' || s.role === roleFilter;
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const roleStyle = (r: string) => {
    switch (r) {
      case 'OWNER': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'ADMIN': return 'bg-violet-500/10 text-violet-600 border-violet-200';
      case 'FINANCE': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'ACADEMIC_MANAGER': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'TEACHER': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'PARTNER': return 'bg-cyan-500/10 text-cyan-600 border-cyan-200';
      default: return '';
    }
  };

  const roleIcon = (r: string) => {
    switch (r) {
      case 'OWNER': return <ShieldAlert className="h-3.5 w-3.5" />;
      case 'ADMIN': return <ShieldCheck className="h-3.5 w-3.5" />;
      case 'FINANCE': return <Shield className="h-3.5 w-3.5" />;
      case 'PARTNER': return <Handshake className="h-3.5 w-3.5" />;
      default: return <UserCog className="h-3.5 w-3.5" />;
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'ACTIVE': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1"><CheckCircle2 className="h-3 w-3" />{t('active')}</Badge>;
      case 'INVITED': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1"><Clock className="h-3 w-3" />{t('invited')}</Badge>;
      case 'DEACTIVATED': return <Badge variant="outline" className="bg-gray-300/20 text-gray-400 border-gray-200 gap-1"><XCircle className="h-3 w-3" />{t('deactivated')}</Badge>;
      default: return null;
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) { toast.error(t('emailRequired')); return; }
    if (!inviteRoleId) { toast.error('Please select a role'); return; }
    try {
      setIsInviting(true);
      const result = await api.post<{ inviteLink: string; role: string }>('/auth/invite', {
        email: inviteEmail,
        roleId: inviteRoleId,
      });
      // Show result dialog with invite link
      setInviteResult({
        email: inviteEmail,
        link: result.inviteLink,
        role: result.role,
      });
      setInviteOpen(false);
      setInviteEmail('');
      loadStaff();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = async () => {
    if (inviteResult?.link) {
      await navigator.clipboard.writeText(inviteResult.link).catch(() => {});
      toast.success('Invite link copied! Share via KakaoTalk, email, etc.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25">
          <UserPlus className="h-4 w-4 mr-2" />
          {t('invite')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {roles.map((r) => (
          <Card key={r.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRoleFilter(roleFilter === r.code.toUpperCase() ? 'ALL' : r.code.toUpperCase())}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {roleIcon(r.code.toUpperCase())}
                <p className="text-xs text-muted-foreground font-medium">{r.name}</p>
              </div>
              <p className="text-2xl font-bold">{staff.filter(s => s.role === r.code.toUpperCase()).length}</p>
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
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('allRoles')}</SelectItem>
            {roles.map(r => <SelectItem key={r.code} value={r.code.toUpperCase()}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Staff Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('nameLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('emailLabel')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('roleLabel')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('statusLabel')}</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('permissionsLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('lastLoginLabel')}</th>
                <th className="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{s.email}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className={`${roleStyle(s.role)} gap-1`}>{roleIcon(s.role)} {roles.find(r => r.code.toUpperCase() === s.role)?.name || s.role}</Badge>
                  </td>
                  <td className="py-3 px-4 text-center">{statusBadge(s.status)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-xs text-muted-foreground">{s.permissions.length} {t('permissionCount')}</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-sm">
                    {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(s)}><Key className="h-4 w-4 mr-2" />{t('managePermissions')}</DropdownMenuItem>
                        {canDelete && s.role !== 'OWNER' && s.id !== currentUser?.id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4 mr-2" />Delete Staff</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">{t('noStaff')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Invite Dialog ─── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('inviteTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('emailLabel')}</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={t('emailPlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('roleLabel')}</Label>
              <select
                value={inviteRoleId}
                onChange={(e) => setInviteRoleId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>Select Role</option>
                {roles.filter(r => r.code !== 'OWNER').map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleInvite} disabled={isInviting} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Mail className="h-4 w-4 mr-2" />{isInviting ? 'Sending...' : t('sendInvite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Permission Detail Dialog ─── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('staffDetail')}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg font-bold">
                  {selected.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{selected.name}</h3>
                  <p className="text-sm text-muted-foreground">{selected.email}</p>
                </div>
                <Badge variant="outline" className={`${roleStyle(selected.role)} gap-1`}>{roleIcon(selected.role)} {roles.find(r => r.code.toUpperCase() === selected.role)?.name || selected.role}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">{t('statusLabel')}</p>{statusBadge(selected.status)}</div>
                <div><p className="text-xs text-muted-foreground">{t('joinedLabel')}</p><p className="font-medium">{new Date(selected.joinedAt).toLocaleDateString()}</p></div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-3">{t('permissionsLabel')} ({selected.permissions.length})</p>
                <div className="space-y-3">
                  {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
                    const activePerms = perms.filter(p => selected.permissions.includes(p));
                    if (activePerms.length === 0) return null;
                    return (
                      <div key={group} className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{t(`group_${group}`)}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {perms.map(p => (
                            <Badge key={p} variant={selected.permissions.includes(p) ? 'default' : 'secondary'}
                              className={`text-xs ${selected.permissions.includes(p) ? 'bg-indigo-600' : 'opacity-30'}`}>
                              {p.split('_').pop()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Invite Result Dialog ─── */}
      <Dialog open={!!inviteResult} onOpenChange={() => setInviteResult(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>✅ Invitation Sent!</DialogTitle></DialogHeader>
          {inviteResult && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>{inviteResult.email}</strong> has been invited as <strong className="text-indigo-600">{inviteResult.role}</strong>
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">📋 Invite Link (share via KakaoTalk, Email, etc.)</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteResult.link}
                    className="text-xs font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copy">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  ⏰ This link expires in <strong>7 days</strong>. The person who receives this link can create their account by clicking on it.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleCopyLink} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Link2 className="h-4 w-4 mr-2" />Copy Link
            </Button>
            <Button variant="outline" onClick={() => setInviteResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Staff Confirmation ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> 스태프 삭제
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})을(를) 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없으며, 해당 직원의 계정이 완전히 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500 text-white" onClick={async () => {
              if (!deleteTarget) return;
              try {
                await api.delete(`/users/${deleteTarget.id}`);
                toast.success(`${deleteTarget.name} 스태프가 삭제되었습니다`);
                setDeleteTarget(null);
                loadStaff();
              } catch (err: any) {
                toast.error(err.message || '삭제 실패');
              }
            }}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
