'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Users, GraduationCap, UserPlus, X, ArrowRightLeft, Loader2, Pencil, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

interface ClassData {
  id: string;
  name: string;
  classType: string;
  description: string | null;
  capacity: number;
  isActive: boolean;
  studentCount: number;
  students: Array<{ id: string; name: string; code: string }>;
  teachers: Array<{ id: string; name: string; isPrimary: boolean }>;
}

interface StudentListItem {
  id: string;
  name: string;
  code: string;
  programType: string;
}

interface TeacherItem {
  id: string;
  name: string;
  email: string;
}

export default function ClassesPage() {
  const t = useTranslations('classes');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const { user } = useAuth();
  const isOwner = user?.role?.code === 'OWNER';
  const [allStudents, setAllStudents] = useState<StudentListItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', classType: 'KINDERGARTEN', description: '', capacity: '20',
  });
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [allTeachers, setAllTeachers] = useState<TeacherItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', classType: 'KINDERGARTEN', description: '', capacity: '20' });
  const [deleteTarget, setDeleteTarget] = useState<ClassData | null>(null);

  // ─── Load data from API ───
  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.get<any[]>('/classes');
      const mapped: ClassData[] = result.map((c: any) => ({
        id: c.id,
        name: c.name,
        classType: c.classType,
        description: c.description,
        capacity: c.capacity,
        isActive: c.isActive,
        studentCount: c._count?.students ?? c.students?.length ?? 0,
        students: (c.students || []).map((cs: any) => ({
          id: cs.student.id,
          name: `${cs.student.lastName || ''} ${cs.student.firstName || ''}`.trim(),
          code: cs.student.studentCode,
        })),
        teachers: (c.teachers || []).map((ta: any) => ({
          id: ta.user.id,
          name: ta.user.name,
          isPrimary: ta.isPrimary,
        })),
      }));
      setClasses(mapped);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const result = await api.get<{ data: any[] }>('/students', { limit: 100 });
      setAllStudents(result.data.map((s: any) => ({
        id: s.id,
        name: `${s.lastName || ''} ${s.firstName || ''}`.trim(),
        code: s.studentCode,
        programType: s.programType,
      })));
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }, []);

  const loadTeachers = useCallback(async () => {
    try {
      const result = await api.get<any[]>('/users');
      setAllTeachers(result.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      })));
    } catch (err) {
      console.error('Failed to load teachers:', err);
    }
  }, []);

  useEffect(() => {
    loadClasses();
    loadStudents();
    loadTeachers();
  }, [loadClasses, loadStudents, loadTeachers]);

  const filteredClasses = classes.filter(c =>
    typeFilter === 'ALL' || c.classType === typeFilter
  );

  const kindergartenClasses = classes.filter(c => c.classType === 'KINDERGARTEN');
  const academyClasses = classes.filter(c => c.classType === 'ACADEMY');
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);

  const handleCreate = async () => {
    if (!form.name) {
      toast.error('Class name is required');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/classes', {
        name: form.name,
        classType: form.classType,
        description: form.description || undefined,
        capacity: parseInt(form.capacity) || 20,
      });
      setIsCreateOpen(false);
      setForm({ name: '', classType: 'KINDERGARTEN', description: '', capacity: '20' });
      toast.success(t('createSuccess'));
      loadClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create class');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditMode = (cls: ClassData) => {
    setEditForm({
      name: cls.name,
      classType: cls.classType,
      description: cls.description || '',
      capacity: String(cls.capacity),
    });
    setIsEditing(true);
  };

  const handleEditClass = async () => {
    if (!selectedClass || !editForm.name) {
      toast.error('반 이름은 필수입니다');
      return;
    }
    try {
      setIsLoading(true);
      await api.put(`/classes/${selectedClass.id}`, {
        name: editForm.name,
        classType: editForm.classType,
        description: editForm.description || undefined,
        capacity: parseInt(editForm.capacity) || 20,
      });
      toast.success('반 정보가 수정되었습니다');
      setIsEditing(false);
      setSelectedClass(null);
      loadClasses();
    } catch (err: any) {
      toast.error(err.message || '반 수정에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const typeBg = (type: string) =>
    type === 'KINDERGARTEN'
      ? 'from-violet-500 to-purple-600'
      : 'from-cyan-500 to-blue-600';

  const typeIcon = (type: string) =>
    type === 'KINDERGARTEN' ? '🎨' : '📚';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
          {t('addClass')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('totalClasses')}</p>
            <p className="text-2xl font-bold mt-1">{classes.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('kindergartenClasses')}</p>
            <p className="text-2xl font-bold mt-1 text-violet-600">{kindergartenClasses.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('academyClasses')}</p>
            <p className="text-2xl font-bold mt-1 text-cyan-600">{academyClasses.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{t('totalEnrolled')}</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{totalStudents}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['ALL', 'KINDERGARTEN', 'ACADEMY'].map((type) => (
          <Button
            key={type}
            variant={typeFilter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(type)}
            className={typeFilter === type ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : ''}
          >
            {type === 'ALL' ? t('all') : t(type.toLowerCase())}
          </Button>
        ))}
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((cls) => (
          <Card
            key={cls.id}
            className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
            onClick={() => setSelectedClass(cls)}
          >
            {/* Color top bar */}
            <div className={`h-1.5 bg-gradient-to-r ${typeBg(cls.classType)}`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{typeIcon(cls.classType)}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{cls.name}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {t(cls.classType.toLowerCase())}
                    </Badge>
                  </div>
                </div>
                {!cls.isActive && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                    Inactive
                  </Badge>
                )}
              </div>

              {cls.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{cls.description}</p>
              )}

              {/* Capacity bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{t('capacity')}</span>
                  <span>{cls.studentCount} / {cls.capacity}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${
                      cls.studentCount / cls.capacity > 0.9
                        ? 'from-red-500 to-orange-500'
                        : cls.studentCount / cls.capacity > 0.7
                        ? 'from-amber-500 to-yellow-500'
                        : 'from-emerald-500 to-green-500'
                    } transition-all`}
                    style={{ width: `${Math.min(100, (cls.studentCount / cls.capacity) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Teachers */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>{cls.teachers.map(t => t.name).join(', ') || 'No teacher'}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{cls.studentCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Class Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addClass')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('className')}</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Sunshine" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('classType')}</Label>
              <Select value={form.classType} onValueChange={(v: string) => setForm({...form, classType: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KINDERGARTEN">{t('kindergarten')}</SelectItem>
                  <SelectItem value="ACADEMY">{t('academy')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('descriptionLabel')}</Label>
              <Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('capacity')}</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({...form, capacity: e.target.value})} />
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

      {/* Class Detail Dialog */}
      <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedClass?.name}</DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-4 py-2">
              {/* 수정 모드 / 보기 모드 */}
              {isEditing ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t('className')}</Label>
                    <Input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('classType')}</Label>
                    <Select value={editForm.classType} onValueChange={(v: string) => setEditForm({...editForm, classType: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KINDERGARTEN">{t('kindergarten')}</SelectItem>
                        <SelectItem value="ACADEMY">{t('academy')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('descriptionLabel')}</Label>
                    <Input value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('capacity')}</Label>
                    <Input type="number" value={editForm.capacity} onChange={(e) => setEditForm({...editForm, capacity: e.target.value})} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="flex-1">{t('cancel')}</Button>
                    <Button size="sm" onClick={handleEditClass} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
                      <Save className="h-3.5 w-3.5 mr-1" /> 저장
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t(selectedClass.classType.toLowerCase())}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {selectedClass.studentCount} / {selectedClass.capacity} {t('students')}
                    </span>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 ml-auto" onClick={() => openEditMode(selectedClass)}>
                      <Pencil className="h-3 w-3" /> 수정
                    </Button>
                    {isOwner && selectedClass.studentCount === 0 && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteTarget(selectedClass)}>
                        <Trash2 className="h-3 w-3" /> 삭제
                      </Button>
                    )}
                  </div>

                  {selectedClass.description && (
                    <p className="text-sm text-muted-foreground">{selectedClass.description}</p>
                  )}
                </>
              )}

              {/* Teachers Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" /> {t('teachers')}
                  </h4>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddTeacher(true)}>
                    <UserPlus className="h-3 w-3" /> 교사 배정
                  </Button>
                </div>
                {selectedClass.teachers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClass.teachers.map((teacher) => (
                      <div key={teacher.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-medium">
                            {teacher.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium">{teacher.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {teacher.isPrimary && (
                            <Badge variant="outline" className="text-xs">Primary</Badge>
                          )}
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                await api.delete(`/classes/${selectedClass.id}/teachers/${teacher.id}`);
                                setSelectedClass(prev => prev ? {
                                  ...prev,
                                  teachers: prev.teachers.filter(t => t.id !== teacher.id),
                                } : null);
                                toast.success(`${teacher.name} 교사 해제됨`);
                                loadClasses();
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to remove teacher');
                              }
                            }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('noTeachers')}</p>
                )}
              </div>

              {/* Students Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {t('enrolledStudents')}
                  </h4>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddStudent(true)}>
                    <UserPlus className="h-3 w-3" /> {t('addStudent')}
                  </Button>
                </div>
                {selectedClass.students.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedClass.students.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                        <div>
                          <span className="text-sm font-medium">{student.name}</span>
                          <span className="text-xs text-muted-foreground font-mono ml-2">{student.code}</span>
                        </div>
                        <Button size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            try {
                              await api.delete(`/classes/${selectedClass.id}/students/${student.id}`);
                              setSelectedClass(prev => prev ? {
                                ...prev,
                                students: prev.students.filter(s => s.id !== student.id),
                                studentCount: prev.studentCount - 1,
                              } : null);
                              toast.success(`${student.name} 제외됨`);
                              loadClasses();
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to remove student');
                            }
                          }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('noStudentsInClass')}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Add Student to Class Dialog ─── */}
      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> {selectedClass?.name} — 원생 추가
            </DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-2 py-2">
              {allStudents.map(student => {
                const alreadyIn = selectedClass.students.some(s => s.id === student.id);
                return (
                  <div key={student.id}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      alreadyIn ? 'border-emerald-300 bg-emerald-50/30 opacity-60' : 'border-muted hover:border-indigo-300 cursor-pointer hover:bg-indigo-50/20'
                    }`}
                    onClick={async () => {
                      if (alreadyIn) return;
                      try {
                        await api.post(`/classes/${selectedClass.id}/students`, { studentId: student.id });
                        setSelectedClass(prev => prev ? {
                          ...prev,
                          students: [...prev.students, { id: student.id, name: student.name, code: student.code }],
                          studentCount: prev.studentCount + 1,
                        } : null);
                        toast.success(`${student.name} → ${selectedClass.name} 배정됨`);
                        setShowAddStudent(false);
                        loadClasses();
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to assign student');
                      }
                    }}>
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.code}</p>
                    </div>
                    {alreadyIn ? (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200">배정됨 ✓</Badge>
                    ) : (
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStudent(false)}>{t('cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Teacher to Class Dialog ─── */}
      <Dialog open={showAddTeacher} onOpenChange={setShowAddTeacher}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> {selectedClass?.name} — 교사 배정
            </DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto">
              {allTeachers.map(teacher => {
                const alreadyAssigned = selectedClass.teachers.some(t => t.id === teacher.id);
                return (
                  <div key={teacher.id}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      alreadyAssigned ? 'border-emerald-300 bg-emerald-50/30 opacity-60' : 'border-muted hover:border-indigo-300 cursor-pointer hover:bg-indigo-50/20'
                    }`}
                    onClick={async () => {
                      if (alreadyAssigned) return;
                      try {
                        await api.post(`/classes/${selectedClass.id}/teachers`, { userId: teacher.id, isPrimary: selectedClass.teachers.length === 0 });
                        setSelectedClass(prev => prev ? {
                          ...prev,
                          teachers: [...prev.teachers, { id: teacher.id, name: teacher.name, isPrimary: prev.teachers.length === 0 }],
                        } : null);
                        toast.success(`${teacher.name} → ${selectedClass.name} 교사 배정됨`);
                        setShowAddTeacher(false);
                        loadClasses();
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to assign teacher');
                      }
                    }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-medium">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{teacher.name}</p>
                          <p className="text-xs text-muted-foreground">{teacher.email}</p>
                        </div>
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTeacher(false)}>{t('cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─── Delete Confirmation AlertDialog ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>반 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; 반을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500 text-white" onClick={async () => {
              if (!deleteTarget) return;
              try {
                await api.delete(`/classes/${deleteTarget.id}`);
                toast.success('반이 삭제되었습니다');
                setDeleteTarget(null);
                setSelectedClass(null);
                loadClasses();
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
