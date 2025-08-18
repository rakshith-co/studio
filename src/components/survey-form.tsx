'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BarChart, CheckCircle, Clock, FileText, Loader, Share2, Sparkles, Twitter } from 'lucide-react';

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
  const [direction, setDirection] = useState(1);
  const [isIntro, setIsIntro] = useState(true);

  const { toast } = useToast();

  const methods = useForm<SurveySchema>({
    resolver: zodResolver(surveySchema),
    mode: 'onChange',
  });

  const { formState: { errors }, watch, trigger, getValues } = methods;

  const currentQuestion = useMemo(() => questions[step], [step]);
  const isQuestion = currentQuestion?.type !== 'header';
  const currentQuestionIndex = isQuestion ? questionOnlyQuestions.findIndex(q => q.id === currentQuestion.id) : -1;
  const totalQuestions = questionOnlyQuestions.length;

  const progress = useMemo(() => {
    if (currentQuestionIndex === -1) {
      if (step === 0) return 0;
      const prevQuestionIndex = questionOnlyQuestions.findIndex(q => q.id === questions[step - 1]?.id);
      return ((prevQuestionIndex + 1) / totalQuestions) * 100;
    }
    return ((currentQuestionIndex) / totalQuestions) * 100;
  }, [currentQuestionIndex, totalQuestions, step]);


  useEffect(() => {
    if (progress === 100) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const handleNext = async () => {
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
      setShowConfetti(true);
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
            className="gap-4"
          >
            {question.options?.map((option) => (
              <div key={option.value} className="flex items-center">
                <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                <Label htmlFor={`${question.id}-${option.value}`} className="ml-3 text-lg cursor-pointer hover:text-primary transition-colors">{option.label}</Label>
              </div>
            ))}
            {question.type === 'radio-other' && (
               <>
                <div className="flex items-center">
                    <RadioGroupItem value="other" id={`${question.id}-other`} />
                    <Label htmlFor={`${question.id}-other`} className="ml-3 text-lg cursor-pointer">Other</Label>
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
          <div className="flex flex-col sm:flex-row justify-center gap-2 md:gap-4 w-full">
            {likertOptions.map(option => (
              <Button
                key={option.value}
                type="button"
                variant={watchedValue === option.value ? 'default' : 'secondary'}
                className={cn(
                  `flex-1 transition-all duration-200 transform hover:scale-105 rounded-full px-2 py-6 text-xs sm:text-sm`,
                  watchedValue === option.value 
                    ? 'bg-primary text-primary-foreground shadow-[0_0_25px_rgba(224,36,36,0.8)]' 
                    : 'bg-secondary/50 text-secondary-foreground hover:bg-primary/80 backdrop-blur-sm'
                )}
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

  if (isIntro) {
    return (
        <div className="w-full max-w-5xl mx-auto text-center">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Logo className="mx-auto h-20 w-20 text-primary mb-4" />
                <h1 className="text-5xl md:text-7xl font-bold font-headline tracking-tighter">Q-Commerce Insights</h1>
                <p className="text-muted-foreground text-lg md:text-xl mt-4 max-w-2xl mx-auto">Uncover the hidden psychological tricks in your favorite quick commerce apps.</p>
            </motion.div>
            
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto"
                initial="hidden"
                animate="visible"
                variants={{
                    visible: { transition: { staggerChildren: 0.2 } }
                }}
            >
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <Card className="bg-card/50 backdrop-blur-sm border-primary/20 h-full shadow-[0_0_20px_rgba(224,36,36,0.2)]">
                        <CardHeader className="items-center">
                            <FileText className="w-10 h-10 text-primary"/>
                            <CardTitle>Questions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{totalQuestions}</p>
                            <p className="text-muted-foreground">in-depth questions</p>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <Card className="bg-card/50 backdrop-blur-sm border-primary/20 h-full shadow-[0_0_20px_rgba(224,36,36,0.2)]">
                        <CardHeader className="items-center">
                            <Clock className="w-10 h-10 text-primary"/>
                            <CardTitle>Duration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">~{Math.ceil(totalQuestions * 0.25)}</p>
                            <p className="text-muted-foreground">minutes to complete</p>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <Card className="bg-card/50 backdrop-blur-sm border-primary/20 h-full shadow-[0_0_20px_rgba(224,36,36,0.2)]">
                        <CardHeader className="items-center">
                            <BarChart className="w-10 h-10 text-primary"/>
                            <CardTitle>Reward</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg font-bold">Personalized Summary</p>
                            <p className="text-muted-foreground">of your app behavior</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }}>
                <Button size="lg" className="mt-12 text-lg font-bold tracking-wider rounded-full bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(224,36,36,0.7)]" onClick={() => setIsIntro(false)}>
                    Start Your Analysis <ArrowRight className="ml-2" />
                </Button>
            </motion.div>
        </div>
    )
  }

  const renderContent = () => {
    if (isSubmitting) {
      return (
        <div className="text-center flex flex-col items-center justify-center min-h-[300px]">
          <Loader className="mx-auto h-16 w-16 animate-spin text-primary" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Analyzing Your Responses...</h2>
          <p className="text-muted-foreground text-lg">Our AI is crafting your personalized insights.</p>
        </div>
      );
    }
    if (summary) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
           {showConfetti && <Confetti />}
          <Card className="bg-card/50 border-primary/50 backdrop-blur-lg max-w-2xl mx-auto text-center shadow-2xl shadow-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-3 text-4xl font-bold text-primary tracking-tighter">
                <Sparkles className="w-8 h-8"/> Your Insights Report
              </CardTitle>
              <CardDescription>Based on your survey responses.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg whitespace-pre-wrap font-medium p-4 bg-black/20 rounded-lg">{summary}</p>
              <p className="mt-6 font-bold text-xl flex items-center justify-center gap-2"><CheckCircle className="text-green-500"/>Thank you for your valuable insights!</p>
              <div className="mt-6 flex justify-center gap-4">
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
      );
    }
    
    let questionText = currentQuestion.text;
    if (currentQuestion.id === 'darkPatternsHeader') {
      const name = getValues('name');
      questionText = `Great ${name ? name : 'you'}, let's identify if you experience dark patterns in quick com app`;
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
              <Card className="bg-card/50 border-primary/20 backdrop-blur-lg shadow-xl shadow-primary/10">
                <CardHeader className="text-center">
                  {isQuestion && (
                    <p className="text-primary font-bold mb-2 tracking-widest">QUESTION {currentQuestionIndex + 1}</p>
                  )}
                  <CardTitle className="text-2xl md:text-3xl font-headline font-bold">{questionText}</CardTitle>
                </CardHeader>
                <CardContent className="my-8 min-h-[120px] flex items-center justify-center">
                  {isQuestion && renderInput(currentQuestion)}
                </CardContent>
              </Card>
              <div className="flex justify-between items-center mt-8">
                <Button type="button" variant="ghost" onClick={handlePrev} disabled={step === 0}>
                  <ArrowLeft className="mr-2" /> Back
                </Button>
                {currentQuestion.type === 'header' ? (
                  <Button type="button" onClick={handleNext} className="bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(224,36,36,0.6)]">
                    Continue <ArrowRight className="ml-2" />
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext} className="bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(224,36,36,0.6)]">
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
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 via-transparent to-transparent"></div>
          <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[200px] opacity-30 animate-pulse"></div>
          <div className="absolute bottom-[-30%] right-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[200px] opacity-30 animate-pulse animation-delay-4000"></div>
        </div>


      <div className="z-10 w-full flex-grow flex items-center justify-center">
        {renderContent()}
      </div>

      {!summary && !isSubmitting && !isIntro && (
        <div className="w-full max-w-3xl fixed bottom-8 px-4 z-20">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
            </div>
          <Progress value={progress} className="h-2 progress-bar-shine" />
        </div>
      )}
    </main>
  );
}
