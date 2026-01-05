import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Route, 
  Target,
  Download,
  ChevronLeft,
  User,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Pencil,
  Save,
  Loader2
} from 'lucide-react';
import { 
  getCurrentUser, 
  logout, 
  saveTargetCV, 
  getUserTargetCV, 
  saveRoadmap, 
  saveUserCV, 
  getUserCV,
  generateId 
} from '@/lib/storage';
import { analyzeCV, generateRoadmap } from '@/lib/gemini';
import { getTopEmployeeProfiles, formatProfilesForAnalysis } from '@/lib/coresignal';
import { UserProfile, CVSection, TargetCV } from '@/types';
import { toast } from 'sonner';

// Default template if no CV exists
const templateSections: CVSection[] = [
  {
    id: '1',
    type: 'experience',
    title: 'Professional Experience',
    content: '**Position Title** | Company Name | Dates\n- Key achievement 1\n- Key achievement 2\n- Key achievement 3',
    isCompleted: true,
    isGreyedOut: false,
  },
  {
    id: '2',
    type: 'education',
    title: 'Education',
    content: '**Degree Name** | University | Year\n- Relevant coursework or honors',
    isCompleted: true,
    isGreyedOut: false,
  },
  {
    id: '3',
    type: 'skills',
    title: 'Skills',
    content: '**Technical:** Skill 1, Skill 2, Skill 3\n**Soft Skills:** Leadership, Communication',
    isCompleted: true,
    isGreyedOut: false,
  }
];

