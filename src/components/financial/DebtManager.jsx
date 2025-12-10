import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, TrendingDown, Plus, Trash2, 
  Edit, Target, AlertCircle, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DebtManager({ userId }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const [debtForm, setDebtForm] = useState({
    name: '',
    type: 'loan',
    total_amount: 0,
    remaining_amount: 0,
    interest_rate: 0,
    minimum_payment: 0,
    current_payment: 0,
    payoff_strategy: 'avalanche'
  });

  const queryClient = useQueryClient();

  const { data: debts = [] } = useQuery({
    queryKey: ['debts', userId],
    queryFn: () => base44.entities.Debt.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Debt.create({ ...data, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', userId] });
      resetForm();
      setShowAddDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Debt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', userId] });
      resetForm();
      setShowAddDialog(false);
      setEditingDebt(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Debt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', userId] });
    },
  });

  const resetForm = () => {
    setDebtForm({
      name: '',
      type: 'loan',
      total_amount: 0,
      remaining_amount: 0,
      interest_rate: 0,
      minimum_payment: 0,
      current_payment: 0,
      payoff_strategy: 'avalanche'
    });
  };

  const handleSubmit = () => {
    if (editingDebt) {
      updateMutation.mutate({ id: editingDebt.id, data: debtForm });
    } else {
      createMutation.mutate(debtForm);
    }
  };

  const handleEdit = (debt) => {
    setEditingDebt(debt);
    setDebtForm(debt);
    setShowAddDialog(true);
  };

  // Calculations
  const totalDebt = debts.reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
  const totalCurrentPayment = debts.reduce((sum, d) => sum + (d.current_payment || 0), 0);
  const avgInterest = debts.length > 0 
    ? debts.reduce((sum, d) => sum + (d.interest_rate || 0), 0) / debts.length 
    : 0;

  // Strategy recommendations
  const getPayoffStrategy = () => {
    const snowballOrder = [...debts].sort((a, b) => a.remaining_amount - b.remaining_amount);
    const avalancheOrder = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
    
    return {
      snowball: snowballOrder,
      avalanche: avalancheOrder
    };
  };

  const strategies = getPayoffStrategy();

  const getDebtTypeLabel = (type) => {
    const labels = {
      loan: 'הלוואה',
      credit_card: 'כרטיס אשראי',
      mortgage: 'משכנתא',
      other: 'אחר'
    };
    return labels[type] || type;
  };

  const getDebtTypeColor = (type) => {
    const colors = {
      loan: 'bg-blue-100 text-blue-700',
      credit_card: 'bg-red-100 text-red-700',
      mortgage: 'bg-purple-100 text-purple-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#105330]">ניהול חובות</h2>
          <p className="text-[#105330]/70">מעקב ואסטרטגיות פירעון חובות</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setEditingDebt(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#105330] hover:bg-[#0d4027]">
              <Plus className="w-4 h-4 ml-2" />
              הוסף חוב
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDebt ? 'עריכת חוב' : 'הוספת חוב חדש'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>שם החוב</Label>
                <Input
                  value={debtForm.name}
                  onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })}
                  placeholder="לדוגמה: ביטוח חיים"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>סוג החוב</Label>
                  <Select value={debtForm.type} onValueChange={(v) => setDebtForm({ ...debtForm, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loan">הלוואה</SelectItem>
                      <SelectItem value="credit_card">כרטיס אשראי</SelectItem>
                      <SelectItem value="mortgage">משכנתא</SelectItem>
                      <SelectItem value="other">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ריבית שנתית (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={debtForm.interest_rate || ''}
                    onChange={(e) => setDebtForm({ ...debtForm, interest_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="5.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>סכום כולל</Label>
                  <Input
                    type="number"
                    value={debtForm.total_amount || ''}
                    onChange={(e) => setDebtForm({ ...debtForm, total_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="100000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>יתרה נוכחית</Label>
                  <Input
                    type="number"
                    value={debtForm.remaining_amount || ''}
                    onChange={(e) => setDebtForm({ ...debtForm, remaining_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="80000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תשלום מינימום</Label>
                  <Input
                    type="number"
                    value={debtForm.minimum_payment || ''}
                    onChange={(e) => setDebtForm({ ...debtForm, minimum_payment: parseFloat(e.target.value) || 0 })}
                    placeholder="2000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>תשלום חודשי</Label>
                  <Input
                    type="number"
                    value={debtForm.current_payment || ''}
                    onChange={(e) => setDebtForm({ ...debtForm, current_payment: parseFloat(e.target.value) || 0 })}
                    placeholder="2500"
                  />
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full bg-[#105330] hover:bg-[#0d4027]">
                {editingDebt ? 'עדכן' : 'הוסף'} חוב
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Debt Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2 border-red-300 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-600">סך החובות</p>
                <p className="text-xl font-bold text-red-700">₪{totalDebt.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-300 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600">ריבית ממוצעת</p>
                <p className="text-xl font-bold text-orange-700">{avgInterest.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600">תשלום נוכחי</p>
                <p className="text-xl font-bold text-green-700">₪{totalCurrentPayment.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Strategy Recommendations */}
      {debts.length > 0 && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-[#c8a863]/10 to-[#105330]/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[#105330]">
                <Sparkles className="w-5 h-5 text-[#c8a863]" />
                אסטרטגיות פירעון מומלצות
              </CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setShowStrategyDialog(true)}
                className="border-[#105330] text-[#105330]"
              >
                הצג המלצות מפורטות
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border-2 border-blue-200">
                <h3 className="font-bold text-blue-700 mb-2">🏔️ שיטת האבלנץ׳ (Avalanche)</h3>
                <p className="text-sm text-gray-600 mb-3">התמקדות בחובות עם הריבית הגבוהה ביותר - חוסך כסף לאורך זמן</p>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">סדר פירעון מומלץ:</p>
                  {strategies.avalanche.slice(0, 3).map((debt, idx) => (
                    <div key={debt.id} className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-blue-600">{idx + 1}.</span>
                      <span className="text-gray-700">{debt.name}</span>
                      <Badge className="bg-red-100 text-red-700 text-xs">{debt.interest_rate}%</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border-2 border-green-200">
                <h3 className="font-bold text-green-700 mb-2">⛄ שיטת כדור השלג (Snowball)</h3>
                <p className="text-sm text-gray-600 mb-3">התמקדות בחובות הקטנים ביותר - מוטיבציה ומומנטום</p>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">סדר פירעון מומלץ:</p>
                  {strategies.snowball.slice(0, 3).map((debt, idx) => (
                    <div key={debt.id} className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-green-600">{idx + 1}.</span>
                      <span className="text-gray-700">{debt.name}</span>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">₪{debt.remaining_amount.toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debts List */}
      {debts.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[#105330] mb-2">אין חובות רשומים</h3>
            <p className="text-[#105330]/70">הוסף חוב כדי לעקוב אחר תהליך הפירעון</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {debts.map((debt) => {
            const progress = debt.total_amount > 0 
              ? Math.round(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100)
              : 0;
            const monthsToPayoff = debt.current_payment > 0
              ? Math.ceil(debt.remaining_amount / debt.current_payment)
              : 0;

            return (
              <Card key={debt.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-[#105330]">{debt.name}</h3>
                        <Badge className={getDebtTypeColor(debt.type)}>
                          {getDebtTypeLabel(debt.type)}
                        </Badge>
                        <Badge className="bg-red-100 text-red-700">ריבית: {debt.interest_rate}%</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>יתרה: <strong className="text-red-600">₪{debt.remaining_amount.toLocaleString()}</strong></span>
                        <span>מתוך: ₪{debt.total_amount.toLocaleString()}</span>
                        <span>תשלום חודשי: <strong>₪{(debt.current_payment || 0).toLocaleString()}</strong></span>
                        {monthsToPayoff > 0 && (
                          <span className="text-green-600">פירעון תוך {monthsToPayoff} חודשים</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(debt)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteMutation.mutate(debt.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">התקדמות פירעון</span>
                      <span className="font-bold text-green-600">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Strategy Dialog */}
      <Dialog open={showStrategyDialog} onOpenChange={setShowStrategyDialog}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>אסטרטגיות פירעון מומלצות</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                שיטת האבלנץ׳ (Avalanche) - מומלצת לחיסכון מקסימלי
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                שלם את המינימום על כל החובות, והשאר הכנס לחוב עם הריבית הגבוהה ביותר. שיטה זו חוסכת הכי הרבה כסף בריבית לאורך זמן.
              </p>
              <div className="space-y-2">
                {strategies.avalanche.map((debt, idx) => (
                  <div key={debt.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-600 text-lg">{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-800">{debt.name}</p>
                        <p className="text-xs text-gray-500">יתרה: ₪{debt.remaining_amount.toLocaleString()}</p>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-700">ריבית: {debt.interest_rate}%</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                <Target className="w-5 h-5" />
                שיטת כדור השלג (Snowball) - מומלצת למוטיבציה
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                שלם את המינימום על כל החובות, והשאר הכנס לחוב הכי קטן. כל חוב שנפרע מעניק תחושת הישג ומוטיבציה להמשיך.
              </p>
              <div className="space-y-2">
                {strategies.snowball.map((debt, idx) => (
                  <div key={debt.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-600 text-lg">{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-800">{debt.name}</p>
                        <p className="text-xs text-gray-500">ריבית: {debt.interest_rate}%</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">₪{debt.remaining_amount.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="font-bold text-amber-700 mb-2">💡 טיפים נוספים</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• שקול איחוד חובות אם יש לך מספר חובות עם ריבית גבוהה</li>
                <li>• בדוק אפשרויות למימון מחדש בריבית נמוכה יותר</li>
                <li>• הגדל תשלומים חודשיים אפילו בסכומים קטנים - זה מקצר משמעותית את זמן הפירעון</li>
                <li>• צור קרן חירום קטנה (₪5,000-10,000) כדי למנוע חובות חדשים</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}