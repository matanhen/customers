import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Trash2, Edit2, TrendingUp, TrendingDown,
  DollarSign, Check, Lightbulb, Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function PortfolioManager({ userId }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [stockToDelete, setStockToDelete] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [newStock, setNewStock] = useState({
    name: '',
    quantity: 0,
    current_price: 0,
    target_percentage: 0,
  });
  const [portfolioSettings, setPortfolioSettings] = useState({
    uninvested_cash: 0,
    monthly_deposit: 0,
  });

  const queryClient = useQueryClient();

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const { data: investments = [] } = useQuery({
    queryKey: ['investments', userId, currentUser?.id, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, entityName: 'Investment' });
        return response.data.data;
      }
      return base44.entities.Investment.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
  });

  const { data: settings } = useQuery({
    queryKey: ['portfolioSettings', userId, currentUser?.id, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, entityName: 'PortfolioSettings' });
        return response.data.data?.[0];
      }
      const results = await base44.entities.PortfolioSettings.filter({ user_id: userId });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
  });

  useEffect(() => {
    if (settings) {
      setPortfolioSettings({
        uninvested_cash: settings.uninvested_cash || 0,
        monthly_deposit: settings.monthly_deposit || 0,
      });
    }
  }, [settings]);

  const createInvestmentMutation = useMutation({
    mutationFn: async (data) => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('saveClientData', { entityName: 'Investment', clientUserId: userId, data: { ...data, user_id: userId }, recordId: null });
        return response.data;
      }
      return base44.entities.Investment.create({ ...data, user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments', userId, currentUser?.id] });
      setShowAddStock(false);
      setNewStock({ name: '', quantity: 0, current_price: 0, target_percentage: 0 });
    },
  });

  const updateInvestmentMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('saveClientData', { entityName: 'Investment', clientUserId: userId, data: { ...data, user_id: userId }, recordId: id });
        return response.data;
      }
      return base44.entities.Investment.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments', userId, currentUser?.id] });
      setEditingStock(null);
    },
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: (id) => base44.entities.Investment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments', userId, currentUser?.id] });
      setStockToDelete(null);
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('saveClientData', { entityName: 'PortfolioSettings', clientUserId: userId, data: { ...data, user_id: userId }, recordId: settings?.id || null });
        return response.data;
      }
      if (settings) {
        return base44.entities.PortfolioSettings.update(settings.id, data);
      }
      return base44.entities.PortfolioSettings.create({ ...data, user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolioSettings', userId, currentUser?.id] });
    },
  });

  const totalValue = investments.reduce((sum, inv) => sum + (inv.quantity || 0) * (inv.current_price || 0), 0);
  const totalWithCash = totalValue + portfolioSettings.uninvested_cash;
  
  // Calculate total target percentage
  const totalTargetPercentage = investments.reduce((sum, inv) => sum + (inv.target_percentage || 0), 0);

  const getStockPercentage = (stock) => {
    if (totalWithCash === 0) return 0;
    const value = (stock.quantity || 0) * (stock.current_price || 0);
    return Math.round((value / totalWithCash) * 100 * 10) / 10;
  };

  const calculateRecommendations = () => {
    const availableCash = portfolioSettings.uninvested_cash + portfolioSettings.monthly_deposit;
    let remainingCash = availableCash;
    const recommendations = [];
    
    const stocksWithGap = investments.map(stock => {
      const currentValue = (stock.quantity || 0) * (stock.current_price || 0);
      const currentPercent = totalWithCash > 0 ? (currentValue / totalWithCash) * 100 : 0;
      const gap = (stock.target_percentage || 0) - currentPercent;
      return { ...stock, currentPercent, gap };
    }).sort((a, b) => b.gap - a.gap);

    for (const stock of stocksWithGap) {
      if (stock.gap <= 0 || remainingCash <= 0 || !stock.current_price) continue;

      const targetValueIncrease = (stock.gap / 100) * totalWithCash;
      const maxShares = Math.floor(Math.min(targetValueIncrease, remainingCash) / stock.current_price);
      
      if (maxShares > 0) {
        const cost = maxShares * stock.current_price;
        remainingCash -= cost;
        
        const newQuantity = (stock.quantity || 0) + maxShares;
        const newValue = newQuantity * stock.current_price;
        const newTotalValue = totalWithCash + availableCash;
        const newPercent = (newValue / newTotalValue) * 100;

        recommendations.push({
          ...stock,
          sharesToBuy: maxShares,
          cost,
          newQuantity,
          newPercent: Math.round(newPercent * 10) / 10,
        });
      }
    }

    return { recommendations, remainingCash: Math.round(remainingCash) };
  };

  const { recommendations, remainingCash } = calculateRecommendations();

  const applyRecommendations = () => {
    recommendations.forEach(rec => {
      updateInvestmentMutation.mutate({
        id: rec.id,
        data: { quantity: rec.newQuantity },
      });
    });

    // Reset monthly_deposit to 0 after applying recommendations
    saveSettingsMutation.mutate({
      ...portfolioSettings,
      uninvested_cash: remainingCash,
      monthly_deposit: 0,
    });

    setShowRecommendations(false);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-xl shadow-blue-100/50 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">שווי תיק</p>
                <p className="text-2xl font-bold text-blue-700">₪{totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-emerald-100/50 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10">
                <Wallet className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-emerald-600 font-medium">מזומן לא מושקע</p>
                <Input
                  type="number"
                  value={portfolioSettings.uninvested_cash || ''}
                  onChange={(e) => setPortfolioSettings({ ...portfolioSettings, uninvested_cash: parseFloat(e.target.value) || 0 })}
                  onBlur={() => saveSettingsMutation.mutate(portfolioSettings)}
                  className="mt-1 text-lg font-bold border-emerald-200 bg-white/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-purple-100/50 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/10">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-purple-600 font-medium">הפקדה חודשית</p>
                <Input
                  type="number"
                  value={portfolioSettings.monthly_deposit || ''}
                  onChange={(e) => setPortfolioSettings({ ...portfolioSettings, monthly_deposit: parseFloat(e.target.value) || 0 })}
                  onBlur={() => saveSettingsMutation.mutate(portfolioSettings)}
                  className="mt-1 text-lg font-bold border-purple-200 bg-white/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Percentage Summary */}
      {investments.length > 0 && (
        <Card className={`border-2 ${totalTargetPercentage === 100 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${totalTargetPercentage === 100 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {totalTargetPercentage === 100 ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div>
                  <p className={`font-bold text-lg ${totalTargetPercentage === 100 ? 'text-green-700' : 'text-red-700'}`}>
                    סה״כ אחוז מטרה: {totalTargetPercentage}%
                  </p>
                  <p className={`text-sm ${totalTargetPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalTargetPercentage === 100 
                      ? '✓ התיק מאוזן - סה״כ 100%' 
                      : totalTargetPercentage > 100 
                        ? `⚠️ חריגה של ${totalTargetPercentage - 100}% - יש להפחית אחוזי מטרה`
                        : `⚠️ חוסר של ${100 - totalTargetPercentage}% - יש להוסיף אחוזי מטרה`
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          onClick={() => setShowAddStock(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30"
        >
          <Plus className="w-4 h-4 ml-2" />
          הוסף נייר ערך
        </Button>
        {investments.length > 0 && (portfolioSettings.monthly_deposit > 0 || portfolioSettings.uninvested_cash > 0) && (
          <Button 
            onClick={() => setShowRecommendations(true)}
            variant="outline"
            className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
          >
            <Lightbulb className="w-4 h-4 ml-2" />
            המלצות לקנייה
          </Button>
        )}
      </div>

      {/* Stocks List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investments.map((stock) => {
          const value = (stock.quantity || 0) * (stock.current_price || 0);
          const currentPercent = getStockPercentage(stock);
          const gap = currentPercent - (stock.target_percentage || 0);
          const isOverTarget = gap > 0;
          const isUnderTarget = gap < 0;

          return (
            <Card key={stock.id} className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
              <div className={`h-1.5 ${isOverTarget ? 'bg-gradient-to-r from-red-400 to-rose-400' : isUnderTarget ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-blue-400 to-indigo-400'}`} />
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-slate-800">{stock.name}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingStock(stock)} className="hover:bg-slate-100">
                      <Edit2 className="w-4 h-4 text-slate-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setStockToDelete(stock)} className="hover:bg-red-50">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">כמות:</span>
                    <span className="font-medium text-slate-700">{stock.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">מחיר:</span>
                    <span className="font-medium text-slate-700">₪{stock.current_price?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">שווי:</span>
                    <span className="font-bold text-blue-600">₪{value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">אחוז בתיק:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{currentPercent}%</span>
                      {isOverTarget && (
                        <Badge className="bg-red-100 text-red-700 border-0">
                          <TrendingDown className="w-3 h-3 ml-1" />
                          {Math.abs(gap).toFixed(1)}%
                        </Badge>
                      )}
                      {isUnderTarget && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">
                          <TrendingUp className="w-3 h-3 ml-1" />
                          {Math.abs(gap).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">אחוז מטרה:</span>
                    <span className="font-medium text-indigo-600">{stock.target_percentage}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {investments.length === 0 && (
        <Card className="p-12 text-center border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">אין ניירות ערך בתיק</h3>
          <p className="text-slate-500 mb-4">הוסף ניירות ערך כדי להתחיל לנהל את התיק</p>
          <Button onClick={() => setShowAddStock(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="w-4 h-4 ml-2" />
            הוסף נייר ערך ראשון
          </Button>
        </Card>
      )}

      {/* Add Stock Dialog */}
      <Dialog open={showAddStock} onOpenChange={setShowAddStock}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">הוספת נייר ערך</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-600">שם נייר ערך</Label>
              <Input
                value={newStock.name}
                onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                placeholder="הזן שם נייר"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600">כמות</Label>
              <Input
                type="number"
                value={newStock.quantity || ''}
                onChange={(e) => setNewStock({ ...newStock, quantity: parseFloat(e.target.value) || 0 })}
                placeholder="כמות יחידות"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600">מחיר נוכחי</Label>
              <Input
                type="number"
                value={newStock.current_price || ''}
                onChange={(e) => setNewStock({ ...newStock, current_price: parseFloat(e.target.value) || 0 })}
                placeholder="מחיר ליחידה"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600">אחוז מטרה בתיק</Label>
              <Input
                type="number"
                value={newStock.target_percentage || ''}
                onChange={(e) => setNewStock({ ...newStock, target_percentage: parseFloat(e.target.value) || 0 })}
                placeholder="אחוז מטרה"
                className="border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStock(false)} className="border-slate-200">ביטול</Button>
            <Button onClick={() => createInvestmentMutation.mutate(newStock)} className="bg-gradient-to-r from-indigo-600 to-purple-600">הוסף</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stock Dialog */}
      <Dialog open={!!editingStock} onOpenChange={() => setEditingStock(null)}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">עריכת נייר ערך</DialogTitle>
          </DialogHeader>
          {editingStock && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-600">שם נייר ערך</Label>
                <Input
                  value={editingStock.name}
                  onChange={(e) => setEditingStock({ ...editingStock, name: e.target.value })}
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">כמות</Label>
                <Input
                  type="number"
                  value={editingStock.quantity || ''}
                  onChange={(e) => setEditingStock({ ...editingStock, quantity: parseFloat(e.target.value) || 0 })}
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">מחיר נוכחי</Label>
                <Input
                  type="number"
                  value={editingStock.current_price || ''}
                  onChange={(e) => setEditingStock({ ...editingStock, current_price: parseFloat(e.target.value) || 0 })}
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">אחוז מטרה בתיק</Label>
                <Input
                  type="number"
                  value={editingStock.target_percentage || ''}
                  onChange={(e) => setEditingStock({ ...editingStock, target_percentage: parseFloat(e.target.value) || 0 })}
                  className="border-slate-200"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStock(null)} className="border-slate-200">ביטול</Button>
            <Button onClick={() => updateInvestmentMutation.mutate({ id: editingStock.id, data: editingStock })} className="bg-gradient-to-r from-indigo-600 to-purple-600">
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!stockToDelete} onOpenChange={() => setStockToDelete(null)}>
        <AlertDialogContent dir="rtl" className="border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800">מחיקת נייר ערך</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              האם למחוק את {stockToDelete?.name}? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200">ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteInvestmentMutation.mutate(stockToDelete.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recommendations Dialog */}
      <Dialog open={showRecommendations} onOpenChange={setShowRecommendations}>
        <DialogContent className="sm:max-w-2xl border-0 shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Lightbulb className="w-5 h-5 text-amber-500" />
              </div>
              המלצות לקנייה
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-500 mb-4">
              סך הכסף להשקעה: ₪{(portfolioSettings.uninvested_cash + portfolioSettings.monthly_deposit).toLocaleString()}
            </p>

            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="p-5 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-slate-800 text-lg">{rec.name}</h4>
                      <Badge className="bg-blue-100 text-blue-700 border-0 px-3 py-1">
                        קנה {rec.sharesToBuy} יחידות
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">עלות: </span>
                        <span className="font-semibold text-slate-700">₪{rec.cost.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">אחוז נוכחי: </span>
                        <span className="font-semibold text-slate-700">{rec.currentPercent.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400">אחוז חדש: </span>
                        <span className="font-semibold text-emerald-600">{rec.newPercent}%</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-slate-400">אחוז מטרה: </span>
                      <span className="font-semibold text-indigo-600">{rec.target_percentage}%</span>
                    </div>
                  </div>
                ))}

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/50">
                  <p className="text-amber-700 font-medium">
                    יתרה שתישאר: ₪{remainingCash.toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">
                אין המלצות - התיק מאוזן לפי אחוזי המטרה
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecommendations(false)} className="border-slate-200">
              ביטול
            </Button>
            {recommendations.length > 0 && (
              <Button 
                onClick={applyRecommendations}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30"
              >
                <Check className="w-4 h-4 ml-2" />
                בצע קנייה ועדכן תיק
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}