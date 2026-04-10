'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Filter, Eye, Edit2, MoreHorizontal, Users, RotateCcw, UserX, GraduationCap, ArrowRightLeft, UserPlus, X, Pencil, Save, Stethoscope, AlertTriangle, Trash2, Activity, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface Student {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  dateOfBirth: string | null;
  programType: string;
  status: string;
  enrollDate: string | null;
  note: string | null;
  hasAllergy: boolean;
  allergyDescription: string | null;
  lastDentalCheckDate: string | null;
  nextDentalCheckDate: string | null;
  createdAt: string;
  guardians: Array<{
    relation: string;
    isPrimary: boolean;
    guardian: { id: string; name: string; phone: string | null; email: string | null };
  }>;
  classStudents: Array<{
    class: { id: string; name: string; classType: string };
  }>;
  _count?: { promotions: number; billings: number };
  withdrawDate?: string | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ClassInfo {
  id: string;
  name: string;
  classType: string;
}

// ─── Page Component ───
export default function StudentsPage() {
  const t = useTranslations('students');
  const { user } = useAuth();
  const isOwner = user?.role?.code === 'OWNER';
  const [students, setStudents] = useState<Student[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);
  const [stats, setStats] = useState({ total: 0, totalActive: 0, byStatus: {} as Record<string, number>, byProgram: {} as Record<string, number> });
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [programFilter, setProgramFilter] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [includeWithdrawn, setIncludeWithdrawn] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<Student | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [reactivateTarget, setReactivateTarget] = useState<Student | null>(null);
  const [reactivateReason, setReactivateReason] = useState('');
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', gender: '', dateOfBirth: '',
    programType: 'KINDERGARTEN', enrollDate: '', note: '',
    hasAllergy: false, allergyDescription: '',
    lastDentalCheckDate: '', nextDentalCheckDate: '',
  });

  // Form state for create dialog
  const [form, setForm] = useState({
    firstName: '', lastName: '', gender: '', dateOfBirth: '',
    programType: 'KINDERGARTEN', enrollDate: '', note: '',
    guardianName: '', guardianPhone: '', guardianEmail: '', guardianRelation: 'MOTHER',
    classId: '' as string,
  });

  // ─── Load data from API ───
  const loadStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = { page: pagination.page, limit: pagination.limit };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (programFilter !== 'ALL') params.programType = programFilter;
      if (search) params.search = search;
      if (includeWithdrawn) params.includeWithdrawn = 1;

      const result = await api.get<{ data: Student[]; pagination: Pagination }>('/students', params);
      setStudents(result.data);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, programFilter, includeWithdrawn, pagination.page]);

  const loadStats = useCallback(async () => {
    try {
      const result = await api.get('/students/stats');
      setStats(result);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const result = await api.get<ClassInfo[]>('/classes');
      setAvailableClasses(result.map((c: any) => ({ id: c.id, name: c.name, classType: c.classType })));
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadStats();
    loadClasses();
  }, [loadStats, loadClasses]);

  // Class assignment dialog state (for detail view)
  const [showClassAssign, setShowClassAssign] = useState(false);

  // API에서 서버 필터링하므로 클라이언트 필터 불필요
  const filteredStudents = students;

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setEditForm({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      programType: student.programType,
      enrollDate: student.enrollDate ? student.enrollDate.slice(0, 10) : '',
      note: student.note || '',
      hasAllergy: student.hasAllergy || false,
      allergyDescription: student.allergyDescription || '',
      lastDentalCheckDate: student.lastDentalCheckDate ? student.lastDentalCheckDate.slice(0, 10) : '',
      nextDentalCheckDate: student.nextDentalCheckDate ? student.nextDentalCheckDate.slice(0, 10) : '',
    });
    setIsEditOpen(true);
  };

  const handleEditStudent = async () => {
    if (!selectedStudent) return;
    try {
      setIsLoading(true);
      await api.put(`/students/${selectedStudent.id}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        gender: editForm.gender || undefined,
        dateOfBirth: editForm.dateOfBirth || undefined,
        programType: editForm.programType,
        enrollDate: editForm.enrollDate || undefined,
        note: editForm.note,
        hasAllergy: editForm.hasAllergy,
        allergyDescription: editForm.hasAllergy ? editForm.allergyDescription : null,
        lastDentalCheckDate: editForm.lastDentalCheckDate || undefined,
        nextDentalCheckDate: editForm.nextDentalCheckDate || undefined,
      });
      toast.success('원생 정보가 수정되었습니다');
      setIsEditOpen(false);
      loadStudents();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || '수정에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName) {
      toast.error('First name and last name are required');
      return;
    }

    try {
      setIsLoading(true);
      const dto: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        programType: form.programType,
      };
      if (form.gender) dto.gender = form.gender;
      if (form.dateOfBirth) dto.dateOfBirth = form.dateOfBirth;
      if (form.enrollDate) dto.enrollDate = form.enrollDate;
      if (form.note) dto.note = form.note;
      if (form.guardianName) {
        dto.guardians = [{
          name: form.guardianName,
          phone: form.guardianPhone || undefined,
          email: form.guardianEmail || undefined,
          relation: form.guardianRelation,
          isPrimary: true,
        }];
      }

      const student = await api.post('/students', dto);

      // 반 배정 (생성 후)
      if (form.classId) {
        await api.post(`/classes/${form.classId}/students`, { studentId: student.id });
      }

      setIsCreateOpen(false);
      setForm({
        firstName: '', lastName: '', gender: '', dateOfBirth: '',
        programType: 'KINDERGARTEN', enrollDate: '', note: '',
        guardianName: '', guardianPhone: '', guardianEmail: '', guardianRelation: 'MOTHER',
        classId: '',
      });
      toast.success(t('createSuccess'));
      loadStudents();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawTarget || !withdrawReason.trim()) {
      toast.error('퇴원 사유를 입력해 주세요');
      return;
    }
    try {
      setIsLoading(true);
      await api.patch(`/students/${withdrawTarget.id}/status`, {
        status: 'WITHDRAWN',
        reason: withdrawReason,
      });
      toast.success(`${withdrawTarget.lastName} ${withdrawTarget.firstName} 원생이 퇴원 처리되었습니다`);
      setWithdrawTarget(null);
      setWithdrawReason('');
      setIsDetailOpen(false);
      loadStudents();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || '퇴원 처리에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateTarget || !reactivateReason.trim()) {
      toast.error('재입원 사유를 입력해 주세요');
      return;
    }
    try {
      setIsLoading(true);
      await api.patch(`/students/${reactivateTarget.id}/reactivate`, {
        reason: reactivateReason,
      });
      toast.success(`${reactivateTarget.lastName} ${reactivateTarget.firstName} 원생이 재입원 처리되었습니다`);
      setReactivateTarget(null);
      setReactivateReason('');
      setIsDetailOpen(false);
      loadStudents();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || '재입원 처리에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'PENDING': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'ON_LEAVE': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'WITHDRAWN': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const programBadge = (type: string) => {
    switch (type) {
      case 'KINDERGARTEN': return 'bg-violet-500/10 text-violet-600 border-violet-200';
      case 'ACADEMY': return 'bg-cyan-500/10 text-cyan-600 border-cyan-200';
      case 'BOTH': return 'bg-pink-500/10 text-pink-600 border-pink-200';
      default: return '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('addStudent')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('totalStudents')}</p>
                <p className="text-2xl font-bold mt-1">{stats.totalActive || stats.total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.byStatus?.WITHDRAWN ? `+${stats.byStatus.WITHDRAWN} ${t('withdrawn')}` : ''}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('active')}</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.byStatus?.ACTIVE || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('kindergartenLabel')}</p>
            <p className="text-2xl font-bold mt-1 text-violet-600">{(stats.byProgram?.KINDERGARTEN || 0) + (stats.byProgram?.BOTH || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('academyLabel')}</p>
            <p className="text-2xl font-bold mt-1 text-cyan-600">{(stats.byProgram?.ACADEMY || 0) + (stats.byProgram?.BOTH || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('allStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('allStatus')}</SelectItem>
            <SelectItem value="ACTIVE">{t('active')}</SelectItem>
            <SelectItem value="PENDING">{t('pending')}</SelectItem>
            <SelectItem value="ON_LEAVE">{t('onLeave')}</SelectItem>
            <SelectItem value="WITHDRAWN">{t('withdrawn')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('allPrograms')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('allPrograms')}</SelectItem>
            <SelectItem value="KINDERGARTEN">{t('kindergarten')}</SelectItem>
            <SelectItem value="ACADEMY">{t('academy')}</SelectItem>
            <SelectItem value="BOTH">{t('both')}</SelectItem>
          </SelectContent>
        </Select>
        {/* 퇴원생 포함 토글 */}
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none ml-2">
          <input
            type="checkbox"
            checked={includeWithdrawn}
            onChange={(e) => setIncludeWithdrawn(e.target.checked)}
            className="rounded border-gray-300"
          />
          {t('includeWithdrawn')}
        </label>
      </div>

      {/* Students Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('code')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('name')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('programLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('statusLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('classLabel')}</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('guardian')}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => (
                <tr
                  key={student.id}
                  className={`border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                    student.status === 'WITHDRAWN' ? 'opacity-50 bg-muted/10' : ''
                  }`}
                  onClick={() => { setSelectedStudent(student); setIsDetailOpen(true); }}
                >
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{student.studentCode}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{student.lastName} {student.firstName}</div>
                    {student.dateOfBirth && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(student.dateOfBirth).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={programBadge(student.programType)}>
                      {t(student.programType.toLowerCase())}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={statusColor(student.status)}>
                      {t(student.status.toLowerCase())}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {student.classStudents.length > 0
                      ? student.classStudents.map(cs => cs.class.name).join(', ')
                      : '—'}
                  </td>
                  <td className="py-3 px-4">
                    {student.guardians[0] && (
                      <div>
                        <div className="text-sm">{student.guardians[0].guardian.name}</div>
                        <div className="text-xs text-muted-foreground">{student.guardians[0].guardian.phone}</div>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); setIsDetailOpen(true); }}>
                          <Eye className="h-4 w-4 mr-2" /> {t('viewDetail')}
                        </DropdownMenuItem>
                        {student.status !== 'WITHDRAWN' ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(student); }}>
                            <Edit2 className="h-4 w-4 mr-2" /> {t('edit')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info(t('reactivateInfo')); }}>
                            <RotateCcw className="h-4 w-4 mr-2" /> {t('reactivate')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    {t('noStudents')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Create Student Dialog ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('addStudent')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-sm font-medium text-muted-foreground">{t('studentInfo')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('firstName')}</Label>
                <Input value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('lastName')}</Label>
                <Input value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('genderLabel')}</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({...form, gender: v})}>
                  <SelectTrigger><SelectValue placeholder={t('selectGender')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t('male')}</SelectItem>
                    <SelectItem value="FEMALE">{t('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('dateOfBirth')}</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({...form, dateOfBirth: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('programLabel')}</Label>
                <Select value={form.programType} onValueChange={(v) => setForm({...form, programType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KINDERGARTEN">{t('kindergarten')}</SelectItem>
                    <SelectItem value="ACADEMY">{t('academy')}</SelectItem>
                    <SelectItem value="BOTH">{t('both')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('enrollDate')}</Label>
                <Input type="date" value={form.enrollDate} onChange={(e) => setForm({...form, enrollDate: e.target.value})} />
              </div>
            </div>

            <Separator />

            {/* 반 배정 */}
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> {t('classAssignment')}
            </div>
            <div className="space-y-1.5">
              <Label>{t('classLabel')}</Label>
              <Select value={form.classId} onValueChange={(v) => setForm({...form, classId: v})}>
                <SelectTrigger><SelectValue placeholder={t('selectClass')} /></SelectTrigger>
                <SelectContent>
                  {availableClasses.filter(c => {
                    if (form.programType === 'KINDERGARTEN') return c.classType === 'KINDERGARTEN';
                    if (form.programType === 'ACADEMY') return c.classType === 'ACADEMY';
                    return true; // BOTH
                  }).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.classType === 'KINDERGARTEN' ? '🎨' : '📚'} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('classAssignHint')}</p>
            </div>

            <Separator />

            <div className="text-sm font-medium text-muted-foreground">{t('guardianInfo')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('guardianName')}</Label>
                <Input value={form.guardianName} onChange={(e) => setForm({...form, guardianName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('relation')}</Label>
                <Select value={form.guardianRelation} onValueChange={(v) => setForm({...form, guardianRelation: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MOTHER">{t('mother')}</SelectItem>
                    <SelectItem value="FATHER">{t('father')}</SelectItem>
                    <SelectItem value="GRANDFATHER">{t('grandfather')}</SelectItem>
                    <SelectItem value="GRANDMOTHER">{t('grandmother')}</SelectItem>
                    <SelectItem value="OTHER">{t('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('phone')}</Label>
                <Input value={form.guardianPhone} onChange={(e) => setForm({...form, guardianPhone: e.target.value})} placeholder="010-0000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('emailLabel')}</Label>
                <Input type="email" value={form.guardianEmail} onChange={(e) => setForm({...form, guardianEmail: e.target.value})} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Student Detail Dialog ─── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('studentDetail')}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedStudent.lastName} {selectedStudent.firstName}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{selectedStudent.studentCode}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className={programBadge(selectedStudent.programType)}>
                    {t(selectedStudent.programType.toLowerCase())}
                  </Badge>
                  <Badge variant="outline" className={statusColor(selectedStudent.status)}>
                    {t(selectedStudent.status.toLowerCase())}
                  </Badge>
                </div>
              </div>
              {selectedStudent.status !== 'WITHDRAWN' && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEditDialog(selectedStudent)}>
                    <Pencil className="h-3 w-3" /> 수정
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => setWithdrawTarget(selectedStudent)}>
                    <UserX className="h-3 w-3" /> 퇴원 처리
                  </Button>
                  {isOwner && (!selectedStudent._count || selectedStudent._count.billings === 0) && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteStudentTarget(selectedStudent)}>
                      <Trash2 className="h-3 w-3" /> 삭제
                    </Button>
                  )}
                </div>
              )}
              {selectedStudent.status === 'WITHDRAWN' && (
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs">
                    <UserX className="h-3.5 w-3.5" />
                    퇴원일: {selectedStudent.withdrawDate ? new Date(selectedStudent.withdrawDate).toLocaleDateString() : '—'}
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => setReactivateTarget(selectedStudent)}>
                    <RotateCcw className="h-3 w-3" /> 재입원
                  </Button>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('genderLabel')}</p>
                  <p className="font-medium">{selectedStudent.gender ? t(selectedStudent.gender.toLowerCase()) : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('dateOfBirth')}</p>
                  <p className="font-medium">{selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('enrollDate')}</p>
                  <p className="font-medium">{selectedStudent.enrollDate ? new Date(selectedStudent.enrollDate).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('enrollDate')}</p>
                  <p className="font-medium">{selectedStudent.enrollDate ? new Date(selectedStudent.enrollDate).toLocaleDateString() : '—'}</p>
                </div>
              </div>

              {/* ─── 반 배정 관리 ─── */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" /> {t('classLabel')}
                  </p>
                  {selectedStudent.status !== 'WITHDRAWN' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowClassAssign(true)}>
                      <ArrowRightLeft className="h-3 w-3 mr-1" /> {t('manageClass')}
                    </Button>
                  )}
                </div>
                {selectedStudent.classStudents.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedStudent.classStudents.map((cs) => (
                      <div key={cs.class.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span>{cs.class.classType === 'KINDERGARTEN' ? '🎨' : '📚'}</span>
                          <div>
                            <p className="text-sm font-medium">{cs.class.name}</p>
                            <p className="text-xs text-muted-foreground">{cs.class.classType === 'KINDERGARTEN' ? t('kindergarten') : t('academy')}</p>
                          </div>
                        </div>
                        {selectedStudent.status !== 'WITHDRAWN' && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                await api.delete(`/classes/${cs.class.id}/students/${selectedStudent.id}`);
                                setSelectedStudent(prev => prev ? { ...prev, classStudents: prev.classStudents.filter(c => c.class.id !== cs.class.id) } : null);
                                toast.success(`${cs.class.name} 반에서 제외됨`);
                                loadStudents();
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to remove from class');
                              }
                            }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('noClassAssigned')}</p>
                )}
              </div>

              {selectedStudent.guardians.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('guardianInfo')}</p>
                    {selectedStudent.guardians.map((g, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium">{g.guardian.name}</p>
                          <p className="text-xs text-muted-foreground">{t(g.relation.toLowerCase())} {g.isPrimary && '(Primary)'}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>{g.guardian.phone}</p>
                          <p className="text-xs text-muted-foreground">{g.guardian.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selectedStudent.note && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('notes')}</p>
                    <p className="text-sm mt-1">{selectedStudent.note}</p>
                  </div>
                </>
              )}

              {/* ─── 건강 정보 (알러지 / 구강검사) ─── */}
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Stethoscope className="h-4 w-4" /> 건강 정보
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span>{selectedStudent.hasAllergy ? '⚠️' : '✅'}</span>
                      <div>
                        <p className="text-sm font-medium">알러지</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedStudent.hasAllergy
                            ? selectedStudent.allergyDescription || '알러지 있음 (상세 정보 없음)'
                            : '알러지 없음'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span>🪷</span>
                      <div>
                        <p className="text-sm font-medium">구강검사 (연 2회 의무)</p>
                        <p className="text-xs text-muted-foreground">
                          지난 검사: {selectedStudent.lastDentalCheckDate
                            ? new Date(selectedStudent.lastDentalCheckDate).toLocaleDateString()
                            : '미실시'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          다음 검사: {selectedStudent.nextDentalCheckDate
                            ? new Date(selectedStudent.nextDentalCheckDate).toLocaleDateString()
                            : '미예정'}
                        </p>
                      </div>
                    </div>
                    {!selectedStudent.lastDentalCheckDate && (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-200">미실시</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* 건강검진 관리 */}
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4 text-green-600" /> 건강관리</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={async () => {
                    try {
                      const dental = await api.get(`/students/${selectedStudent.id}/dental`);
                      const health = await api.get(`/students/${selectedStudent.id}/health`);
                      const info = [
                        '🦷 구강검사 이력:',
                        ...(dental.length > 0 ? dental.map((d: any) => `  ${d.year}년 ${d.round}차 (${new Date(d.checkDate).toLocaleDateString()}) - ${d.result || '결과 미입력'}${d.findings ? ` / ${d.findings}` : ''}`) : ['  기록 없음']),
                        '',
                        '🏥 건강검진 이력:',
                        ...(health.length > 0 ? health.map((h: any) => `  ${new Date(h.checkDate).toLocaleDateString()} - 키:${h.heightCm || '-'}cm, 몸무게:${h.weightKg || '-'}kg, 시력:${h.visionLeft || '-'}/${h.visionRight || '-'}${h.findings ? ` / ${h.findings}` : ''}`) : ['  기록 없음']),
                      ].join('\n');
                      alert(info);
                    } catch { toast.error('조회 실패'); }
                  }}>
                    <Eye className="h-3 w-3" /> 검진 이력 보기
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                        <Plus className="h-3 w-3" /> 검진 기록 추가
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => {
                        const year = new Date().getFullYear();
                        const round = prompt('회차 (1 또는 2):');
                        if (!round || (round !== '1' && round !== '2')) { toast.error('1 또는 2를 입력해주세요'); return; }
                        const result = prompt('검진 결과 (양호/치료필요/치료완료):') || '';
                        const findings = prompt('특이사항:') || '';
                        const dentist = prompt('검진 기관/의사:') || '';
                        api.post(`/students/${selectedStudent.id}/dental`, {
                          year, round: parseInt(round), checkDate: new Date().toISOString(),
                          result, findings, dentist,
                        }).then(() => { toast.success('구강검사 기록 저장됨'); loadStudents(); }).catch((e: any) => toast.error(e.message));
                      }}>
                        🦷 구강검사
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const heightCm = prompt('키 (cm):');
                        const weightKg = prompt('몸무게 (kg):');
                        const visionLeft = prompt('좌안 시력 (예: 1.0):') || '';
                        const visionRight = prompt('우안 시력 (예: 1.0):') || '';
                        const bloodType = prompt('혈액형 (A/B/O/AB):') || '';
                        const findings = prompt('특이사항:') || '';
                        api.post(`/students/${selectedStudent.id}/health`, {
                          checkDate: new Date().toISOString(),
                          heightCm: heightCm ? parseFloat(heightCm) : undefined,
                          weightKg: weightKg ? parseFloat(weightKg) : undefined,
                          visionLeft, visionRight, bloodType, findings,
                        }).then(() => { toast.success('건강검진 기록 저장됨'); }).catch((e: any) => toast.error(e.message));
                      }}>
                        🏥 건강검진
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* 퇴원생 안내 배너 */}
              {selectedStudent.status === 'WITHDRAWN' && (
                <>
                  <Separator />
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <UserX className="h-4 w-4 text-red-500" />
                      <p className="text-sm font-medium text-red-600">{t('withdrawnNotice')}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('withdrawnDate')}: {selectedStudent.withdrawDate
                        ? new Date(selectedStudent.withdrawDate).toLocaleDateString()
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t('dataRetained')}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Class Assignment Dialog ─── */}
      <Dialog open={showClassAssign} onOpenChange={setShowClassAssign}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" /> {t('manageClass')}
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedStudent.lastName} {selectedStudent.firstName}</span> — {t('selectClassToAssign')}
              </p>
              <div className="space-y-2">
                {availableClasses.map(cls => {
                  const alreadyAssigned = selectedStudent.classStudents.some(cs => cs.class.id === cls.id);
                  return (
                    <div key={cls.id}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        alreadyAssigned ? 'border-emerald-300 bg-emerald-50/30 opacity-60' : 'border-muted hover:border-indigo-300 cursor-pointer hover:bg-indigo-50/20'
                      }`}
                      onClick={async () => {
                        if (alreadyAssigned) return; // 중복 방지
                        try {
                          await api.post(`/classes/${cls.id}/students`, { studentId: selectedStudent.id });
                          setSelectedStudent(prev => prev ? { ...prev, classStudents: [...prev.classStudents, { class: cls }] } : null);
                          toast.success(`${cls.name} 반에 배정됨`);
                          setShowClassAssign(false);
                          loadStudents();
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to assign to class');
                        }
                      }}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{cls.classType === 'KINDERGARTEN' ? '🎨' : '📚'}</span>
                        <div>
                          <p className="text-sm font-medium">{cls.name}</p>
                          <p className="text-xs text-muted-foreground">{cls.classType === 'KINDERGARTEN' ? t('kindergarten') : t('academy')}</p>
                        </div>
                      </div>
                      {alreadyAssigned ? (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200">배정됨 ✓</Badge>
                      ) : (
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClassAssign(false)}>{t('cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Student Dialog ─── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> 원생 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm font-medium text-muted-foreground">기본 정보</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('firstName')}</Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('lastName')}</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('genderLabel')}</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm({...editForm, gender: v})}>
                  <SelectTrigger><SelectValue placeholder={t('selectGender')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t('male')}</SelectItem>
                    <SelectItem value="FEMALE">{t('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('dateOfBirth')}</Label>
                <Input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('programLabel')}</Label>
                <Select value={editForm.programType} onValueChange={(v) => setEditForm({...editForm, programType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KINDERGARTEN">{t('kindergarten')}</SelectItem>
                    <SelectItem value="ACADEMY">{t('academy')}</SelectItem>
                    <SelectItem value="BOTH">{t('both')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('enrollDate')}</Label>
                <Input type="date" value={editForm.enrollDate} onChange={(e) => setEditForm({...editForm, enrollDate: e.target.value})} />
              </div>
            </div>

            <Separator />

            {/* 건강 정보 */}
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-4 w-4" /> 건강 정보
            </div>
            <div className={`p-3 rounded-xl border-2 transition-all ${editForm.hasAllergy ? 'border-amber-300 bg-amber-50/30' : 'border-muted'}`}>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="hasAllergy"
                  checked={editForm.hasAllergy}
                  onCheckedChange={(checked) => setEditForm({...editForm, hasAllergy: !!checked})}
                />
                <label htmlFor="hasAllergy" className="text-sm font-medium cursor-pointer">⚠️ 알러지 여부</label>
              </div>
              {editForm.hasAllergy && (
                <div className="mt-2 ml-7">
                  <Input
                    placeholder="알러지 상세 (예: 땅콩, 새우, 계란 등)"
                    value={editForm.allergyDescription}
                    onChange={(e) => setEditForm({...editForm, allergyDescription: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">🪷 구강검사 (연 2회 의무)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">지난 검사일</Label>
                  <Input type="date" value={editForm.lastDentalCheckDate} onChange={(e) => setEditForm({...editForm, lastDentalCheckDate: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">다음 검사 예정일</Label>
                  <Input type="date" value={editForm.nextDentalCheckDate} onChange={(e) => setEditForm({...editForm, nextDentalCheckDate: e.target.value})} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>{t('notes')}</Label>
              <Input value={editForm.note} onChange={(e) => setEditForm({...editForm, note: e.target.value})} placeholder="비고 입력" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleEditStudent} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Save className="h-4 w-4 mr-2" /> 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Student Delete Confirmation ─── */}
      <AlertDialog open={!!deleteStudentTarget} onOpenChange={(open) => !open && setDeleteStudentTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>원생 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteStudentTarget?.lastName} {deleteStudentTarget?.firstName} 원생을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500 text-white" onClick={async () => {
              if (!deleteStudentTarget) return;
              try {
                await api.delete(`/students/${deleteStudentTarget.id}`);
                toast.success('원생이 삭제되었습니다');
                setDeleteStudentTarget(null);
                setSelectedStudent(null);
                loadStudents();
                loadStats();
              } catch (err: any) {
                toast.error(err.message || '삭제 실패');
              }
            }}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Withdraw Confirmation Dialog ─── */}
      <Dialog open={!!withdrawTarget} onOpenChange={(open) => { if (!open) { setWithdrawTarget(null); setWithdrawReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <UserX className="h-5 w-5" /> 퇴원 처리
            </DialogTitle>
          </DialogHeader>
          {withdrawTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  {withdrawTarget.lastName} {withdrawTarget.firstName} ({withdrawTarget.studentCode})
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  퇴원 처리 시 모든 반 배정이 해제됩니다. 이후 수정은 불가하며 재입원만 가능합니다.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>퇴원 사유 <span className="text-red-500">*</span></Label>
                <Input
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="예: 졸업, 전원, 개인 사유 등"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWithdrawTarget(null); setWithdrawReason(''); }}>취소</Button>
            <Button
              onClick={handleWithdraw}
              disabled={!withdrawReason.trim()}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              <UserX className="h-4 w-4 mr-2" /> 퇴원 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reactivate Confirmation Dialog ─── */}
      <Dialog open={!!reactivateTarget} onOpenChange={(open) => { if (!open) { setReactivateTarget(null); setReactivateReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <RotateCcw className="h-5 w-5" /> 재입원 처리
            </DialogTitle>
          </DialogHeader>
          {reactivateTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {reactivateTarget.lastName} {reactivateTarget.firstName} ({reactivateTarget.studentCode})
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  퇴원일: {reactivateTarget.withdrawDate ? new Date(reactivateTarget.withdrawDate).toLocaleDateString() : '—'}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  재입원 시 PENDING 상태로 전환됩니다. 반 배정은 별도로 진행해 주세요.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>재입원 사유 <span className="text-red-500">*</span></Label>
                <Input
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  placeholder="예: 복원, 재등록, 전입 등"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReactivateTarget(null); setReactivateReason(''); }}>취소</Button>
            <Button
              onClick={handleReactivate}
              disabled={!reactivateReason.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> 재입원 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
