
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Upload, Check, Loader2 } from 'lucide-react';
import { UserProfile, OnboardingStep } from '@/types';
import { saveUser, setCurrentUser, generateId, getUserByEmail } from '@/lib/storage';
import { extractTextFromPDF } from '@/lib/pdfUtils';
import { toast } from 'sonner';

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    type: 'text',
    question: "Welcome to PathForge! I'm here to help you reach your dream career. Let's start with your email address.",
    field: 'email',
    required: true,
    placeholder: 'your@email.com',
  },
  {
    id: 'password',
    type: 'password',
    question: "Great! Now create a secure password for your account.",
    field: 'password',
    required: true,
    placeholder: '••••••••',
    validation: (value: string) => value.length < 8 ? 'Password must be at least 8 characters' : null,
  },
  {
    id: 'age',
    type: 'number',
    question: "How old are you? This helps us tailor recommendations to your career stage.",
    field: 'age',
    required: true,
    placeholder: '25',
  },
  {
    id: 'location',
    type: 'text',
    question: "Where are you currently based?",
    field: 'location',
    required: true,
    placeholder: 'San Francisco, CA',
    suggestions: ['San Francisco, CA', 'New York, NY', 'London, UK', 'Singapore', 'Remote'],
  },
  {
    id: 'gender',
    type: 'select',
    question: "How do you identify? (Optional - helps us personalize your experience)",
    field: 'gender',
    required: false,
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
  },
  {
    id: 'targetJob',
    type: 'text',
    question: "What's your dream job title? Be as specific as you'd like.",
    field: 'targetJob',
    required: true,
    placeholder: 'Senior Product Manager',
    suggestions: ['Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer', 'Marketing Manager'],
  },
  {
    id: 'targetCompany',
    type: 'text',
    question: "Which company would you love to work at?",
    field: 'targetCompany',
    required: true,
    placeholder: 'Google',
    suggestions: ['Google', 'Apple', 'Microsoft', 'Amazon', 'Meta', 'Netflix'],
  },
  {
    id: 'targetSalary',
    type: 'text',
    question: "What's your target salary range?",
    field: 'targetSalary',
    required: true,
    placeholder: '$150,000 - $200,000',
    suggestions: ['$80,000 - $100,000', '$100,000 - $150,000', '$150,000 - $200,000', '$200,000+'],
  },
  {
    id: 'weeklyHours',
    type: 'number',
    question: "How many hours per week can you dedicate to improving your CV and skills?",
    field: 'weeklyHours',
    required: true,
    placeholder: '10',
  },
  {
    id: 'timeframe',
    type: 'text',
    question: "When do you want to be ready to apply? This helps us set realistic deadlines.",
    field: 'timeframe',
    required: true,
    placeholder: '6 months',
    suggestions: ['3 months', '6 months', '1 year', '2 years'],
  },
  {
    id: 'cv',
    type: 'file',
    question: "Perfect! Now upload your current CV so we can analyze it.",
    field: 'cvFile',
    required: true,
    placeholder: 'Upload PDF',
  },
];

interface FollowUpQuestion {
  id: string;
  type: 'text';
  question: string;
  field: keyof UserProfile;
  required: boolean;
  suggestions?: string[];
  placeholder?: string;
  validation?: (value: string) => string | null;
}

const followUpQuestions: FollowUpQuestion[] = [
  {
    id: 'followup-0',
    type: 'text',
    question: "What are your passions outside of work? These can help identify transferable skills.",
    field: 'passions',
    required: false,
    suggestions: ['Technology & Innovation', 'Writing & Communication', 'Teaching & Mentoring', 'Problem Solving'],
  },
  {
    id: 'followup-1',
    type: 'text',
    question: "Do you have any geographic restrictions or preferences for your next role?",
    field: 'geographicRestrictions',
    required: false,
    suggestions: ['Open to relocation', 'Remote only', 'Hybrid preferred', 'Must stay in current city'],
  },
  {
    id: 'followup-2',
    type: 'text',
    question: "What specific aspects of your target role excite you the most?",
    field: 'additionalGoals',
    required: false,
    suggestions: ['Leadership opportunities', 'Technical challenges', 'Impact & innovation', 'Work-life balance'],
  },
];

