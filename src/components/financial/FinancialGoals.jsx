import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInMonths } from 'date-fns';
import { 
  Target, Plus, Trash2, Edit2,
  Calendar, TrendingUp, RotateCcw, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import FormattedNumberInput from '@/components/ui/FormattedNumberInput';

export default function FinancialGoals({ userId, monthlyDreamsSavings = 0 }) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: 0,
    current_amount: 0,
    target_date: '',
    goal_type: 'one_time',
    recurring_frequency: 'annual',
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;
  const viewingClientEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem('viewingClient') || '{}').email || null; } catch { return null; }
  })();

  const { data: goals = [] } = useQuery({
    queryKey: ['financialGoals', userId, currentUser?.id],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'FinancialGoal' });
        return response.data.data;
      }
      return base44.entities.FinancialGoal.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FinancialGoal.create({ ...data, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialGoals', userId] });
      setShowAddGoal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FinancialGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialGoals', userId] });
      setEditingGoal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FinancialGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialGoals', userId] });
    },
  });

  const resetForm = () => {
    setNewGoal({
      name: '',
      target_amount: 0,
      current_amount: 0,
      target_date: '',
      goal_type: 'one_time',
      recurring_frequency: 'annual',
    });
  };

  const calculateMonthlySavings = (goal) => {
    if (!goal.target_date) return 0;
    const monthsLeft = differenceInMonths(new Date(goal.target_date), new Date());
    if (monthsLeft <= 0) return goal.target_amount - (goal.current_amount || 0);
    const remaining = goal.target_amount - (goal.current_amount || 0);
    return Math.ceil(remaining / monthsLeft);
  };

  const getRecurringLabel = (frequency) => {
    const map = {
      monthly: 'כל חודש',
      quarterly: 'כל רבעון',
      semi_annual: 'כל חצי שנה',
      annual: 'כל שנה',
      '2_years': 'כל שנתיים',
      '3_years': 'כל 3 שנים',
      '4_years': 'כל 4 שנים',
      '5_years': 'כל 5 שנים',
    };
    return map[frequency] || frequency;
  };

  const handleSaveGoal = () => {
    const monthlySavings = calculateMonthlySavings(newGoal);
    createMutation.mutate({
      ...newGoal,
      monthly_savings_needed: monthlySavings,
    });
  };

  // Calculate total monthly savings needed for all goals
  const totalMonthlySavingsNeeded = goals.reduce((sum, goal) => {
    return sum + calculateMonthlySavings(goal);
  }, 0);

  return (
    <Card className="border-0 shadow-xl shadow-pink-100/50 bg-gradient-to-br from-rose-50/80 to-pink-50/80 backdrop-blur-sm">
      <CardHeader className="border-b border-pink-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="p-2 rounded-xl bg-pink-500/10">
              <Target className="w-5 h-5 text-pink-600" />
            </div>
            יעדים פיננסיים - חיסכון חלומות
          </CardTitle>
          <Button 
            onClick={() => setShowAddGoal(true)}
            size="sm"
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-500/30"
          >
            <Plus className="w-4 h-4 ml-1" />
            הוסף יעד
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Total Monthly Savings Summary */}
        {goals.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-pink-100 to-rose-100 rounded-2xl border border-pink-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-pink-600" />
                <span className="font-semibold text-pink-800">סה״כ חיסכון חודשי נדרש לכל היעדים:</span>
              </div>
              <span className="text-2xl font-bold text-pink-700">₪{totalMonthlySavingsNeeded.toLocaleString()}</span>
            </div>
            {monthlyDreamsSavings > 0 && (
              <div className="mt-2 text-sm">
                {totalMonthlySavingsNeeded <= monthlyDreamsSavings ? (
                  <span className="text-green-600 font-medium">✓ מכוסה מהחיסכון החודשי שלך (₪{monthlyDreamsSavings.toLocaleString()})</span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    ⚠ חסר: ₪{(totalMonthlySavingsNeeded - monthlyDreamsSavings).toLocaleString()} לחודש
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {goals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-pink-300" />
            </div>
            <p className="text-slate-600 font-medium">אין יעדים פיננסיים עדיין</p>
            <p className="text-sm text-slate-400 mt-1">הוסף יעד חדש כדי להתחיל לתכנן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = goal.target_amount > 0 
                ? Math.min(100, Math.round(((goal.current_amount || 0) / goal.target_amount) * 100))
                : 0;
              const monthlySavings = calculateMonthlySavings(goal);
              const remaining = goal.target_amount - (goal.current_amount || 0);

              return (
                <div 
                  key={goal.id}
                  className="p-5 bg-white rounded-2xl shadow-lg shadow-pink-100/50 border border-pink-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-slate-800">{goal.name}</h4>
                        {goal.goal_type === 'recurring' && (
                          <Badge className="bg-pink-100 text-pink-700 border-0">
                            <RotateCcw className="w-3 h-3 ml-1" />
                            {getRecurringLabel(goal.recurring_frequency)}
                          </Badge>
                        )}
                      </div>
                      {goal.target_date && (
                        <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          תאריך יעד: {format(new Date(goal.target_date), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEditingGoal(goal)}
                        className="hover:bg-pink-50"
                      >
                        <Edit2 className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteMutation.mutate(goal.id)}
                        className="hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">התקדמות: ₪{(goal.current_amount || 0).toLocaleString()}</span>
                      <span className="font-semibold text-slate-700">₪{goal.target_amount.toLocaleString()}</span>
                    </div>
                    <Progress value={progress} className="h-3 bg-pink-100" />
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>{progress}% הושלם</span>
                      <span>נשאר: ₪{remaining.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-pink-600" />
                      <span className="text-pink-700">
                        חיסכון חודשי נדרש: <strong>₪{monthlySavings.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">הוספת יעד חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-600">שם היעד</Label>
              <Input
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                placeholder="למשל: חופשות, שדרוג רכב, ימי הולדת ועוד..."
                className="border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600">סוג יעד</Label>
              <Select
                value={newGoal.goal_type}
                onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value })}
              >
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">חד פעמי</SelectItem>
                  <SelectItem value="recurring">קבועה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newGoal.goal_type === 'recurring' && (
              <div className="space-y-2">
                <Label className="text-slate-600">תדירות</Label>
                <Select
                  value={newGoal.recurring_frequency}
                  onValueChange={(value) => setNewGoal({ ...newGoal, recurring_frequency: value })}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">כל חודש</SelectItem>
                    <SelectItem value="quarterly">כל רבעון</SelectItem>
                    <SelectItem value="semi_annual">כל חצי שנה</SelectItem>
                    <SelectItem value="annual">כל שנה</SelectItem>
                    <SelectItem value="2_years">כל שנתיים</SelectItem>
                    <SelectItem value="3_years">כל 3 שנים</SelectItem>
                    <SelectItem value="4_years">כל 4 שנים</SelectItem>
                    <SelectItem value="5_years">כל 5 שנים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-600">סכום יעד</Label>
              <FormattedNumberInput
                value={newGoal.target_amount}
                onChange={(val) => setNewGoal({ ...newGoal, target_amount: val })}
                placeholder="הזן סכום"
                className="border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600">סכום נוכחי</Label>
              <FormattedNumberInput
                value={newGoal.current_amount}
                onChange={(val) => setNewGoal({ ...newGoal, current_amount: val })}
                placeholder="הזן סכום נוכחי"
                className="border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600">תאריך יעד</Label>
              <Input
                type="date"
                value={newGoal.target_date}
                onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                className="border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddGoal(false); resetForm(); }} className="border-slate-200">
              ביטול
            </Button>
            <Button 
              onClick={handleSaveGoal}
              className="bg-gradient-to-r from-pink-500 to-rose-500"
            >
              הוסף יעד
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">עריכת יעד</DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-600">שם היעד</Label>
                <Input
                  value={editingGoal.name}
                  onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">סכום יעד</Label>
                <FormattedNumberInput
                  value={editingGoal.target_amount}
                  onChange={(val) => setEditingGoal({ ...editingGoal, target_amount: val })}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">סכום נוכחי</Label>
                <FormattedNumberInput
                  value={editingGoal.current_amount}
                  onChange={(val) => setEditingGoal({ ...editingGoal, current_amount: val })}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">תאריך יעד</Label>
                <Input
                  type="date"
                  value={editingGoal.target_date || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, target_date: e.target.value })}
                  className="border-slate-200"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGoal(null)} className="border-slate-200">
              ביטול
            </Button>
            <Button 
              onClick={() => updateMutation.mutate({ id: editingGoal.id, data: editingGoal })}
              className="bg-gradient-to-r from-pink-500 to-rose-500"
            >
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}