const CVEditor = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sections, setSections] = useState<CVSection[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState<string[]>([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);

    // Logic for loading initial data:
    // 1. Check if there's a saved manual draft (most recent edits)
    // 2. If not, check if there's a previous analysis result
    // 3. If neither, use the template
    const savedDraft = getUserCV(currentUser.id);
    const savedTargetCV = getUserTargetCV(currentUser.id);

    if (savedDraft && savedDraft.length > 0) {
      setSections(savedDraft);
      // If we also have a target CV, load its feedback but keep draft content
      if (savedTargetCV) {
        setGeneralFeedback(savedTargetCV.generalFeedback);
      }
    } else if (savedTargetCV) {
      setSections(savedTargetCV.sections);
      setGeneralFeedback(savedTargetCV.generalFeedback);
    } else {
      setSections(templateSections);
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getProgress = () => {
    const completed = sections.filter(s => s.isCompleted && !s.isGreyedOut).length;
    return Math.round((completed / Math.max(1, sections.length)) * 100);
  };

  const handleSectionUpdate = (id: string, newContent: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content: newContent } : s));
  };

  const handleSectionTitleUpdate = (id: string, newTitle: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  const handleToggleEdit = () => {
    if (isEditing && user) {
      // User is saving changes
      saveUserCV(user.id, sections);
      toast.success("CV changes saved successfully.");
    }
    setIsEditing(!isEditing);
  };

  const handleDeepAnalysis = async () => {
    if (!user) return;
    
    // Auto-save before analysis
    saveUserCV(user.id, sections);
    
    setIsAnalyzing(true);
    toast.info("Starting Deep Research analysis...");

    try {
      // 1. Get Context 
      const profiles = await getTopEmployeeProfiles(user.targetJob, user.targetCompany);
      const profilesText = formatProfilesForAnalysis(profiles);
      
      // 2. Prepare CV text
      const cvText = sections
        .filter(s => !s.isGreyedOut)
        .map(s => `${s.title}:\n${s.content}`)
        .join('\n\n');

      // 3. Call Gemini Deep Research
      toast.info("Analyzing your profile against top performers...");
      const analysisResult: TargetCV = await analyzeCV(
        cvText, 
        user.targetJob, 
        user.targetCompany, 
        profilesText
      );

      // 3.5 Ensure unique IDs for new sections from AI to prevent key conflicts
      const processedSections = analysisResult.sections.map(s => ({
        ...s,
        id: generateId()
      }));
      const processedResult = { ...analysisResult, sections: processedSections };

      // 4. Update State with Analysis Result
      setSections(processedSections);
      setGeneralFeedback(processedResult.generalFeedback);
      
      // 5. Save Analysis Result
      saveTargetCV(user.id, processedResult);
      // Also save as current draft so they don't lose the "suggested" version
      saveUserCV(user.id, processedSections);

      // 6. Auto-generate Roadmap
      toast.info("Updating your career roadmap...");
      const newRoadmap = await generateRoadmap(user, processedResult);
      saveRoadmap(user.id, newRoadmap);

      toast.success("Deep Research Complete! Roadmap updated.");
      setIsEditing(false);

    } catch (error) {
      console.error(error);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border p-6 flex flex-col">
        <div className="mb-8">
          <Link to="/dashboard" className="text-xl font-bold text-foreground">
            PathForge
          </Link>
        </div>

        <nav className="flex-1 space-y-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Target className="h-5 w-5" />
            Dashboard
          </Link>
          <Link
            to="/cv-editor"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <FileText className="h-5 w-5" />
            CV Editor
          </Link>
          <Link
            to="/roadmap"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Route className="h-5 w-5" />
            Roadmap
          </Link>
        </nav>

        <div className="pt-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground">{user.targetJob}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">CV Editor</h1>
              <p className="text-sm text-muted-foreground">
                Target: {user.targetJob} at {user.targetCompany}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleEdit}
              disabled={isAnalyzing}
            >
              {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
              {isEditing ? 'Save Changes' : 'Edit CV'}
            </Button>
            <Button 
              variant="hero" 
              size="sm" 
              onClick={handleDeepAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isAnalyzing ? 'Analyzing...' : 'Deep Research Analysis'}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              CV Match Score
            </span>
            <span className="text-sm font-bold text-primary">{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* CV Canvas */}
          <div className="lg:col-span-2">
            <div className="canvas-paper p-8 min-h-[800px] shadow-sm">
              {/* Header */}
              <div className="text-center mb-8 pb-6 border-b border-border">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h2>
                <p className="text-muted-foreground">
                  {user.location} • {user.email}
                </p>
              </div>

              {/* CV Sections */}
              <div className="space-y-6">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className={`
                      relative p-4 rounded-lg transition-all duration-200 group
                      ${activeSection === section.id ? 'ring-2 ring-primary' : ''}
                      ${section.isGreyedOut && !isEditing ? 'bg-greyed-bg border border-dashed border-border' : 'hover:bg-accent/50'}
                    `}
                    onClick={() => !isEditing && setActiveSection(section.id)}
                  >
                    {/* Status badge (only view mode) */}
                    {!isEditing && (
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        {section.isGreyedOut ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" /> Missing
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 bg-success-muted rounded text-xs text-success">
                            <CheckCircle2 className="h-3 w-3" /> Included
                          </span>
                        )}
                      </div>
                    )}

                    {isEditing ? (
                      <div className="space-y-2 p-2 bg-background rounded-md border border-border shadow-sm">
                        <Input 
                          value={section.title}
                          onChange={(e) => handleSectionTitleUpdate(section.id, e.target.value)}
                          className="font-bold border-none px-2 text-lg h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
                          placeholder="Section Title"
                        />
                        <Textarea 
                          value={section.content}
                          onChange={(e) => handleSectionUpdate(section.id, e.target.value)}
                          className="min-h-[120px] font-mono text-sm border-0 focus-visible:ring-0 resize-y p-2"
                          placeholder="Enter details here..."
                        />
                        <div className="flex gap-2 justify-end border-t border-border pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSections(sections.filter(s => s.id !== section.id));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className={`font-semibold mb-3 ${section.isGreyedOut ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {section.title}
                        </h3>
                        
                        <div 
                          className={`
                            prose prose-sm max-w-none whitespace-pre-wrap
                            ${section.isGreyedOut ? 'text-muted-foreground italic' : 'text-foreground'}
                          `}
                        >
                          {section.content}
                        </div>

                        {/* Feedback (only view mode) */}
                        {section.feedback && (
                          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                            <p className="text-sm text-primary flex items-start gap-2">
                              <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span className="font-medium">AI Suggestion:</span> {section.feedback}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {isEditing && (
                  <Button 
                    variant="outline" 
                    className="w-full border-dashed py-8 hover:bg-accent/50 text-muted-foreground"
                    onClick={() => setSections([...sections, {
                      id: Date.now().toString(),
                      type: 'experience',
                      title: 'New Section',
                      content: 'Enter details here...',
                      isCompleted: true,
                      isGreyedOut: false
                    }])}
                  >
                    + Add Section
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Feedback */}
          <div className="space-y-6">
            {/* General Feedback */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Analysis Report
              </h3>
              
              {generalFeedback.length > 0 ? (
                <div className="space-y-4">
                  {generalFeedback.map((feedback, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                      <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground/80 leading-relaxed">{feedback}</p>
                    </div>
                  ))}
                  <Button className="w-full mt-4" asChild>
                    <Link to="/roadmap">
                      View Action Plan <ChevronLeft className="h-4 w-4 rotate-180 ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">No analysis run yet.</p>
                  <Button variant="outline" size="sm" onClick={handleDeepAnalysis} disabled={isAnalyzing}>
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run Deep Research'}
                  </Button>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-4">Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm text-muted-foreground">Included in CV</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-dashed border-foreground/50" />
                  <span className="text-sm text-muted-foreground">Gap (Missing from CV)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-sm text-muted-foreground">AI Insight Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CVEditor;