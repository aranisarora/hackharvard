
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Route, 
  Calendar,
  Clock,
  ChevronRight,
  LogOut,
  User,
  Briefcase,
  GraduationCap,
  Award,
  CheckCircle2,
  Circle,
  Target,
  Sparkles
} from 'lucide-react';
import { getCurrentUser, logout, getUserRoadmap, getUserTargetCV } from '@/lib/storage';
import { UserProfile, RoadmapTask, TargetCV } from '@/types';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapTask[]>([]);
  const [targetCV, setTargetCV] = useState<TargetCV | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    // Load real data from storage
    setRoadmap(getUserRoadmap(currentUser.id));
    setTargetCV(getUserTargetCV(currentUser.id));
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDaysRemaining = () => {
    if (!user?.timeframe) return 0;
    const monthsMatch = user.timeframe.match(/(\d+)/);
    const months = monthsMatch ? parseInt(monthsMatch[0]) : 6;
    return months * 30;
  };

  const getOverallProgress = () => {
    if (targetCV?.progressPercentage) return targetCV.progressPercentage;
    if (!roadmap || roadmap.length === 0) return 0;
    
    // Calculate based on tasks if no Target CV metric
    const totalChecklist = roadmap.reduce((acc, t) => acc + t.checklist.length, 0);
    const completedChecklist = roadmap.reduce((acc, t) => acc + t.checklist.filter(i => i.isCompleted).length, 0);
    
    return totalChecklist === 0 ? 0 : Math.round((completedChecklist / totalChecklist) * 100);
  };

  // Dynamically build category cards from the roadmap data
  const getDashboardCategories = () => {
    const config = [
      { id: 'skills', title: 'Skills', icon: Briefcase, color: 'text-primary', bgColor: 'bg-primary/10' },
      { id: 'projects', title: 'Projects', icon: Target, color: 'text-success', bgColor: 'bg-success/10' },
      { id: 'experience', title: 'Experience', icon: FileText, color: 'text-secondary-foreground', bgColor: 'bg-secondary' },
      { id: 'certifications', title: 'Certifications', icon: GraduationCap, color: 'text-warning', bgColor: 'bg-warning/10' },
      { id: 'cv-feedback', title: 'CV Polish', icon: Award, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    ];

    return config.map(cat => {
      const tasks = roadmap.filter(t => t.category === cat.id);
      if (tasks.length === 0) return null;

      const totalItems = tasks.reduce((acc, t) => acc + t.checklist.length, 0);
      const completedItems = tasks.reduce((acc, t) => acc + t.checklist.filter(i => i.isCompleted).length, 0);
      const progress = totalItems === 0 ? (tasks.some(t => t.isCompleted) ? 100 : 0) : Math.round((completedItems / totalItems) * 100);

      return {
        ...cat,
        tasks: tasks.slice(0, 3),
        progress,
        totalCount: tasks.length,
        completedCount: tasks.filter(t => t.isCompleted).length
      };
    }).filter(Boolean) as any[];
  };

  const dashboardCategories = getDashboardCategories();
  const daysRemaining = getDaysRemaining();
  const overallProgress = getOverallProgress();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border p-6 flex flex-col">
        <div className="mb-8">
          <Link to="/dashboard" className="text-xl font-bold text-foreground">
            PathForge
          </Link>
        </div>

        <nav className="flex-1 space-y-2">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium">
            <Target className="h-5 w-5" />
            Dashboard
          </Link>
          <Link to="/cv-editor" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <FileText className="h-5 w-5" />
            CV Editor
          </Link>
          <Link to="/roadmap" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
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

      <main className="ml-64 p-8">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back!</h1>
              <p className="text-muted-foreground">
                Your journey to <span className="font-medium text-foreground">{user.targetJob}</span> at <span className="font-medium text-foreground">{user.targetCompany}</span>
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Target: {user.timeframe}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">{daysRemaining} days left</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Goal Progress</h3>
                <p className="text-sm text-muted-foreground">Based on your completed roadmap tasks</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/roadmap">
                  View Roadmap <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
        </div>

        {dashboardCategories.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {dashboardCategories.map((category) => (
              <div key={category.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${category.bgColor}`}>
                      <category.icon className={`h-5 w-5 ${category.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category.completedCount}/{category.totalCount} completed
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{category.progress}%</span>
                </div>

                <Progress value={category.progress} className="h-2 mb-4" />

                <div className="space-y-2">
                  {category.tasks.map((task: RoadmapTask) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      {task.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`truncate ${task.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card border border-border rounded-xl border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Your Roadmap is Empty</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We haven't generated your personalized plan yet. Analyze your CV to identify gaps and build your path to {user.targetCompany}.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/cv-editor">Go to CV Editor</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
