import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, FileText, Route, BarChart3 } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-foreground text-background">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            PathForge
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-medium text-background/80 hover:text-background transition-colors">
              Sign in
            </Link>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/onboarding">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text Content */}
            <div className="space-y-8 slide-up">
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Career Acceleration Platform
                </p>
                <h1 className="text-foreground leading-[1.1]">
                  Bridge the gap to your{' '}
                  <span className="text-primary">dream career</span>
                </h1>
              </div>
              
              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                AI-powered guidance that analyzes your current qualifications against your target role, 
                creating a personalized roadmap to success.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/onboarding">
                    Start Your Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="xl" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>

              <div className="pt-8 border-t border-border">
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-3xl font-bold text-foreground">94%</p>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">2.4x</p>
                    <p className="text-sm text-muted-foreground">Faster Hiring</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">10K+</p>
                    <p className="text-sm text-muted-foreground">Users</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Product Cards */}
            <div className="relative stagger-children">
              <div className="space-y-4">
                {/* Card 1 - CV Analysis */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">CV Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        AI compares your CV against top performers at your target company
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full w-3/4 bg-primary rounded-full" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">75%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2 - Target CV */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-success/10 rounded-lg">
                      <Target className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">Target CV Generation</h4>
                      <p className="text-sm text-muted-foreground">
                        See exactly what your CV should look like for your dream role
                      </p>
                      <div className="mt-3 flex gap-2">
                        <span className="px-2 py-1 bg-success-muted text-success text-xs rounded-md font-medium">
                          +5 Skills
                        </span>
                        <span className="px-2 py-1 bg-primary-muted text-primary text-xs rounded-md font-medium">
                          +2 Certs
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3 - Roadmap */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-warning/10 rounded-lg">
                      <Route className="h-5 w-5 text-warning" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">Personalized Roadmap</h4>
                      <p className="text-sm text-muted-foreground">
                        Step-by-step tasks with deadlines, courses, and mentors
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-4 h-4 rounded bg-success flex items-center justify-center">
                            <span className="text-success-foreground">✓</span>
                          </div>
                          <span className="text-muted-foreground">Complete Python certification</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-4 h-4 rounded border border-border" />
                          <span className="text-muted-foreground">Build portfolio project</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4 - Progress */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-secondary rounded-lg">
                      <BarChart3 className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">Track Progress</h4>
                      <p className="text-sm text-muted-foreground">
                        Visual dashboard showing your journey to qualification
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative gradient */}
              <div className="absolute -z-10 -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16 fade-in">
            <h2 className="text-foreground mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A systematic approach to career advancement, powered by AI and real industry data
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 stagger-children">
            {[
              {
                step: '01',
                title: 'Define Your Goal',
                description: 'Tell us your dream job, target company, and timeline. Our AI understands your aspirations.'
              },
              {
                step: '02',
                title: 'Get Your Blueprint',
                description: 'Receive a personalized target CV and detailed roadmap based on successful employees.'
              },
              {
                step: '03',
                title: 'Execute & Track',
                description: 'Complete tasks, earn certifications, and watch your progress toward your dream role.'
              }
            ].map((item) => (
              <div
                key={item.step}
                className="bg-card border border-border rounded-xl p-8"
              >
                <span className="text-4xl font-bold text-primary/20">{item.step}</span>
                <h3 className="mt-4 mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="fade-in">
            <h2 className="text-foreground mb-4">Ready to transform your career?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join thousands of professionals who have successfully landed their dream roles.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link to="/onboarding">
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © 2025 PathForge. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
