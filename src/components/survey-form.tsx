'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, ArrowDown, BarChart, CheckCircle, Clock, FileText, Loader, Sparkles, Twitter } from 'lucide-react';

import { questions, questionOnlyQuestions, likertOptions, type Question } from '@/lib/questions';
import { surveySchema, type SurveySchema } from '@/lib/schema';
import { submitSurvey } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Confetti } from './confetti';
import { Logo } from './icons';
import { cn } from '@/lib/utils';

const formId = 'q-commerce-survey-form';

export function SurveyForm() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isIntro, setIsIntro] = useState(true);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);

  const { toast } = useToast();

  const methods = useForm<SurveySchema>({
    resolver: zodResolver(surveySchema),
    mode: 'onChange',
  });

  const { formState: { errors }, watch, trigger, getValues } = methods;

  const currentQuestion = useMemo(() => questions[step], [step]);
  
  const questionText = useMemo(() => {
    if (!currentQuestion) return '';
    let text = currentQuestion.text;
    if (currentQuestion.id === 'darkPatternsHeader') {
      const name = getValues('name');
      text = `Great ${name ? name : 'you'}, let's identify if you experience dark patterns in quick com app`;
    }
    return text;
  }, [currentQuestion, getValues]);

  const isQuestion = currentQuestion?.type !== 'header';
  const currentQuestionIndex = isQuestion ? questionOnlyQuestions.findIndex(q => q.id === currentQuestion.id) : -1;
  const totalQuestions = questionOnlyQuestions.length;

  const progress = useMemo(() => {
    if (summary || isSubmitting) return 100;
    if (currentQuestionIndex === -1) {
      if (step === 0) return 0;
      const prevQuestionIndex = questionOnlyQuestions.findIndex(q => q.id === questions[step - 1]?.id);
      return ((prevQuestionIndex + 1) / totalQuestions) * 100;
    }
    return ((currentQuestionIndex) / totalQuestions) * 100;
  }, [currentQuestionIndex, totalQuestions, step, summary, isSubmitting]);

  useEffect(() => {
    if (progress === 100 && summary) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [progress, summary]);

  const scrollToStep = (newStep: number) => {
    const element = document.getElementById(`step-${newStep}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStep(newStep);
    }
  };

  const handleNext = async () => {
    if (isIntro) {
      setIsIntro(false);
      scrollToStep(0);
      return;
    }

    let isValid = true;
    if (isQuestion && currentQuestion) {
      isValid = await trigger(currentQuestion.id as keyof SurveySchema);
    }

    if (currentQuestion?.id === 'gender') {
       const gender = getValues('gender');
       if (gender === 'other') {
         isValid = await trigger('genderOther');
       }
    }
    
    if (isValid) {
      if (step < questions.length - 1) {
        scrollToStep(step + 1);
      } else {
        await methods.handleSubmit(onSubmit)();
      }
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      scrollToStep(step - 1);
    }
  };
  
  const onSubmit = async (data: SurveySchema) => {
    setIsSubmitting(true);
    const result = await submitSurvey(data);
    if (result.success) {
      setSummary(result.summary);
      setShowConfetti(true);
      const summaryElement = document.getElementById('summary-card');
      if (summaryElement) {
        summaryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
    const watchedValue = watch(fieldName);

    switch (question.type) {
      case 'text':
      case 'number':
        return (
          <Input
            {...methods.register(fieldName)}
            type={question.type}
            placeholder="Type your answer here..."
            className="bg-input/50 border-2 border-transparent focus:border-primary focus:ring-primary/50 shadow-inner backdrop-blur-sm"
          />
        );
      case 'radio':
      case 'radio-other':
        return (
          <RadioGroup
            onValueChange={(value) => methods.setValue(fieldName, value, { shouldValidate: true })}
            value={watchedValue as string}
            className="gap-2 sm:gap-3"
          >
            {question.options?.map((option) => (
              <div key={option.value} className="flex items-center">
                <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                <Label htmlFor={`${question.id}-${option.value}`} className="ml-3 text-sm sm:text-base cursor-pointer hover:text-primary transition-colors">{option.label}</Label>
              </div>
            ))}
            {question.type === 'radio-other' && (
               <>
                <div className="flex items-center">
                    <RadioGroupItem value="other" id={`${question.id}-other`} />
                    <Label htmlFor={`${question.id}-other`} className="ml-3 text-sm sm:text-base cursor-pointer">Other</Label>
                </div>
                {watch('gender') === 'other' && (
                    <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} transition={{duration: 0.3}}>
                      <Input
                      {...methods.register('genderOther')}
                      type="text"
                      placeholder="Please specify"
                      className="mt-2 bg-input/50 border-2 border-transparent focus:border-primary focus:ring-primary/50 shadow-inner backdrop-blur-sm"
                      />
                    </motion.div>
                )}
               </>
            )}
          </RadioGroup>
        );
      case 'likert':
        return (
          <div className="flex flex-col justify-center gap-2 md:gap-3 w-full max-w-xs mx-auto">
            {likertOptions.map(option => (
              <Button
                key={option.value}
                type="button"
                variant={watchedValue === option.value ? 'default' : 'secondary'}
                className={cn(
                  `flex-1 transition-all duration-200 transform hover:scale-105 rounded-full px-4 py-2 sm:py-3 text-xs sm:text-sm`,
                  watchedValue === option.value 
                    ? 'bg-primary text-primary-foreground shadow-[0_0_25px_rgba(224,36,36,0.8)]' 
                    : 'bg-secondary/50 text-secondary-foreground hover:bg-primary/80 backdrop-blur-sm'
                )}
                onClick={() => {
                  methods.setValue(fieldName, option.value, { shouldValidate: true });
                  setTimeout(() => handleNext(), 200);
                }}
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

  const renderIntro = () => (
    <div id="intro-card" className="h-screen w-full flex flex-col justify-center items-center text-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Logo className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-primary mb-2" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-headline tracking-tighter">Q-Commerce Insights</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-xs sm:max-w-md mx-auto">Uncover the hidden psychological tricks in your favorite quick commerce apps.</p>
        </motion.div>
        
        <motion.div 
            className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4 mt-6 sm:mt-8 max-w-sm mx-auto"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.2 } }
            }}
        >
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="col-span-1">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 h-full shadow-lg shadow-primary/10">
                    <CardHeader className="items-center p-3 sm:p-4">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-primary"/>
                        <CardTitle className="text-sm sm:text-base mt-2">Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <p className="text-xl sm:text-2xl font-bold">{totalQuestions}</p>
                        <p className="text-muted-foreground text-xs">in-depth</p>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="col-span-1">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 h-full shadow-lg shadow-primary/10">
                    <CardHeader className="items-center p-3 sm:p-4">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary"/>
                        <CardTitle className="text-sm sm:text-base mt-2">Duration</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <p className="text-xl sm:text-2xl font-bold">~{Math.ceil(totalQuestions * 0.15)}</p>
                        <p className="text-muted-foreground text-xs">minutes</p>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div className="col-span-2 mt-2" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 h-full shadow-lg shadow-primary/10">
                    <CardHeader className="items-center p-3 sm:p-4">
                        <BarChart className="w-6 h-6 sm:w-8 sm:h-8 text-primary"/>
                        <CardTitle className="text-sm sm:text-base mt-2">Reward</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <p className="text-base sm:text-lg font-bold">Summary</p>
                        <p className="text-muted-foreground text-xs">of your behavior</p>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }} className="mt-6">
            <Button size="lg" className="text-base sm:text-lg font-bold tracking-wider rounded-full bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(224,36,36,0.7)]" onClick={handleNext}>
                Start Analysis <ArrowDown className="ml-2" />
            </Button>
        </motion.div>
    </div>
  );
  
  const renderQuestion = (question: Question, index: number) => {
    const isHeader = question.type === 'header';
    const currentQText = isHeader && question.id === 'darkPatternsHeader' ? `Great ${getValues('name') || 'you'}, let's identify if you experience dark patterns in quick com app` : question.text;
    const { mainText: qMainText, exampleText: qExampleText } = (isHeader ? { mainText: currentQText, exampleText: null } : (() => {
      const match = question.text.match(/(.*)\((Example:.*)\)/s);
      return match ? { mainText: match[1].trim(), exampleText: match[2].trim() } : { mainText: question.text, exampleText: null };
    })());
    const qIsQuestion = question.type !== 'header';
    const qIndex = qIsQuestion ? questionOnlyQuestions.findIndex(q => q.id === question.id) : -1;

    return (
      <div id={`step-${index}`} className="h-screen w-full flex flex-col items-center justify-center p-4 snap-center">
        <div className="relative w-full max-w-md mx-auto">
          <Card className="bg-card/50 border-primary/20 backdrop-blur-lg shadow-xl shadow-primary/10 rounded-2xl h-auto w-full flex flex-col justify-center min-h-[300px] sm:min-h-[350px]">
            <CardHeader className="text-center px-4 pt-6 sm:px-6">
              {qIsQuestion && (
                <p className="text-primary font-bold mb-2 tracking-widest text-xs sm:text-sm">QUESTION {qIndex + 1}</p>
              )}
              <CardTitle className="text-lg sm:text-xl font-headline font-bold">{qMainText}</CardTitle>
            </CardHeader>
            <CardContent className="my-4 flex flex-grow items-center justify-center px-4 sm:px-6">
              {qIsQuestion ? renderInput(question) : <div />}
            </CardContent>
          </Card>
           {qExampleText && (
              <Card className="mt-4 bg-card/50 border-primary/20 backdrop-blur-lg shadow-xl shadow-primary/10 rounded-2xl h-auto w-full">
                  <CardContent className="p-4">
                      <CardDescription className="text-center text-xs sm:text-sm text-muted-foreground">{qExampleText}</CardDescription>
                  </CardContent>
              </Card>
            )}
        </div>
      </div>
    );
  };
  
  const renderSummary = () => (
    <div id="summary-card" className="h-screen w-full flex flex-col items-center justify-center p-4 snap-center">
      {isSubmitting ? (
          <div className="text-center flex flex-col items-center justify-center min-h-[300px]">
            <Loader className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight">Analyzing Your Responses...</h2>
            <p className="text-muted-foreground text-lg">Our AI is crafting your personalized insights.</p>
          </div>
        ) : (
          summary && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full">
              {showConfetti && <Confetti />}
              <Card className="bg-card/50 border-primary/50 backdrop-blur-lg max-w-2xl mx-auto text-center shadow-2xl shadow-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-3 text-3xl sm:text-4xl font-bold text-primary tracking-tighter">
                    <Sparkles className="w-8 h-8"/> Your Insights Report
                  </CardTitle>
                  <CardDescription>Based on your survey responses.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-base sm:text-lg whitespace-pre-wrap font-medium p-4 bg-black/20 rounded-lg">{summary}</p>
                  <p className="mt-6 font-bold text-lg sm:text-xl flex items-center justify-center gap-2"><CheckCircle className="text-green-500"/>Thank you for your valuable insights!</p>
                  <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                    <Button onClick={() => window.location.reload()}>Start Over</Button>
                    <Button
                      variant="outline"
                      className="bg-transparent border-2 border-sky-500 text-sky-400 hover:bg-sky-500 hover:text-white"
                      onClick={() => {
                        const text = `I just uncovered my online shopping habits with Q-Commerce Insights! Get your own analysis. #QCommerceInsights`;
                        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
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
          )
        )}
    </div>
  );

  return (
    <main className="relative h-screen w-full bg-background overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 via-transparent to-transparent"></div>
        <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[200px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-30%] right-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[200px] opacity-30 animate-pulse animation-delay-4000"></div>
      </div>
      
      {!isIntro && !summary && !isSubmitting && (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div className="relative h-64 w-4 flex justify-center">
                <Progress orientation="vertical" value={progress} className="w-2 h-full bg-primary/20" />
            </div>
             <p className="text-primary font-bold mt-2 text-xs">{Math.round(progress)}%</p>
        </div>
      )}
      
      <FormProvider {...methods}>
        <form id={formId} onSubmit={methods.handleSubmit(onSubmit)} className="h-full">
          <div ref={setScrollContainer} className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth">
            {renderIntro()}
            {questions.map((q, i) => (
              <React.Fragment key={q.id}>{renderQuestion(q, i)}</React.Fragment>
            ))}
            {renderSummary()}
          </div>
        </form>
      </FormProvider>

      {!isIntro && !summary && !isSubmitting && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
            <Button type="button" variant="ghost" onClick={handlePrev} disabled={step === 0}>
              <ArrowUp className="h-5 w-5" />
            </Button>
            <Button type="button" variant="ghost" onClick={handleNext} disabled={currentQuestion?.type === 'likert'}>
               <ArrowDown className="h-5 w-5" />
            </Button>
        </div>
      )}
    </main>
  );
}
