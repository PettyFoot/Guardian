import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Mail, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

function ExistingUserLogin() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
  });

  if (!users || users.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {users.map((user: any) => (
        <Button 
          key={user.id}
          variant="ghost"
          onClick={() => {
            login(user);
            setLocation("/");
          }}
          className="text-sm w-full justify-start"
        >
          Continue as {user.email}
        </Button>
      ))}
    </div>
  );
}

export default function Setup() {
  const [, setLocation] = useLocation();
  const [userEmail, setUserEmail] = useState("");
  const [authInProgress, setAuthInProgress] = useState(false);
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  // Check for OAuth callback code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const email = localStorage.getItem('pending_auth_email');
    
    if (code && email) {
      handleGmailCallback.mutate({ code, email });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('pending_auth_email');
    }
  }, []);

  const handleGmailCallback = useMutation({
    mutationFn: async ({ code, email }: { code: string; email: string }) => {
      const res = await apiRequest("POST", "/api/auth/gmail/callback", { code, email });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Authentication failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      login(data.user);
      toast({
        title: "Gmail Connected!",
        description: "Your email filtering system is now active.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      console.error('Gmail callback error:', error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to connect Gmail account",
        variant: "destructive",
      });
      setAuthInProgress(false);
    }
  });

  const getGmailAuthUrl = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/auth/gmail");
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('pending_auth_email', userEmail);
      window.location.href = data.authUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize Gmail authentication",
        variant: "destructive",
      });
      setAuthInProgress(false);
    }
  });

  const handleGmailAuth = () => {
    if (!userEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your Gmail address",
        variant: "destructive",
      });
      return;
    }

    setAuthInProgress(true);
    getGmailAuthUrl.mutate();
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Email Guardian</h1>
          <p className="text-gray-600 text-lg">
            Set up your donation-based email filtering system in just a few steps
          </p>
        </div>

        {/* Setup Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="text-blue-600" size={24} />
              <span>Connect Your Gmail Account</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Email Guardian needs access to your Gmail account to filter incoming emails. 
                We only read emails and manage labels - we never delete or modify your email content.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-base font-medium">Your Gmail Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="mt-2"
                  disabled={authInProgress}
                />
              </div>

              <Button 
                onClick={handleGmailAuth}
                disabled={!isValidEmail(userEmail) || authInProgress || handleGmailCallback.isPending}
                className="w-full bg-primary hover:bg-blue-700 text-white py-3"
                size="lg"
              >
                {authInProgress || handleGmailCallback.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    {handleGmailCallback.isPending ? "Completing Setup..." : "Connecting to Gmail..."}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2" size={16} />
                    Connect Gmail Account
                    <ArrowRight className="ml-2" size={16} />
                  </>
                )}
              </Button>

              <div className="text-center mt-4 space-y-2">
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/demo")}
                  className="text-sm w-full"
                >
                  Try Demo Mode Instead
                </Button>
                
                <ExistingUserLogin />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <Card>
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="text-blue-600" size={24} />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Email Filtering</h3>
                <p className="text-sm text-gray-500">
                  Unknown senders will be filtered and prompted to donate $1
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Automatic Processing</h3>
                <p className="text-sm text-gray-500">
                  Paid emails are automatically moved to your inbox
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Mail className="text-purple-600" size={24} />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Contact Management</h3>
                <p className="text-sm text-gray-500">
                  Known contacts bypass the filter completely
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Your data is secure and encrypted. We follow Gmail's security best practices.</p>
        </div>
      </div>
    </div>
  );
}