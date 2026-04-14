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

  // Server-side filtering via API, no client filter needed
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
      toast.success(t('updateSuccess'));
      setIsEditOpen(false);
      loadStudents();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || t('updateFailed'));
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

      // Class assignment (after creation)
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
      toast.error(t('withdrawReason'));
      return;
    }
    try {
      setIsLoading(true);
      await api.patch(`/students/${withdrawTarget.id}/status`, {
        status: 'WITHDRAWN',
        reason: withdrawReason,
      });
      toast.success(t('withdrawSuccess'));
      setWithdrawTarget(null);
      setWithdrawReason('');
      setIsDetailOpen(false);
      loadStudents();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || t('withdrawFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateTarget || !reactivateReason.trim()) {
      toast.error(t('reactivateReason'));
      return;
    }
    try {
      setIsLoading(true);
      await api.patch(`/students/${reactivateTarget.id}/reactivate`, {
        reason: reactivateReason,
      });
      toast.success(t('reactivateSuccess'));
      setReactivateTarget(null);
      setReactivateReason('');
      setIsDetailOpen(false);
      loadStudents();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || t('reactivateFailed'));
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
        {/* Include withdrawn toggle */}
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

            {/* Class assignment */}
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
                    <Pencil className="h-3 w-3" /> {t('edit')}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => setWithdrawTarget(selectedStudent)}>
                    <UserX className="h-3 w-3" /> {t('withdraw')}
                  </Button>
                  {isOwner && (!selectedStudent._count || selectedStudent._count.billings === 0) && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteStudentTarget(selectedStudent)}>
                      <Trash2 className="h-3 w-3" /> {t('delete')}
                    </Button>
                  )}
                </div>
              )}
              {selectedStudent.status === 'WITHDRAWN' && (
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs">
                    <UserX className="h-3.5 w-3.5" />
                    {t('withdrawnDate')}: {selectedStudent.withdrawDate ? new Date(selectedStudent.withdrawDate).toLocaleDateString() : '—'}
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => setReactivateTarget(selectedStudent)}>
                    <RotateCcw className="h-3 w-3" /> {t('reactivate')}
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

              {/* ─── Class Assignment ─── */}
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
                                toast.success(t('removedFromClass'));
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

              {/* ─── Health Information ─── */}
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Stethoscope className="h-4 w-4" /> {t('healthInfo')}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span>{selectedStudent.hasAllergy ? '⚠️' : '✅'}</span>
                      <div>
                        <p className="text-sm font-medium">{t('allergy')}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedStudent.hasAllergy
                            ? selectedStudent.allergyDescription || t('allergyYes')
                            : t('allergyNo')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span>🪷</span>
                      <div>
                        <p className="text-sm font-medium">{t('dentalCheck')}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('lastCheck')}: {selectedStudent.lastDentalCheckDate
                            ? new Date(selectedStudent.lastDentalCheckDate).toLocaleDateString()
                            : t('notDone')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('nextCheck')}: {selectedStudent.nextDentalCheckDate
                            ? new Date(selectedStudent.nextDentalCheckDate).toLocaleDateString()
                            : t('notScheduled')}
                        </p>
                      </div>
                    </div>
                    {!selectedStudent.lastDentalCheckDate && (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-200">{t('notDone')}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Health Management */}
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4 text-green-600" /> {t('healthManagement')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={async () => {
                    try {
                      const dental = await api.get(`/students/${selectedStudent.id}/dental`);
                      const health = await api.get(`/students/${selectedStudent.id}/health`);
                      const info = [
                        `🦷 ${t('dentalHistory')}:`,
                        ...(dental.length > 0 ? dental.map((d: any) => `  ${d.year} R${d.round} (${new Date(d.checkDate).toLocaleDateString()}) - ${d.result || t('resultNotEntered')}${d.findings ? ` / ${d.findings}` : ''}`) : [`  ${t('noRecords')}`]),
                        '',
                        `🏥 ${t('healthCheckHistory')}:`,
                        ...(health.length > 0 ? health.map((h: any) => `  ${new Date(h.checkDate).toLocaleDateString()} - ${t('heightLabel')}:${h.heightCm || '-'}cm, ${t('weightLabel')}:${h.weightKg || '-'}kg, ${t('visionLabel')}:${h.visionLeft || '-'}/${h.visionRight || '-'}${h.findings ? ` / ${h.findings}` : ''}`) : [`  ${t('noRecords')}`]),
                      ].join('\n');
                      alert(info);
                    } catch { toast.error(t('lookupFailed')); }
                  }}>
                    <Eye className="h-3 w-3" /> {t('viewHistory')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                        <Plus className="h-3 w-3" /> {t('addRecord')}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => {
                        const year = new Date().getFullYear();
                        const round = prompt(t('roundPrompt'));
                        if (!round || (round !== '1' && round !== '2')) { toast.error(t('roundError')); return; }
                        const result = prompt(t('resultPrompt')) || '';
                        const findings = prompt(t('findingsPrompt')) || '';
                        const dentist = prompt(t('dentistPrompt')) || '';
                        api.post(`/students/${selectedStudent.id}/dental`, {
                          year, round: parseInt(round), checkDate: new Date().toISOString(),
                          result, findings, dentist,
                        }).then(() => { toast.success(t('dentalSaved')); loadStudents(); }).catch((e: any) => toast.error(e.message));
                      }}>
                        🦷 {t('dental')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const heightCm = prompt(t('heightPrompt'));
                        const weightKg = prompt(t('weightPrompt'));
                        const visionLeft = prompt(t('visionLeftPrompt')) || '';
                        const visionRight = prompt(t('visionRightPrompt')) || '';
                        const bloodType = prompt(t('bloodTypePrompt')) || '';
                        const findings = prompt(t('findingsPrompt')) || '';
                        api.post(`/students/${selectedStudent.id}/health`, {
                          checkDate: new Date().toISOString(),
                          heightCm: heightCm ? parseFloat(heightCm) : undefined,
                          weightKg: weightKg ? parseFloat(weightKg) : undefined,
                          visionLeft, visionRight, bloodType, findings,
                        }).then(() => { toast.success(t('healthSaved')); }).catch((e: any) => toast.error(e.message));
                      }}>
                        🏥 {t('healthCheck')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Withdrawn student banner */}
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
                        if (alreadyAssigned) return; // Prevent duplicate
                        try {
                          await api.post(`/classes/${cls.id}/students`, { studentId: selectedStudent.id });
                          setSelectedStudent(prev => prev ? { ...prev, classStudents: [...prev.classStudents, { class: cls }] } : null);
                          toast.success(t('assignedToClass', { name: cls.name }));
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
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200">{t('assignedCheck')}</Badge>
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
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> {t('editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm font-medium text-muted-foreground">{t('basicInfo')}</div>
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

            {/* Health Information */}
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-4 w-4" /> {t('healthInfo')}
            </div>
            <div className={`p-3 rounded-xl border-2 transition-all ${editForm.hasAllergy ? 'border-amber-300 bg-amber-50/30' : 'border-muted'}`}>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="hasAllergy"
                  checked={editForm.hasAllergy}
                  onCheckedChange={(checked) => setEditForm({...editForm, hasAllergy: !!checked})}
                />
                <label htmlFor="hasAllergy" className="text-sm font-medium cursor-pointer">⚠️ {t('allergyLabel')}</label>
              </div>
              {editForm.hasAllergy && (
                <div className="mt-2 ml-7">
                  <Input
                    placeholder={t('allergyPlaceholder')}
                    value={editForm.allergyDescription}
                    onChange={(e) => setEditForm({...editForm, allergyDescription: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">🪷 {t('dentalCheck')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('lastCheckDate')}</Label>
                  <Input type="date" value={editForm.lastDentalCheckDate} onChange={(e) => setEditForm({...editForm, lastDentalCheckDate: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('nextCheckDate')}</Label>
                  <Input type="date" value={editForm.nextDentalCheckDate} onChange={(e) => setEditForm({...editForm, nextDentalCheckDate: e.target.value})} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>{t('notes')}</Label>
              <Input value={editForm.note} onChange={(e) => setEditForm({...editForm, note: e.target.value})} placeholder={t('notesPlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleEditStudent} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Save className="h-4 w-4 mr-2" /> {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Student Delete Confirmation ─── */}
      <AlertDialog open={!!deleteStudentTarget} onOpenChange={(open) => !open && setDeleteStudentTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDesc', { name: `${deleteStudentTarget?.lastName} ${deleteStudentTarget?.firstName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500 text-white" onClick={async () => {
              if (!deleteStudentTarget) return;
              try {
                await api.delete(`/students/${deleteStudentTarget.id}`);
                toast.success(t('deleteSuccess'));
                setDeleteStudentTarget(null);
                setSelectedStudent(null);
                loadStudents();
                loadStats();
              } catch (err: any) {
                toast.error(err.message || t('deleteFailed'));
              }
            }}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Withdraw Confirmation Dialog ─── */}
      <Dialog open={!!withdrawTarget} onOpenChange={(open) => { if (!open) { setWithdrawTarget(null); setWithdrawReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <UserX className="h-5 w-5" /> {t('withdraw')}
            </DialogTitle>
          </DialogHeader>
          {withdrawTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  {withdrawTarget.lastName} {withdrawTarget.firstName} ({withdrawTarget.studentCode})
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {t('withdrawNotice')}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('withdrawReasonLabel')} <span className="text-red-500">*</span></Label>
                <Input
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder={t('withdrawReasonPlaceholder')}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWithdrawTarget(null); setWithdrawReason(''); }}>{t('cancel')}</Button>
            <Button
              onClick={handleWithdraw}
              disabled={!withdrawReason.trim()}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              <UserX className="h-4 w-4 mr-2" /> {t('withdraw')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reactivate Confirmation Dialog ─── */}
      <Dialog open={!!reactivateTarget} onOpenChange={(open) => { if (!open) { setReactivateTarget(null); setReactivateReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <RotateCcw className="h-5 w-5" /> {t('reactivateTitle')}
            </DialogTitle>
          </DialogHeader>
          {reactivateTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {reactivateTarget.lastName} {reactivateTarget.firstName} ({reactivateTarget.studentCode})
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {t('withdrawnDate')}: {reactivateTarget.withdrawDate ? new Date(reactivateTarget.withdrawDate).toLocaleDateString() : '—'}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {t('reactivateNotice')}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('reactivateReasonLabel')} <span className="text-red-500">*</span></Label>
                <Input
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  placeholder={t('reactivateReasonPlaceholder')}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReactivateTarget(null); setReactivateReason(''); }}>{t('cancel')}</Button>
            <Button
              onClick={handleReactivate}
              disabled={!reactivateReason.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> {t('reactivateTitle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
