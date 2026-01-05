
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Route, 
  Target,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  User,
  LogOut,
  Calendar,
  ExternalLink,
  MessageCircle,
  Send,
  X,
  Upload,
  CheckCircle2,
  Circle,
  Briefcase,
  GraduationCap,
  Award,
  Loader2,
  Sparkles
} from 'lucide-react';
import { getCurrentUser, logout, getUserRoadmap, saveRoadmap, getUserTargetCV } from '@/lib/storage';
import { UserProfile, RoadmapTask } from '@/types';
import { callGeminiWithContext, generateRoadmap } from '@/lib/gemini';
import { toast } from 'sonner';

const categoryConfig = {
  skills: { label: 'Skills to Learn', icon: Briefcase, color: 'text-primary', bgColor: 'bg-primary/10' },
  certifications: { label: 'Certifications', icon: GraduationCap, color: 'text-warning', bgColor: 'bg-warning/10' },
  projects: { label: 'Projects', icon: Target, color: 'text-success', bgColor: 'bg-success/10' },
  experience: { label: 'Experience', icon: FileText, color: 'text-secondary-foreground', bgColor: 'bg-secondary' },
  'cv-feedback': { label: 'CV Improvements', icon: Award, color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

const Roadmap = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);

    // Load purely from storage. No demo data.
    const existingRoadmap = getUserRoadmap(currentUser.id);
    if (existingRoadmap && existingRoadmap.length > 0) {
      setTasks(existingRoadmap);
      setExpandedTasks(new Set([existingRoadmap[0].id]));
    }
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleGenerateRoadmap = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const targetCV = getUserTargetCV(user.id);
      
      if (!targetCV) {
        toast.info("Generating roadmap based on profile only. For better results, use CV Editor first.");
      }

      const generatedTasks = await generateRoadmap(user, targetCV);
      setTasks(generatedTasks);
      saveRoadmap(user.id, generatedTasks);
      
      if (generatedTasks.length > 0) {
        setExpandedTasks(new Set([generatedTasks[0].id]));
      }
      toast.success("Roadmap generated successfully!");
    } catch (error) {
      console.error("Error generating roadmap:", error);
      toast.error("Failed to generate roadmap. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const toggleChecklistItem = (taskId: string, itemId: string) => {
    if (!user) return;

    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const updatedChecklist = task.checklist.map(item => {
          if (item.id === itemId) {
            return { ...item, isCompleted: !item.isCompleted };
          }
          return item;
        });
        const allCompleted = updatedChecklist.every(item => item.isCompleted);
        return { ...task, checklist: updatedChecklist, isCompleted: allCompleted };
      }
      return task;
    });

    setTasks(updatedTasks);
    saveRoadmap(user.id, updatedTasks);
  };

  const getTaskProgress = (task: RoadmapTask) => {
    if (!task.checklist || task.checklist.length === 0) return task.isCompleted ? 100 : 0;
    const completed = task.checklist.filter(item => item.isCompleted).length;
    return Math.round((completed / task.checklist.length) * 100);
  };

  const getOverallProgress = () => {
    if (tasks.length === 0) return 0;
    const totalItems = tasks.reduce((acc, task) => acc + (task.checklist?.length || 0), 0);
    if (totalItems === 0) return 0;
    const completedItems = tasks.reduce((acc, task) => 
      acc + (task.checklist?.filter(item => item.isCompleted).length || 0), 0
    );
    return Math.round((completedItems / totalItems) * 100);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const systemPrompt = `You are a career advisor assistant. 
      User Profile: ${user?.targetJob} at ${user?.targetCompany}.
      Roadmap Status: ${tasks.length} tasks, ${getOverallProgress()}% complete.
      Tasks: ${tasks.map(t => t.title).join(', ')}.
      
      Answer the user's question specifically about their roadmap.`;

      const response = await callGeminiWithContext(systemPrompt, userMessage, []);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const groupedTasks = Object.keys(categoryConfig).reduce((acc, category) => {
    acc[category] = tasks.filter(t => t.category === category);
    return acc;
  }, {} as Record<string, RoadmapTask[]>);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border p-6 flex flex-col">
        <div className="mb-8">
          <Link to="/dashboard" className="text-xl font-bold text-foreground">PathForge</Link>
        </div>
        <nav className="flex-1 space-y-2">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Target className="h-5 w-5" />
            Dashboard
          </Link>
          <Link to="/cv-editor" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <FileText className="h-5 w-5" />
            CV Editor
          </Link>
          <Link to="/roadmap" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium">
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
              <p className="text-xs text-muted-foreground truncate">{user.targetJob}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Roadmap</h1>
              <p className="text-sm text-muted-foreground">Step-by-step path to {user.targetJob}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleGenerateRoadmap} disabled={isGenerating}>
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : (tasks.length > 0 ? 'Regenerate Plan' : 'Generate Roadmap')}
          </Button>
        </div>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-pulse">
            <div className="p-4 bg-primary/10 rounded-full">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Creating Your Blueprint</h2>
              <p className="text-muted-foreground">Analyzing success patterns for {user.targetJob}...</p>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-card border border-border rounded-xl border-dashed">
            <div className="p-4 bg-muted rounded-full mb-6">
              <Route className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Roadmap Yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Generate a personalized roadmap based on your current profile and target job.
            </p>
            <Button onClick={handleGenerateRoadmap} size="lg" variant="hero">
              Generate My Roadmap
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Overall Progress</h3>
                <span className="text-2xl font-bold text-primary">{getOverallProgress()}%</span>
              </div>
              <Progress value={getOverallProgress()} className="h-3" />
            </div>

            <div className="space-y-8">
              {Object.entries(categoryConfig).map(([category, config]) => {
                const categoryTasks = groupedTasks[category] || [];
                if (categoryTasks.length === 0) return null;
                const CategoryIcon = config.icon;

                return (
                  <div key={category} className="fade-in">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <CategoryIcon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">{config.label}</h2>
                    </div>

                    <div className="space-y-4">
                      {categoryTasks.map((task) => (
                        <div key={task.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                          <button onClick={() => toggleTask(task.id)} className="w-full p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-4 flex-1">
                              {task.isCompleted ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                              <div>
                                <h3 className={`font-medium ${task.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</h3>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Due: {new Date(task.deadline).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={getTaskProgress(task)} className="w-24 h-2 hidden sm:block" />
                              {expandedTasks.has(task.id) ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </button>

                          {expandedTasks.has(task.id) && (
                            <div className="p-4 pt-0 border-t border-border mt-2 bg-accent/5">
                              <p className="text-sm text-muted-foreground mb-4 mt-4">{task.description}</p>
                              <div className="space-y-2 mb-4 bg-background p-4 rounded-lg border border-border/50">
                                {task.checklist.map((item) => (
                                  <label key={item.id} className="flex items-start gap-3 cursor-pointer group p-1.5 hover:bg-accent rounded">
                                    <button onClick={() => toggleChecklistItem(task.id, item.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${item.isCompleted ? 'bg-success border-success' : 'border-border'}`}>
                                      {item.isCompleted && <CheckCircle2 className="h-3 w-3 text-success-foreground" />}
                                    </button>
                                    <span className={`text-sm ${item.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.text}</span>
                                  </label>
                                ))}
                              </div>
                              {task.mentor && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 bg-muted rounded-md">
                                  <User className="h-4 w-4" /> Suggested Mentor: <span className="font-medium text-foreground">{task.mentor.name}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <button onClick={() => setShowChat(!showChat)} className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 z-50">
        {showChat ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {showChat && (
        <div className="fixed bottom-24 right-6 w-96 bg-card border border-border rounded-xl shadow-xl z-50 flex flex-col max-h-[500px]">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-foreground">Career Assistant</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
            {chatMessages.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Ask me about your roadmap!</p>}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>{msg.content}</div>
              </div>
            ))}
            {isChatLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 border-t border-border bg-background rounded-b-xl flex gap-2">
            <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()} placeholder="Ask a question..." className="flex-1" />
            <Button size="icon" onClick={sendChatMessage} disabled={isChatLoading}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roadmap;
