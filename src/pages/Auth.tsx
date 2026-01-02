import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, User, Lock, Mail, ArrowRight, LayoutGrid, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { USER_ROLES, getRoleLabel } from '@/lib/constants';
import { fetchSystemSettings } from '@/lib/settings';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [signUpEnabled, setSignUpEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("signin");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: USER_ROLES.FIRST_YEAR_COORDINATOR as string,
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchSystemSettings();
        setSignUpEnabled(settings.signUpEnabled);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(formData.email, formData.password);

    if (error) {
      toast({
        title: 'Authentication Failed',
        description: error.message || 'Please check your credentials.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome Back',
        description: 'You have successfully signed in.',
      });
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.fullName,
      formData.role
    );

    if (error) {
      toast({
        title: 'Signup Failed',
        description: error.message || 'Failed to create your account.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Created',
        description: 'Please check your email to confirm your account.',
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-muted/30 font-['Outfit'] p-4 md:p-6 lg:p-8 items-center justify-center">
      <div className="w-full max-w-[1600px] mx-auto grid lg:grid-cols-2 gap-0 rounded-[2.5rem] overflow-hidden bg-background shadow-sm border border-border/50 min-h-[800px]">

        {/* LEFT BRANDING PANEL - Matches Dashboard Sidebar/Header Aesthetic */}
        <div className="hidden lg:flex flex-col justify-between bg-muted/30 p-12 lg:p-16 relative overflow-hidden text-left border-r border-border/50">
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border/50 shadow-sm w-fit">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">EKCTC | Decarto</span>
            </div>

            <h1 className="text-[8rem] xl:text-[10rem] font-black tracking-tighter text-foreground leading-[0.7] text-left">
              <span className="text-[#facc15] text-[0.4em] block mb-2">AAROH</span>
              26
              <span className="text-[0.1em] block uppercase tracking-[0.5em] text-foreground/40 mt-4">Arts Fest</span>
            </h1>

            <div className="h-1.5 w-24 bg-[#facc15] rounded-full"></div>

            <p className="text-xl text-muted-foreground font-medium max-w-sm leading-relaxed text-left">
              The centralized console for cultural orchestration and festival excellence.
            </p>
          </div>

          {/* Decorative Elements matching dashboard blobs */}
          <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#facc15]/5 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#facc15]/10 rounded-full blur-[100px] pointer-events-none"></div>
        </div>

        {/* RIGHT LOGIN FORM - Matches Dashboard Card Aesthetic */}
        <div className="flex items-center justify-center p-8 lg:p-16 relative bg-card h-full">
          <div className="w-full max-w-md space-y-10">
            {/* Mobile Branding Header */}
            <div className="lg:hidden text-center mb-6 space-y-2 relative">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 w-fit mx-auto mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary">EKCTC | Decarto</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">
                Aaroh <span className="text-[#facc15]">26</span>
              </h1>
            </div>

            <div className="text-center lg:text-left space-y-3">
              <h2 className="text-4xl font-black tracking-tight text-foreground">
                {activeTab === 'signin' ? 'Welcome Back' : 'Get Started'}
              </h2>
              
              {/* Logo between heading and welcome message */}
              <div className="flex justify-center lg:justify-start py-4">
                <div className="w-20 h-20 overflow-hidden rounded-xl border-2 border-primary/20 shadow-md">
                  <img 
                    src="/clogo.jpeg" 
                    alt="Aaroh Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <p className="text-base text-muted-foreground font-medium">
                {activeTab === 'signin' ? 'Access your dashboard to continue.' : 'Create your account to join the platform.'}
              </p>
            </div>

            <Tabs defaultValue="signin" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 rounded-xl h-14 mb-8">
                <TabsTrigger
                  value="signin"
                  className="rounded-lg font-bold h-12 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                >
                  Sign In
                </TabsTrigger>
                {signUpEnabled && (
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg font-bold h-12 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                  >
                    Sign Up
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="signin" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Register Number or Email</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                      <Input
                        className="pl-12 h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-xl transition-all font-medium"
                        placeholder="e.g., EKC1234 or student@gmail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground ml-1">
                      <span className="font-bold text-primary">Students:</span> Use your register number. <span className="font-bold text-primary">Coordinators:</span> Use your email.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                      <Input
                        type={showSignInPassword ? "text" : "password"}
                        className="pl-12 pr-12 h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-xl transition-all font-medium"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-4 top-3.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                      >
                        {showSignInPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-primary/20 mt-4" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Access Dashboard'}
                  </Button>
                </form>
              </TabsContent>

              {signUpEnabled && (
                <TabsContent value="signup" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                        <Input
                          className="pl-12 h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-xl transition-all font-medium"
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                        <Input
                          type="email"
                          className="pl-12 h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-xl transition-all font-medium"
                          placeholder="student@college.edu"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                        <Input
                          type={showSignUpPassword ? "text" : "password"}
                          className="pl-12 pr-12 h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-xl transition-all font-medium"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-4 top-3.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                        >
                          {showSignUpPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Identity</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger className="h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/20 rounded-xl transition-all font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl bg-popover">
                          {Object.values(USER_ROLES)
                            .filter(value => value !== 'admin')
                            .map((value) => (
                              <SelectItem key={value} value={value} className="focus:bg-primary focus:text-primary-foreground font-medium cursor-pointer my-1 text-foreground">
                                {getRoleLabel(value)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-primary/20 mt-4" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              )}
            </Tabs>

            <div className="pt-6 border-t border-border/40 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
                © 2026 Aaroh · EKCTC · Powered By Decarto
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mt-1">
                Developed By Elevates
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}