type AllStepTypes = OnboardingStep | FollowUpQuestion;

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [extractedResumeText, setExtractedResumeText] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allSteps: AllStepTypes[] = showFollowUp 
    ? [...onboardingSteps, ...followUpQuestions]
    : onboardingSteps;

  const currentQuestion = allSteps[currentStep];
  const totalSteps = allSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentStep]);

  const handleNext = async () => {
    if (!currentQuestion) return;

    // Validation
    if (currentQuestion.required && !inputValue && currentQuestion.type !== 'file') {
      setError('This field is required');
      return;
    }

    if (currentQuestion.validation) {
      const validationError = currentQuestion.validation(inputValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Check for existing user
    if (currentQuestion.field === 'email') {
      const existingUser = getUserByEmail(inputValue);
      if (existingUser) {
        setError('An account with this email already exists. Please sign in.');
        return;
      }
    }

    // File upload handling
    if (currentQuestion.type === 'file') {
      if (!cvFile) {
        setError('Please upload your CV');
        return;
      }
      if (isProcessingPDF) {
        setError('Please wait while we process your CV...');
        return;
      }
    }

    setError(null);

    // Update form data
    const updatedData = { ...formData };
    if (currentQuestion.type === 'file') {
      updatedData.cvFile = cvFile as any;
      updatedData.resumeText = extractedResumeText;
    } else if (currentQuestion.type === 'number') {
      (updatedData as any)[currentQuestion.field] = parseInt(inputValue) || 0;
    } else {
      (updatedData as any)[currentQuestion.field] = inputValue;
    }
    setFormData(updatedData);

    // Move to next step
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setInputValue('');
    } else if (!showFollowUp && currentStep === onboardingSteps.length - 1) {
      // Start follow-up questions
      setShowFollowUp(true);
      setCurrentStep(onboardingSteps.length);
      setInputValue('');
    } else {
      // Complete onboarding
      await completeOnboarding(updatedData);
    }
  };

  const completeOnboarding = async (data: Partial<UserProfile>) => {
    setIsLoading(true);
    
    const user: UserProfile = {
      id: generateId(),
      email: data.email || '',
      password: data.password || '',
      age: data.age || 0,
      location: data.location || '',
      gender: data.gender,
      targetJob: data.targetJob || '',
      targetCompany: data.targetCompany || '',
      targetSalary: data.targetSalary || '',
      weeklyHours: data.weeklyHours || 0,
      timeframe: data.timeframe || '',
      passions: data.passions || '',
      geographicRestrictions: data.geographicRestrictions || '',
      additionalGoals: data.additionalGoals || '',
      createdAt: new Date().toISOString(),
      resumeText: data.resumeText || '', // Save extracted text
    };

    saveUser(user);
    setCurrentUser(user);
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      setCvFile(file);
      setError(null);
      setIsProcessingPDF(true);
      
      try {
        const text = await extractTextFromPDF(file);
        setExtractedResumeText(text);
        toast.success("CV processed successfully!");
      } catch (err) {
        console.error(err);
        setError("Failed to read PDF. Please try a different file.");
        toast.error("Failed to read PDF.");
      } finally {
        setIsProcessingPDF(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="container mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-foreground">
            PathForge
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div
            key={currentStep}
            className="space-y-8 fade-in"
          >
            {/* Question */}
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-relaxed">
              {currentQuestion?.question}
            </h2>

            {/* Input Area */}
            <div className="space-y-4">
              {currentQuestion?.type === 'file' ? (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                      transition-colors duration-200
                      ${cvFile 
                        ? 'border-success bg-success-muted' 
                        : 'border-border hover:border-primary hover:bg-accent'
                      }
                    `}
                  >
                    {isProcessingPDF ? (
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Reading PDF...</span>
                      </div>
                    ) : cvFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
                          <Check className="h-5 w-5 text-success-foreground" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-foreground">{cvFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(cvFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="text-foreground font-medium">
                          Click to upload your CV
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PDF format only
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : currentQuestion?.type === 'select' && 'options' in currentQuestion ? (
                <div className="flex flex-wrap gap-3">
                  {currentQuestion.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => setInputValue(option)}
                      className={`
                        px-4 py-3 rounded-lg border transition-all duration-200
                        ${inputValue === option 
                          ? 'border-primary bg-primary/5 text-foreground' 
                          : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type={currentQuestion?.type === 'password' ? 'password' : currentQuestion?.type === 'number' ? 'number' : 'text'}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setError(null);
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder={currentQuestion?.placeholder}
                    className="text-lg py-6 px-4"
                  />
                </div>
              )}

              {/* Suggestions */}
              {currentQuestion?.suggestions && !inputValue && (
                <div className="flex flex-wrap gap-2">
                  {currentQuestion.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 text-sm rounded-full border border-border bg-card hover:bg-accent hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-destructive text-sm fade-in">
                  {error}
                </p>
              )}
            </div>

            {/* Continue Button */}
            <Button
              variant="hero"
              size="lg"
              onClick={handleNext}
              disabled={isLoading || isProcessingPDF}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your profile...
                </>
              ) : currentStep === totalSteps - 1 ? (
                <>
                  Complete Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {/* Skip option for optional fields */}
            {!currentQuestion?.required && (
              <button
                onClick={() => {
                  setInputValue('');
                  handleNext();
                }}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip this question
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingPage;
