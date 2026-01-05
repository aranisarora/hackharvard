import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2 } from 'lucide-react';
import { getUserByEmail, setCurrentUser } from '@/lib/storage';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const user = getUserByEmail(email);
    if (!user) {
      setError('No account found with this email.');
      setIsLoading(false);
      return;
    }

    if (user.password !== password) {
      setError('Incorrect password.');
      setIsLoading(false);
      return;
    }

    setCurrentUser(user);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6">
        <Link to="/" className="text-xl font-bold text-foreground">
          PathForge
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to continue your journey</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="text-lg py-6"
              />
            </div>
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="text-lg py-6"
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/onboarding" className="text-primary hover:underline font-medium">Get started</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;