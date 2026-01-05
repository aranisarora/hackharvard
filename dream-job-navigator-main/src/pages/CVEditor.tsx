import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Route, 
  Target,
  Download,
  Eye,
  ChevronLeft,
  User,
  LogOut,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { getCurrentUser, logout, getUserTargetCV } from '@/lib/storage';
import { UserProfile, CVSection } from '@/types';

// Demo CV sections for initial state
const demoCVSections: CVSection[] = [
  {
    id: '1',
    type: 'experience',
    title: 'Professional Experience',
    content: `**Senior Software Engineer** | TechCorp Inc. | 2021 - Present
- Led development of microservices architecture serving 1M+ users
- Mentored team of 5 junior developers
- Reduced deployment time by 60% through CI/CD improvements

**Software Engineer** | StartupXYZ | 2019 - 2021
- Built customer-facing dashboard using React and TypeScript
- Implemented real-time data processing pipeline`,
    isCompleted: true,
    isGreyedOut: false,
    feedback: 'Consider adding more quantifiable metrics to your achievements.',
  },
  {
    id: '2',
    type: 'skills',
    title: 'Technical Skills',
    content: `**Programming:** Python, JavaScript, TypeScript, Go
**Frameworks:** React, Node.js, Django
**Cloud:** AWS (EC2, S3, Lambda), Docker, Kubernetes
**Databases:** PostgreSQL, MongoDB, Redis`,
    isCompleted: true,
    isGreyedOut: false,
  },
  {
    id: '3',
    type: 'skills',
    title: 'Skills to Acquire',
    content: `**Machine Learning:** TensorFlow, PyTorch, ML Pipeline Design
**Leadership:** Executive Communication, Strategic Planning`,
    isCompleted: false,
    isGreyedOut: true,
    feedback: 'These skills are commonly found in successful candidates at your target company.',
  },
  {
    id: '4',
    type: 'education',
    title: 'Education',
    content: `**B.S. Computer Science** | University of California | 2019
- GPA: 3.8/4.0
- Relevant Coursework: Data Structures, Algorithms, Machine Learning`,
    isCompleted: true,
    isGreyedOut: false,
  },
  {
    id: '5',
    type: 'certifications',
    title: 'Certifications',
    content: `**AWS Solutions Architect** | Amazon Web Services | 2023`,
    isCompleted: true,
    isGreyedOut: false,
  },
  {
    id: '6',
    type: 'certifications',
    title: 'Target Certifications',
    content: `**Google Cloud Professional** | Google Cloud | Target: 2025
**Kubernetes Administrator (CKA)** | CNCF | Target: 2025`,
    isCompleted: false,
    isGreyedOut: true,
    feedback: 'Recommended certifications based on job requirements at your target company.',
  },
  {
    id: '7',
    type: 'projects',
    title: 'Projects',
    content: `**Open Source Contribution** | GitHub
- Contributed to popular open-source project with 10K+ stars
- Implemented new feature requested by community`,
    isCompleted: true,
    isGreyedOut: false,
  },
  {
    id: '8',
    type: 'projects',
    title: 'Recommended Projects',
    content: `**ML Portfolio Project** | Build an end-to-end ML pipeline
**Technical Blog** | Publish 3+ articles on engineering topics`,
    isCompleted: false,
    isGreyedOut: true,
    feedback: 'These projects would significantly strengthen your application.',
  },
];

const generalFeedback = [
  'Consider restructuring your experience section to highlight leadership more prominently.',
  'Add more quantifiable metrics to demonstrate impact.',
  'Your technical skills section is strong - maintain this level of detail.',
  'Consider adding a brief professional summary at the top.',
];

const CVEditor = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sections, setSections] = useState<CVSection[]>(demoCVSections);
  const [showDelta, setShowDelta] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getProgress = () => {
    const completed = sections.filter(s => s.isCompleted).length;
    return Math.round((completed / sections.length) * 100);
  };

  const exportPDF = () => {
    // In a real app, this would generate a PDF
    alert('PDF export functionality would be implemented here');
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
              onClick={() => setShowDelta(!showDelta)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showDelta ? 'Hide' : 'Show'} Delta
            </Button>
            <Button variant="default" size="sm" onClick={exportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              CV Completion Progress
            </span>
            <span className="text-sm font-bold text-primary">{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* CV Canvas */}
          <div className="lg:col-span-2">
            <div className="canvas-paper p-8 min-h-[800px]">
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
                      relative p-4 rounded-lg transition-all duration-200
                      ${activeSection === section.id ? 'ring-2 ring-primary' : ''}
                      ${section.isGreyedOut ? 'bg-greyed-bg' : 'hover:bg-accent/50'}
                    `}
                    onClick={() => setActiveSection(section.id)}
                  >
                    {/* Section indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full transition-colors">
                      {section.isGreyedOut ? (
                        <div className="w-full h-full bg-greyed rounded-full" />
                      ) : section.isCompleted ? (
                        <div className="w-full h-full bg-success rounded-full" />
                      ) : (
                        <div className="w-full h-full bg-warning rounded-full" />
                      )}
                    </div>

                    {/* Status badge */}
                    {section.isGreyedOut && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                        <AlertCircle className="h-3 w-3" />
                        Not yet achieved
                      </div>
                    )}

                    <h3 className={`font-semibold mb-3 ${section.isGreyedOut ? 'text-greyed' : 'text-foreground'}`}>
                      {section.title}
                    </h3>
                    
                    <div 
                      className={`
                        prose prose-sm max-w-none
                        ${section.isGreyedOut ? 'text-greyed select-none' : 'text-foreground'}
                      `}
                    >
                      {section.content.split('\n').map((line, idx) => (
                        <p key={idx} className="mb-1 whitespace-pre-wrap">
                          {line.startsWith('**') ? (
                            <strong>{line.replace(/\*\*/g, '')}</strong>
                          ) : line.startsWith('-') ? (
                            <span className="block pl-4">{line}</span>
                          ) : (
                            line
                          )}
                        </p>
                      ))}
                    </div>

                    {section.feedback && activeSection === section.id && (
                      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm text-primary flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          {section.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Feedback & Delta */}
          <div className="space-y-6">
            {/* General Feedback */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-4">General Feedback</h3>
              <div className="space-y-3">
                {generalFeedback.map((feedback, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delta View */}
            {showDelta && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-4">Progress Delta</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-success mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Completed
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 pl-6">
                      <li>• Strong technical skills foundation</li>
                      <li>• Relevant work experience</li>
                      <li>• AWS certification obtained</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-warning mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      In Progress
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 pl-6">
                      <li>• Leadership experience</li>
                      <li>• Quantifiable metrics</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-greyed mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Still Needed
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 pl-6">
                      <li>• ML/AI skills</li>
                      <li>• GCP certification</li>
                      <li>• Technical blog presence</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-4">Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm text-muted-foreground">Needs improvement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-greyed" />
                  <span className="text-sm text-muted-foreground">Not yet achieved (greyed out)</span>
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
