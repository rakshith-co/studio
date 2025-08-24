
'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUp, ArrowDown, BarChart, CheckCircle, Clock, FileText, Loader, Sparkles } from 'lucide-react';
import React from 'react';

import { questions, questionOnlyQuestions, likertOptions, type Question } from '@/lib/questions';
import { surveySchema, type SurveySchema } from '@/lib/schema';
import { submitSurvey } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Confetti } from './confetti';
import { Logo } from './icons';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

const formId = 'q-commerce-survey-form';

const ActiveScreen = React.memo(function ActiveScreen({
  isIntro,
  summary,
  isSubmitting,
  currentStep,
  renderIntro,
  renderSummary,
  renderQuestion,
}: {
  isIntro: boolean;
  summary: string | null;
  isSubmitting: boolean;
  currentStep: number;
  renderIntro: () => JSX.Element;
  renderSummary: () => JSX.Element;
  renderQuestion: (question: Question, index: number) => JSX.Element;
}) {
    if (isIntro) return renderIntro();
    if (summary || isSubmitting) return renderSummary();
    if (currentStep < questions.length) {
      return renderQuestion(questions[currentStep], currentStep);
    }
    return renderIntro();
});
ActiveScreen.displayName = 'ActiveScreen';

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      {...props}
    >
      <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
    </svg>
  );
}

