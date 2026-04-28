import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Save, Home, Coins, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function GoalSettingsPanel({ userId }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({
    goal_type: 'financial_freedom',
    gender: 'male',
    target_age: 55,
    target_amount: 2000000,
    passive_income_target: 15000,
  });
  const queryClient = useQueryClient();

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const { data: goalSettings } = useQuery({
    queryKey: ['goalSettings', userId, currentUser?.id],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, entityName: 'GoalSettings' });
        return response.data.data?.[0];
      }
      const results = await base44.entities.GoalSettings.filter({ user_id: userId });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
  });

  const { data: pensionData = [] } = useQuery({
    queryKey: ['pensionData', userId, currentUser?.id],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, entityName: 'PensionData' });
        return response.data.data;
      }
      return base44.entities.PensionData.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
  });

  // Get data based on selected gender
  const selectedPension = pensionData.find(p => p.gender === settings.gender && p.fund_type === 'pension');
  const selectedKeren = pensionData.find(p => p.gender === settings.gender && p.fund_type === 'keren_hishtalmut');
  const currentAge = selectedPension?.current_age || 0;
  const retirementAge = selectedPension?.retirement_age || 67;
  const pensionAmount = selectedPension?.current_amount || 0;
  const kerenAmount = selectedKeren?.current_amount || 0;

  useEffect(() => {
    if (goalSettings) {
      setSettings({
        goal_type: goalSettings.goal_type || 'financial_freedom',
        gender: goalSettings.gender || 'male',
        target_age: goalSettings.target_age || 55,
        target_amount: goalSettings.target_amount || 2000000,
        passive_income_target: goalSettings.passive_income_target || 15000,
      });
    }
  }, [goalSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const saveData = {
        ...data,
        user_id: userId,
        male_current_age: pensionData.find(p => p.gender === 'male' && p.fund_type === 'pension')?.current_age || 0,
        female_current_age: pensionData.find(p => p.gender === 'female' && p.fund_type === 'pension')?.current_age || 0,
      };
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('saveClientData', { entityName: 'GoalSettings', clientUserId: userId, data: saveData, recordId: goalSettings?.id || null });
        return response.data;
      }
      if (goalSettings) {
        return base44.entities.GoalSettings.update(goalSettings.id, saveData);
      }
      return base44.entities.GoalSettings.create(saveData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalSettings', userId, currentUser?.id] });
    },
  });

  return (
    <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#105330]/5 via-white to-[#c8a863]/5 overflow-hidden transition-all duration-500 hover:shadow-3xl">
      <div className="h-1.5 bg-gradient-to-r from-[#105330] via-[#1a7a4a] to-[#c8a863]" />
      <CardHeader className="border-b border-[#105330]/10 bg-white/50">
        <CardTitle className="flex items-center gap-3 text-[#105330]">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#105330] to-[#1a7a4a] shadow-lg">
            <Target className="w-5 h-5 text-white" />
          </div>
          מטרה כלכלית
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          {/* Gender Selection */}
          <div className="space-y-2">
            <Label className="text-[#105330] font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              בחר מגדר
            </Label>
            <Select value={settings.gender} onValueChange={(value) => setSettings({ ...settings, gender: value })}>
              <SelectTrigger className="rounded-xl py-6 bg-white border-[#105330]/30 hover:border-[#105330] transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">גבר</SelectItem>
                <SelectItem value="female">אישה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Goal Type */}
          <div className="space-y-2">
            <Label className="text-[#105330] font-semibold">מה המטרה?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setSettings({ ...settings, goal_type: 'home' })}
                className={`flex-1 rounded-xl py-7 text-base transition-all duration-300 ${
                  settings.goal_type === 'home' 
                    ? 'bg-gradient-to-r from-[#105330] to-[#1a7a4a] text-white shadow-lg scale-105' 
                    : 'bg-white border-2 border-[#105330]/30 text-[#105330] hover:bg-[#105330]/5 hover:scale-102'
                }`}
              >
                <Home className="w-5 h-5 ml-1" />
                בית
              </Button>
              <Button
                type="button"
                onClick={() => setSettings({ ...settings, goal_type: 'financial_freedom' })}
                className={`flex-1 rounded-xl py-7 text-base transition-all duration-300 ${
                  settings.goal_type === 'financial_freedom' 
                    ? 'bg-gradient-to-r from-[#105330] to-[#1a7a4a] text-white shadow-lg scale-105' 
                    : 'bg-white border-2 border-[#105330]/30 text-[#105330] hover:bg-[#105330]/5 hover:scale-102'
                }`}
              >
                <Coins className="w-5 h-5 ml-1" />
                חופש כלכלי
              </Button>
            </div>
          </div>

          {/* Current Age */}
          <div className="space-y-2 max-w-[140px]">
            <Label className="text-[#105330] font-semibold">גיל נוכחי</Label>
            <div className="relative">
              <Input
                type="number"
                value={currentAge || ''}
                disabled
                className="bg-[#105330]/5 border-[#105330]/20 rounded-xl py-3 text-center font-bold text-base"
              />
            </div>
          </div>

          {/* Target Age */}
          <div className="space-y-2 max-w-[140px]">
            <Label className="text-[#105330] font-semibold">גיל יעד</Label>
            <Input
              type="number"
              value={settings.target_age || ''}
              onChange={(e) => setSettings({ ...settings, target_age: parseInt(e.target.value) || 0 })}
              className="border-[#105330]/30 rounded-xl py-3 bg-white text-center font-bold text-base focus:ring-2 focus:ring-[#105330]/30 transition-all"
            />
          </div>

          {/* Target Amount or Passive Income */}
          {settings.goal_type === 'home' ? (
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">סכום המטרה</Label>
              <Input
                type="number"
                value={settings.target_amount || ''}
                onChange={(e) => setSettings({ ...settings, target_amount: parseFloat(e.target.value) || 0 })}
                className="border-[#105330]/30 rounded-xl py-6 bg-white text-center font-bold text-lg"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">הכנסה פאסיבית רצויה</Label>
              <Input
                type="number"
                value={settings.passive_income_target || ''}
                onChange={(e) => setSettings({ ...settings, passive_income_target: parseFloat(e.target.value) || 0 })}
                className="border-[#105330]/30 rounded-xl py-6 bg-white text-center font-bold text-lg"
              />
            </div>
          )}

          {/* Pension Info */}
          <div className="space-y-2">
            <Label className="text-[#105330] font-semibold">נתוני פנסיה</Label>
            <div className="p-3 bg-white/80 rounded-xl border border-[#105330]/20 text-sm">
              <div className="flex justify-between">
                <span className="text-[#105330]/70">פנסיה:</span>
                <span className="font-semibold text-[#105330]">₪{pensionAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[#105330]/70">השתלמות:</span>
                <span className="font-semibold text-[#105330]">₪{kerenAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-5 bg-gradient-to-r from-[#105330]/10 to-[#c8a863]/10 rounded-2xl border border-[#105330]/20 mb-6 transform hover:scale-[1.01] transition-transform">
          <p className="text-[#105330] font-bold text-center text-lg">
            {settings.goal_type === 'home' 
              ? `מטרה: לצבור ₪${(settings.target_amount || 0).toLocaleString()} עד גיל ${settings.target_age}`
              : `מטרה: הכנסה פאסיבית של ₪${(settings.passive_income_target || 0).toLocaleString()}/חודש בגיל ${settings.target_age}`
            }
          </p>
        </div>

        <div className="flex justify-end">
          <Button 
            type="button"
            onClick={() => saveMutation.mutate(settings)}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] shadow-xl hover:shadow-2xl px-10 py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105"
          >
            <Save className="w-5 h-5 ml-2" />
            {saveMutation.isPending ? 'שומר...' : 'שמור מטרה'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}