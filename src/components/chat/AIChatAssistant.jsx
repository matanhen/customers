import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { 
  X, Send, Bot,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const QUESTIONS = [
  {
    id: 'income',
    question: 'כמה הרווחת החודש?',
    field: 'expected_income',
    type: 'number',
  },
  {
    id: 'savings',
    question: 'כמה העברת החודש לחיסכון?',
    field: 'savings',
    type: 'number',
  },
  {
    id: 'fixed_changed',
    question: 'האם השתנתה הוצאה בהוצאות הקבועות?',
    type: 'select',
    options: [
      { value: 'no', label: 'לא' },
      { value: 'yes', label: 'כן' },
    ],
  },
  {
    id: 'fixed_expenses',
    question: 'נא לרשום את סכום ההוצאות הקבועות העדכני',
    field: 'fixed_expenses',
    type: 'number',
    condition: (answers) => answers.fixed_changed === 'yes',
  },
  {
    id: 'variable_expenses',
    question: 'כמה סך הכל הוצאות משתנות היו החודש?',
    field: 'variable_expenses',
    type: 'number',
  },
  {
    id: 'investments',
    question: 'כמה העברת החודש להשקעות?',
    field: 'investments_allocation',
    type: 'number',
  },
  {
    id: 'dreams',
    question: 'כמה העברת החודש לחיסכון חלומות?',
    field: 'dreams_savings',
    type: 'number',
  },
  {
    id: 'emergency',
    question: 'כמה העברת החודש לקרן ביטחון?',
    field: 'emergency_fund_allocation',
    type: 'number',
  },
];

export default function AIChatAssistant({ onClose, userId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'שלום! שמתי לב שעוד לא עדכנת את התכנון החודשי שלך החודש. בוא נעדכן יחד בכמה שאלות קצרות.',
    },
  ]);
  const [isComplete, setIsComplete] = useState(false);
  const queryClient = useQueryClient();

  const currentMonth = format(new Date(), 'yyyy-MM');
  const prevMonth = format(subMonths(new Date(), 1), 'yyyy-MM');

  const { data: monthlyPlans = [] } = useQuery({
    queryKey: ['monthlyPlans', userId],
    queryFn: () => base44.entities.MonthlyPlan.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const prevMonthPlan = monthlyPlans.find(p => p.month === prevMonth);

  useEffect(() => {
    setTimeout(() => {
      addBotMessage(QUESTIONS[0].question);
    }, 1000);
  }, []);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.MonthlyPlan.create({
      ...data,
      user_id: userId,
      month: currentMonth,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyPlans', userId] });
    },
  });

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, { type: 'bot', text }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', text }]);
  };

  const getNextQuestionIndex = (currentIndex, currentAnswers) => {
    let nextIndex = currentIndex + 1;
    while (nextIndex < QUESTIONS.length) {
      const question = QUESTIONS[nextIndex];
      if (!question.condition || question.condition(currentAnswers)) {
        return nextIndex;
      }
      nextIndex++;
    }
    return -1;
  };

  const handleSubmit = () => {
    const currentQuestion = QUESTIONS[currentStep];
    
    if (currentQuestion.type === 'number' && !inputValue) {
      return;
    }

    const value = currentQuestion.type === 'number' 
      ? parseFloat(inputValue) || 0 
      : inputValue;

    addUserMessage(currentQuestion.type === 'number' ? `₪${value.toLocaleString()}` : value === 'yes' ? 'כן' : 'לא');

    const newAnswers = { 
      ...answers, 
      [currentQuestion.id]: value,
    };
    setAnswers(newAnswers);
    setInputValue('');

    if (currentQuestion.id === 'fixed_changed' && value === 'no' && prevMonthPlan) {
      newAnswers.fixed_expenses = prevMonthPlan.fixed_expenses;
    }

    const nextIndex = getNextQuestionIndex(currentStep, newAnswers);

    if (nextIndex === -1) {
      finishChat(newAnswers);
    } else {
      setCurrentStep(nextIndex);
      setTimeout(() => {
        addBotMessage(QUESTIONS[nextIndex].question);
      }, 500);
    }
  };

  const finishChat = async (finalAnswers) => {
    addBotMessage('מעולה! מעדכן את התכנון החודשי שלך...');

    const prevDreams = prevMonthPlan?.dreams_savings || 0;
    const prevEmergency = prevMonthPlan?.emergency_fund_current || 0;
    const prevEmergencyAllocation = prevMonthPlan?.emergency_fund_allocation || 0;

    const planData = {
      expected_income: finalAnswers.income || 0,
      savings: finalAnswers.savings || 0,
      fixed_expenses: finalAnswers.fixed_expenses || prevMonthPlan?.fixed_expenses || 0,
      variable_expenses: finalAnswers.variable_expenses || 0,
      investments_allocation: finalAnswers.investments || 0,
      dreams_savings: (finalAnswers.dreams || 0) + prevDreams,
      emergency_fund_current: prevEmergency + prevEmergencyAllocation,
      emergency_fund_allocation: finalAnswers.emergency || 0,
    };

    await saveMutation.mutateAsync(planData);

    setTimeout(() => {
      addBotMessage('✅ התכנון החודשי עודכן בהצלחה! אתה יכול תמיד לערוך את הנתונים בעמוד התכנון הפיננסי החודשי.');
      setIsComplete(true);
    }, 500);
  };

  const currentQuestion = QUESTIONS[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-indigo-600" />
            עדכון תכנון חודשי
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.type === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {!isComplete && (
            <div className="border-t p-4">
              {currentQuestion?.type === 'select' ? (
                <div className="flex gap-2">
                  {currentQuestion.options.map((option) => (
                    <Button
                      key={option.value}
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setInputValue(option.value);
                        setTimeout(() => handleSubmit(), 100);
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="הזן סכום"
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    className="flex-1"
                  />
                  <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {isComplete && (
            <div className="border-t p-4">
              <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 ml-2" />
                סגור
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}