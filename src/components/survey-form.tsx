'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader, Share2, Sparkles, Twitter } from 'lucide-react';

import { questions, questionOnlyQuestions, likertOptions, type Question, type Option } from '@/lib/questions';
import { surveySchema, type SurveySchema } from '@/lib/schema';
import { submitSurvey } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Confetti } from './confetti';
import { Logo } from './icons';

const formId = 'q-commerce-survey-form';

export function SurveyForm() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [direction, setDirection] = useState(1);

  const { toast } = useToast();

  const methods = useForm<SurveySchema>({
    resolver: zodResolver(surveySchema),
    mode: 'onChange',
  });

  const { formState: { errors }, watch, trigger, getValues } = methods;

  const currentQuestion = useMemo(() => questions[step], [step]);
  const isQuestion = currentQuestion.type !== 'header';
  const currentQuestionIndex = isQuestion ? questionOnlyQuestions.findIndex(q => q.id === currentQuestion.id) : -1;
  const totalQuestions = questionOnlyQuestions.length;

  const progress = useMemo(() => {
    if (currentQuestionIndex === -1) {
      const prevQuestionIndex = questionOnlyQuestions.findIndex(q => q.id === questions[step - 1]?.id);
      return ((prevQuestionIndex + 1) / totalQuestions) * 100;
    }
    return ((currentQuestionIndex) / totalQuestions) * 100;
  }, [currentQuestionIndex, totalQuestions, step]);

  useEffect(() => {
    if (progress === 50 || progress === 100) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const handleNext = async () => {
    let isValid = true;
    if (isQuestion) {
      isValid = await trigger(currentQuestion.id as keyof SurveySchema);
    }

    if (currentQuestion.id === 'gender') {
       const gender = getValues('gender');
       if (gender === 'other') {
         isValid = await trigger('genderOther');
       }
    }
    
    if (isValid) {
      setDirection(1);
      if (step < questions.length - 1) {
        setStep(step + 1);
      } else {
        await methods.handleSubmit(onSubmit)();
      }
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    if (step > 0) {
      setStep(step - 1);
    }
  };
  
  const onSubmit = async (data: SurveySchema) => {
    setIsSubmitting(true);
    const result = await submitSurvey(data);
    if (result.success) {
      setSummary(result.summary);
    } else {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: result.error,
      });
    }
    setIsSubmitting(false);
  };
  
  const renderInput = (question: Question) => {
    const fieldName = question.id as keyof SurveySchema;
    const fieldError = errors[fieldName];
    const watchedValue = watch(fieldName);

    switch (question.type) {
      case 'text':
      case 'number':
        return (
          <Input
            {...methods.register(fieldName)}
            type={question.type}
            placeholder="Type your answer here..."
            className="bg-background/80 border-2 border-primary/20 focus:border-accent focus:ring-accent"
          />
        );
      case 'radio':
      case 'radio-other':
        return (
          <RadioGroup
            onValueChange={(value) => methods.setValue(fieldName, value, { shouldValidate: true })}
            value={watchedValue as string}
          >
            {question.options?.map((option) => (
              <div key={option.value} className="flex items-center">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="ml-3 text-lg cursor-pointer">{option.label}</Label>
              </div>
            ))}
            {question.type === 'radio-other' && (
               <>
                <div className="flex items-center">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="ml-3 text-lg cursor-pointer">Other</Label>
                </div>
                {watch('gender') === 'other' && (
                    <Input
                    {...methods.register('genderOther')}
                    type="text"
                    placeholder="Please specify"
                    className="mt-2 bg-background/80 border-2 border-primary/20 focus:border-accent focus:ring-accent"
                    />
                )}
               </>
            )}
          </RadioGroup>
        );
      case 'likert':
        return (
          <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 w-full">
            {likertOptions.map(option => (
              <Button
                key={option.value}
                type="button"
                variant={watchedValue === option.value ? 'default' : 'outline'}
                className={`flex-1 transition-all duration-300 transform hover:scale-105 ${watchedValue === option.value ? 'bg-primary text-primary-foreground' : 'border-primary/50 text-foreground/80 hover:bg-primary/10'}`}
                onClick={() => methods.setValue(fieldName, option.value, { shouldValidate: true })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  const renderContent = () => {
    if (isSubmitting) {
      return (
        <div className="text-center">
          <Loader className="mx-auto h-12 w-12 animate-spin text-accent" />
          <h2 className="mt-4 text-2xl font-bold">Generating your insights...</h2>
          <p className="text-muted-foreground">This may take a moment.</p>
        </div>
      );
    }
    if (summary) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
           {showConfetti && <Confetti />}
          <Card className="bg-background/50 border-primary/50 backdrop-blur-sm max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-3xl font-bold text-accent">
                <Sparkles /> Your Personalized Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg whitespace-pre-wrap font-medium">{summary}</p>
              <p className="mt-6 font-bold text-xl">Thank you for your valuable insights!</p>
              <div className="mt-4 flex justify-center gap-4">
                <Button onClick={() => window.location.reload()}>Start Over</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const text = `I just completed the Q-Commerce Insights survey! Here's a peek at my results: "${summary.substring(0, 100)}..."`;
                    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=QCommerceInsights`;
                    window.open(url, '_blank');
                  }}
                >
                  <Twitter className="mr-2 h-4 w-4" />
                  Share on X
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }
    if (step === 0 && !isQuestion) { // Welcome screen
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center">
          <Logo className="mx-auto h-24 w-24 text-primary" />
          <h1 className="text-5xl font-bold mt-4 font-headline">Q-Commerce Insights</h1>
          <p className="text-muted-foreground text-xl mt-2">Uncovering dark patterns in quick commerce.</p>
          <Button size="lg" className="mt-8" onClick={handleNext}>
            Start Survey <ArrowRight className="ml-2" />
          </Button>
        </motion.div>
      );
    }
    
    return (
      <FormProvider {...methods}>
        <form id={formId} onSubmit={methods.handleSubmit(onSubmit)} className="w-full max-w-3xl mx-auto">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="w-full"
            >
              <div className="text-center mb-8">
                {isQuestion && (
                  <p className="text-accent font-bold mb-2">Question {currentQuestionIndex + 1} of {totalQuestions}</p>
                )}
                <h2 className="text-3xl font-headline font-bold">{currentQuestion.text}</h2>
              </div>
              <div className="my-8 min-h-[150px] flex items-center justify-center">
                {isQuestion && renderInput(currentQuestion)}
              </div>
              <div className="flex justify-between items-center mt-8">
                <Button type="button" variant="ghost" onClick={handlePrev} disabled={step === 0}>
                  <ArrowLeft className="mr-2" /> Back
                </Button>
                {currentQuestion.type === 'header' ? (
                  <Button type="button" onClick={handleNext}>
                    Continue <ArrowRight className="ml-2" />
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext}>
                    {step === questions.length - 1 ? 'Finish & See Results' : 'Next'} <ArrowRight className="ml-2" />
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </form>
      </FormProvider>
    );
  };
  

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full bg-background p-4 md:p-8 overflow-hidden">
      {showConfetti && !summary && <Confetti />}
      <div className="absolute inset-0 bg-grid-primary/10 [mask-image:linear-gradient(to_bottom,white_5%,transparent_80%)]"></div>
      <div className="z-10 w-full flex-grow flex items-center justify-center">
        {renderContent()}
      </div>

      {!summary && !isSubmitting && (
        <div className="w-full max-w-3xl fixed bottom-8 px-4">
          <Progress value={progress} className="h-3 [&>*]:bg-primary" />
        </div>
      )}
    </main>
  );
}
