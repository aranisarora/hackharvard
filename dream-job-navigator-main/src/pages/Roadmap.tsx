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
  Loader2
} from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/storage';
import { UserProfile, RoadmapTask, ChecklistItem, MentorInfo } from '@/types';
import { callGeminiWithContext } from '@/lib/gemini';

// Demo roadmap data
const demoTasks: RoadmapTask[] = [
  {
    id: '1',
    category: 'skills',
    title: 'Complete Python Data Analysis Course',
    description: 'Master pandas, numpy, and data visualization libraries to enhance your data analysis capabilities.',
    checklist: [
      { id: '1a', text: 'Complete Week 1: Python Basics', isCompleted: true },
      { id: '1b', text: 'Complete Week 2: Pandas Fundamentals', isCompleted: true },
      { id: '1c', text: 'Complete Week 3: Data Visualization', isCompleted: false },
      { id: '1d', text: 'Final Project: Dashboard Analysis', isCompleted: false },
    ],
    deadline: '2025-02-15',
    isCompleted: false,
    courseLink: 'https://www.coursera.org/learn/python-data-analysis',
    mentor: {
      name: 'Dr. Sarah Chen',
      title: 'Senior Data Scientist',
      company: 'Google',
      email: 'sarah.chen@example.com'
    }
  },
  {
    id: '2',
    category: 'certifications',
    title: 'AWS Solutions Architect Certification',
    description: 'Obtain the AWS Solutions Architect Professional certification to demonstrate cloud expertise.',
    checklist: [
      { id: '2a', text: 'Study networking concepts', isCompleted: true },
      { id: '2b', text: 'Complete practice exams', isCompleted: false },
      { id: '2c', text: 'Schedule and pass exam', isCompleted: false },
    ],
    deadline: '2025-03-01',
    isCompleted: false,
    courseLink: 'https://aws.amazon.com/certification/',
    mentor: {
      name: 'Michael Roberts',
      title: 'Cloud Architect',
      company: 'Amazon',
      email: 'michael.r@example.com'
    }
  },
  {
    id: '3',
    category: 'projects',
    title: 'Build ML Portfolio Project',
    description: 'Create an end-to-end machine learning project showcasing your abilities.',
    checklist: [
      { id: '3a', text: 'Define project scope and dataset', isCompleted: true },
      { id: '3b', text: 'Build and train model', isCompleted: false },
      { id: '3c', text: 'Deploy to cloud', isCompleted: false },
      { id: '3d', text: 'Write documentation', isCompleted: false },
    ],
    deadline: '2025-04-01',
    isCompleted: false,
    mentor: {
      name: 'Alex Johnson',
      title: 'ML Engineer',
      company: 'OpenAI',
      email: 'alex.j@example.com'
    }
  },
  {
    id: '4',
    category: 'cv-feedback',
    title: 'Rewrite Experience Section',
    description: 'Restructure your professional experience to highlight leadership and quantifiable achievements.',
    checklist: [
      { id: '4a', text: 'Add metrics to each role', isCompleted: false },
      { id: '4b', text: 'Emphasize leadership examples', isCompleted: false },
      { id: '4c', text: 'Use action verbs', isCompleted: false },
    ],
    deadline: '2025-01-20',
    isCompleted: false,
  },
  {
    id: '5',
    category: 'experience',
    title: 'Lead a Cross-Functional Project',
    description: 'Take initiative to lead a project involving multiple teams to demonstrate leadership capability.',
    checklist: [
      { id: '5a', text: 'Identify opportunity', isCompleted: true },
      { id: '5b', text: 'Get stakeholder buy-in', isCompleted: true },
      { id: '5c', text: 'Execute and document results', isCompleted: false },
    ],
    deadline: '2025-05-01',
    isCompleted: false,
    mentor: {
      name: 'Jennifer Lee',
      title: 'Engineering Manager',
      company: 'Meta',
      email: 'jen.lee@example.com'
    }
  },
];

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
  const [tasks, setTasks] = useState<RoadmapTask[]>(demoTasks);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set(['1']));
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
    setTasks(tasks.map(task => {
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
    }));
  };

  const getTaskProgress = (task: RoadmapTask) => {
    const completed = task.checklist.filter(item => item.isCompleted).length;
    return Math.round((completed / task.checklist.length) * 100);
  };

  const getOverallProgress = () => {
    const totalItems = tasks.reduce((acc, task) => acc + task.checklist.length, 0);
    const completedItems = tasks.reduce((acc, task) => 
      acc + task.checklist.filter(item => item.isCompleted).length, 0
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
      const systemPrompt = `You are a helpful career advisor assistant for PathForge, a platform that helps users achieve their dream careers. 
      
The user's profile:
- Target Job: ${user?.targetJob}
- Target Company: ${user?.targetCompany}
- Timeline: ${user?.timeframe}

Current roadmap tasks:
${tasks.map(t => `- ${t.title}: ${t.description} (${getTaskProgress(t)}% complete)`).join('\n')}

Provide helpful, specific advice about their career journey and tasks. Be encouraging but practical.`;

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
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <FileText className="h-5 w-5" />
            CV Editor
          </Link>
          <Link
            to="/roadmap"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
      <main className="ml-64 p-8 pb-24">
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
              <h1 className="text-2xl font-bold text-foreground">Your Roadmap</h1>
              <p className="text-sm text-muted-foreground">
                Step-by-step path to becoming {user.targetJob} at {user.targetCompany}
              </p>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">Overall Progress</h3>
              <p className="text-sm text-muted-foreground">
                {tasks.filter(t => t.isCompleted).length} of {tasks.length} tasks completed
              </p>
            </div>
            <span className="text-2xl font-bold text-primary">{getOverallProgress()}%</span>
          </div>
          <Progress value={getOverallProgress()} className="h-3" />
        </div>

        {/* Task Categories */}
        <div className="space-y-8">
          {Object.entries(categoryConfig).map(([category, config]) => {
            const categoryTasks = groupedTasks[category] || [];
            if (categoryTasks.length === 0) return null;

            const CategoryIcon = config.icon;

            return (
              <div key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <CategoryIcon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{config.label}</h2>
                  <span className="text-sm text-muted-foreground">
                    ({categoryTasks.filter(t => t.isCompleted).length}/{categoryTasks.length})
                  </span>
                </div>

                <div className="space-y-4">
                  {categoryTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-card border border-border rounded-xl overflow-hidden"
                    >
                      {/* Task Header */}
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {task.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium ${task.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {task.title}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {new Date(task.deadline).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {getTaskProgress(task)}% complete
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={getTaskProgress(task)} className="w-24 h-2" />
                          {expandedTasks.has(task.id) ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {expandedTasks.has(task.id) && (
                        <div className="p-4 pt-0 border-t border-border mt-2">
                          <p className="text-sm text-muted-foreground mb-4">
                            {task.description}
                          </p>

                          {/* Checklist */}
                          <div className="space-y-2 mb-4">
                            {task.checklist.map((item) => (
                              <label
                                key={item.id}
                                className="flex items-center gap-3 cursor-pointer group"
                              >
                                <button
                                  onClick={() => toggleChecklistItem(task.id, item.id)}
                                  className={`
                                    w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                                    ${item.isCompleted 
                                      ? 'bg-success border-success' 
                                      : 'border-border group-hover:border-primary'
                                    }
                                  `}
                                >
                                  {item.isCompleted && (
                                    <CheckCircle2 className="h-3 w-3 text-success-foreground" />
                                  )}
                                </button>
                                <span className={`text-sm ${item.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                  {item.text}
                                </span>
                              </label>
                            ))}
                          </div>

                          {/* Course Link & Mentor */}
                          <div className="flex flex-wrap gap-4">
                            {task.courseLink && (
                              <a
                                href={task.courseLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View Course
                              </a>
                            )}
                            {task.mentor && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                Mentor: {task.mentor.name} ({task.mentor.title} at {task.mentor.company})
                              </div>
                            )}
                          </div>

                          {/* Certificate Upload for Skills/Certifications */}
                          {(task.category === 'skills' || task.category === 'certifications') && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <p className="text-sm text-muted-foreground mb-2">
                                Upload your certificate to mark as complete:
                              </p>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                                  <Upload className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-foreground">Upload Certificate</span>
                                </div>
                                <input type="file" className="hidden" accept=".pdf,.jpg,.png" />
                              </label>
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
      </main>

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors z-50"
      >
        {showChat ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-96 bg-card border border-border rounded-xl shadow-xl z-50 flex flex-col max-h-[500px]">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Career Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask questions about your roadmap</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
            {chatMessages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Ask me anything about your career journey!</p>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type your question..."
                className="flex-1"
              />
              <Button size="icon" onClick={sendChatMessage} disabled={isChatLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roadmap;