export function SurveyForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isIntro, setIsIntro] = useState(true);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const methods = useForm<SurveySchema>({
    resolver: zodResolver(surveySchema),
    mode: 'onChange',
  });

  const { formState: { errors, isValid }, watch, trigger, getValues, handleSubmit } = methods;

  const currentQuestion = useMemo(() => questions[currentStep], [currentStep]);
  const isLastQuestion = useMemo(() => {
    if (!currentQuestion || currentQuestion.type === 'header') return false;
    const lastQId = questionOnlyQuestions[questionOnlyQuestions.length - 1].id;
    return currentQuestion.id === lastQId;
  }, [currentQuestion]);
  
  const isQuestion = currentQuestion?.type !== 'header';

  const progress = useMemo(() => {
    if (summary || isSubmitting) return 100;
    if (isIntro) return 0;

    let questionIndex = -1;
    if (currentQuestion) {
      if(currentQuestion.type !== 'header') {
        questionIndex = questionOnlyQuestions.findIndex(q => q.id === currentQuestion.id);
      } else {
        const nextQuestionIndex = questions.findIndex((q, i) => i > currentStep && q.type !== 'header');
        if (nextQuestionIndex !== -1) {
          const nextQ = questions[nextQuestionIndex];
          questionIndex = questionOnlyQuestions.findIndex(q => q.id === nextQ.id) -1;
        } else {
          questionIndex = questionOnlyQuestions.length -1;
        }
      }
    }

    if (questionIndex < 0) return 0;
    
    const isLastFormQuestion = questionIndex === questionOnlyQuestions.length - 1;
    const lastQuestionId = questionOnlyQuestions[questionOnlyQuestions.length - 1].id;
    const lastQuestionValue = getValues(lastQuestionId as keyof SurveySchema);
    if(isLastFormQuestion && lastQuestionValue) {
      return 100;
    }

    return ((questionIndex + 1) / questionOnlyQuestions.length) * 100;
  }, [currentStep, isIntro, summary, isSubmitting, currentQuestion, getValues]);


  useEffect(() => {
    if (progress === 100 && !summary) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [progress, summary]);

  const onSubmit = useCallback(async (data: SurveySchema) => {
    setIsSubmitting(true);
    try {
        const result = await submitSurvey(data);
        if (result && result.success) {
            setSummary(result.summary);
            setShowConfetti(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: result?.error || 'An unknown error occurred.',
            });
        }
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Submission Error',
            description: 'An unexpected error occurred while submitting.',
        });
    } finally {
        // We only want to stop submitting if there is a summary.
        // If there's a failure, the user is still on the form and might want to retry.
        // But if we get here from an error, we should stop loading.
        if (!summary) {
            setIsSubmitting(false);
        }
    }
  }, [toast, summary]);
  
  const handleNext = useCallback(async () => {
    if (isIntro) {
      setIsIntro(false);
      setCurrentStep(0);
      return;
    }

    if (isLastQuestion) {
        handleSubmit(onSubmit)();
        return;
    }
  
    let fieldIsValid = true;
    if (isQuestion && currentQuestion) {
      fieldIsValid = await trigger(currentQuestion.id as keyof SurveySchema);
    }

    if (currentQuestion?.id === 'gender') {
       const gender = getValues('gender');
       if (gender === 'other') {
         fieldIsValid = await trigger('genderOther');
       }
    }
    
    if (fieldIsValid) {
      if (currentStep < questions.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [isIntro, currentStep, isQuestion, currentQuestion, trigger, getValues, handleSubmit, isLastQuestion, onSubmit]);

  const handlePrev = useCallback(() => {
    if (isIntro) return;
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setIsIntro(true);
    }
  }, [isIntro, currentStep]);
  
  const renderInput = useCallback((question: Question) => {
    const fieldName = question.id as keyof SurveySchema;
    const watchedValue = watch(fieldName);

    const handleLikertOrRadioNext = async () => {
        // A small delay to allow the state to update before proceeding
        setTimeout(() => {
          if (isLastQuestion) {
            handleSubmit(onSubmit)();
          } else {
            handleNext();
          }
        }, 50); 
      };
    
    switch (question.type) {
      case 'text':
      case 'number':
        return (
            <div className="relative w-full max-w-xs mx-auto">
              <Input
                {...methods.register(fieldName)}
                type={question.type}
                placeholder="Type your answer here..."
                className="bg-input/50 border-2 border-transparent focus:border-primary focus:ring-primary/50 shadow-inner backdrop-blur-sm pr-12"
              />
              <Button
                type="button"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-10 bg-primary/80 hover:bg-primary"
                onClick={handleNext}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
        );
      case 'radio':
      case 'radio-other':
        return (
          <RadioGroup
            onValueChange={(value) => {
              methods.setValue(fieldName, value, { shouldValidate: true });
              if (question.type === 'radio' || (question.type === 'radio-other' && value !== 'other')) {
                handleLikertOrRadioNext();
              }
            }}
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
                    <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} transition={{duration: 0.3}} className="relative">
                      <Input
                      {...methods.register('genderOther')}
                      type="text"
                      placeholder="Please specify"
                      className="mt-2 bg-input/50 border-2 border-transparent focus:border-primary focus:ring-primary/50 shadow-inner backdrop-blur-sm pr-12"
                      />
                       <Button
                        type="button"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-10 bg-primary/80 hover:bg-primary mt-1"
                        onClick={handleNext}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Button>
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
                  handleLikertOrRadioNext();
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
  }, [watch, handleNext, methods, isLastQuestion, handleSubmit, onSubmit]);

  const renderIntro = useCallback(() => (
    <div id="step--1" className="h-full w-full flex flex-col justify-center items-center text-center p-4">
      <div className="flex flex-col justify-center items-center h-full max-w-sm mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Logo className="mx-auto h-12 w-12 text-primary mb-2" />
            <h1 className="text-3xl sm:text-4xl font-bold font-headline tracking-tighter">Q-Commerce Insights</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">Uncover the hidden psychological tricks in your favorite quick commerce apps.</p>
        </motion.div>
        
        <motion.div 
            className="mt-6 w-full"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.2 } }
            }}
        >
          <div className="flex justify-center gap-2">
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="w-1/2">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-lg shadow-primary/10 w-full">
                    <CardHeader className="items-center p-3">
                        <FileText className="w-6 h-6 text-primary"/>
                        <CardTitle className="text-sm mt-2">Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <p className="text-xl font-bold">{questionOnlyQuestions.length}</p>
                        <p className="text-muted-foreground text-xs">in-depth</p>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="w-1/2">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-lg shadow-primary/10 w-full">
                    <CardHeader className="items-center p-3">
                        <Clock className="w-6 h-6 text-primary"/>
                        <CardTitle className="text-sm mt-2">Duration</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <p className="text-xl font-bold">~{Math.ceil(questionOnlyQuestions.length * 0.15)}</p>
                        <p className="text-muted-foreground text-xs">minutes</p>
                    </CardContent>
                </Card>
            </motion.div>
          </div>
          <motion.div className="mt-2" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-lg shadow-primary/10">
                  <CardHeader className="items-center p-3">
                      <BarChart className="w-6 h-6 text-primary"/>
                      <CardTitle className="text-sm mt-2">Reward</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                      <p className="text-base font-bold">Summary</p>
                      <p className="text-muted-foreground text-xs">of your behavior</p>
                  </CardContent>
              </Card>
          </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }} className="mt-6">
            <Button size="lg" className="text-base font-bold tracking-wider rounded-full bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(224,36,36,0.7)]" onClick={handleNext}>
                Start Analysis <ArrowDown className="ml-2" />
            </Button>
        </motion.div>
      </div>
    </div>
  ), [handleNext]);
  
  const renderQuestion = useCallback((question: Question, index: number) => {
    const isHeader = question.type === 'header';
    
    let titleContent;
    if (isHeader && (question.id === 'darkPatternsHeader' || question.id === 'regretHeader')) {
        const name = getValues('name') || 'you';
        const textParts = question.text.split('{name}');
        titleContent = (
            <span>
                {textParts[0]}
                <span className="text-primary">{name}</span>
                {textParts[1]}
            </span>
        );
    } else {
        const { mainText, exampleText } = (() => {
            const match = question.text.match(/(.*)\((Example:.*)\)/s);
            return match ? { mainText: match[1].trim(), exampleText: match[2].trim() } : { mainText: question.text, exampleText: null };
        })();
        titleContent = (
            <>
                {mainText}
                {exampleText && (
                    <CardDescription className="text-center text-xs sm:text-sm text-muted-foreground pt-2">{exampleText}</CardDescription>
                )}
            </>
        );
    }

    const qIsQuestion = question.type !== 'header';
    const qIndex = qIsQuestion ? questionOnlyQuestions.findIndex(q => q.id === question.id) : -1;

    return (
      <div key={question.id} id={`step-${index}`} className="h-full w-full flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-md mx-auto">
          <Card className="bg-card/50 border-primary/20 backdrop-blur-lg shadow-xl shadow-primary/10 rounded-2xl w-full">
            <CardHeader className="text-center px-4 pt-6 sm:px-6">
              {qIsQuestion && (
                <p className="text-primary font-bold mb-2 tracking-widest text-xs sm:text-sm">QUESTION {qIndex + 1}</p>
              )}
              <CardTitle className="text-lg sm:text-xl font-headline font-bold">{titleContent}</CardTitle>
            </CardHeader>
            <CardContent className="py-6 px-4 sm:px-6">
                {qIsQuestion ? (
                  <div className="flex justify-center items-center w-full">
                    {renderInput(question)}
                  </div>
                ) : (
                  isHeader && (
                    <div className="flex justify-center items-center">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={handleNext}
                      className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(224,36,36,0.7)]"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                      >
                        <ArrowDown className="w-8 h-8 text-primary-foreground" />
                      </motion.div>
                    </Button>
                    </div>
                  )
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }, [getValues, renderInput, handleNext]);
  
  const renderSummary = useCallback(() => (
    <div id={`step-${questions.length + 1}`} className="h-full w-full flex flex-col items-center justify-center p-4">
      {isSubmitting ? (
          <div className="text-center flex flex-col items-center justify-center min-h-[300px]">
            <Loader className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight">Analyzing Your Responses...</h2>
            <p className="text-muted-foreground text-lg">Our AI is crafting your personalized insights.</p>
          </div>
        ) : (
          summary && (
            <>
              {showConfetti && <Confetti />}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.5 }} 
                className="w-full h-full flex items-center justify-center"
              >
                <Card className="relative z-10 bg-card/70 border-primary/50 backdrop-blur-lg max-w-2xl mx-auto shadow-2xl shadow-primary/20 w-full max-h-[90vh] flex flex-col">
                  <CardHeader className="flex-shrink-0 text-center">
                    <CardTitle className="flex items-center justify-center gap-3 text-3xl sm:text-4xl font-bold text-primary tracking-tighter">
                      <Sparkles className="w-8 h-8"/> Your Insights Report
                    </CardTitle>
                    <CardDescription>Based on your survey responses.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 py-0">
                     <ScrollArea className="h-full w-full pr-6">
                        <div className="whitespace-pre-wrap text-left p-4 my-4 bg-black/20 rounded-lg border border-primary/20 text-base sm:text-lg">
                          {summary}
                        </div>
                        <p className="mt-6 text-center font-bold text-lg sm:text-xl flex items-center justify-center gap-2"><CheckCircle className="text-green-500"/>Thank you for your valuable insights!</p>
                    </ScrollArea>
                  </CardContent>
                  <CardFooter className="flex-shrink-0 pt-6">
                    <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
                        <Button onClick={() => window.location.reload()}>Start Over</Button>
                        <Button
                          variant="outline"
                          className="bg-transparent border-2 border-sky-500 text-sky-400 hover:bg-sky-500 hover:text-white"
                          onClick={() => {
                            const shareText = `I just uncovered my online shopping habits with Q-Commerce Insights! Get your own analysis. #QCommerceInsights`;
                            const shareUrl = new URL('https://twitter.com/intent/tweet');
                            shareUrl.searchParams.set('text', shareText);
                            shareUrl.searchParams.set('url', 'https://q-commerce-insights.web.app/'); // Replace with your actual app URL for the card to work
                            window.open(shareUrl.toString(), '_blank');
                          }}
                        >
                          <XIcon className="mr-2 h-4 w-4 fill-current" />
                          Share on X
                        </Button>
                      </div>
                  </CardFooter>
                </Card>
              </motion.div>
            </>
          )
        )}
    </div>
  ), [isSubmitting, summary, showConfetti]);

  const showProgress = !isIntro && !summary && !isSubmitting;

  return (
    <main className="relative h-screen w-full bg-background overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 via-transparent to-transparent"></div>
        <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[200px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-30%] right-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[200px] opacity-30 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative w-full h-full flex items-center">
        {showProgress && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
            <div className="relative h-64 w-2 rounded-full overflow-hidden bg-primary/20">
              <motion.div
                className="absolute top-0 w-full bg-primary"
                style={{ height: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
          </div>
        )}
        
        <div className={cn(
          "flex-1 h-full flex flex-col items-center justify-center",
          showProgress && "pl-12 pr-4" 
        )}>
            <FormProvider {...methods}>
                <form id={formId} onSubmit={handleSubmit(onSubmit)} className="h-full w-full max-w-lg">
                    <div ref={mainContainerRef} className="h-full w-full overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isIntro ? 'intro' : summary ? 'summary' : currentStep}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            transition={{ duration: 0.5, ease: 'easeInOut' }}
                            className="h-full w-full flex-shrink-0"
                        >
                            <ActiveScreen 
                                isIntro={isIntro}
                                summary={summary}
                                isSubmitting={isSubmitting}
                                currentStep={currentStep}
                                renderIntro={renderIntro}
                                renderSummary={renderSummary}
                                renderQuestion={renderQuestion}
                            />
                        </motion.div>
                    </AnimatePresence>
                    </div>
                </form>
            </FormProvider>
        </div>

        {showProgress && (
          <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
              <Button type="button" variant="ghost" onClick={handlePrev} disabled={isIntro || currentStep === 0}>
                <ArrowUp className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" onClick={handleNext} disabled={isLastQuestion || !!currentQuestion && (currentQuestion.type === 'likert' || currentQuestion.type === 'radio' || (currentQuestion.type === 'radio-other' && watch('gender') !== 'other'))}>
                 <ArrowDown className="h-5 w-5" />
              </Button>
          </div>
        )}
      </div>
    </main>
  );
}
