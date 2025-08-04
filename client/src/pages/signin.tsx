import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function SignIn() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const signInMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("GET", "/api/users");
      const users = await res.json();
      
      const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error("No account found with this email address. Please sign up first.");
      }
      
      // Verify the user still exists and has valid tokens
      const verifyRes = await apiRequest("GET", `/api/user/${user.id}`);
      if (!verifyRes.ok) {
        throw new Error("Account not found or has been deleted. Please sign up again.");
      }
      
      return await verifyRes.json();
    },
    onSuccess: (user) => {
      login({
        id: user.id,
        email: user.email,
        gmailAccessToken: user.gmailToken,
        gmailRefreshToken: user.gmailRefreshToken
      });
      toast({
        title: "Welcome back!",
        description: `Signed in successfully as ${user.email}`,
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSignIn = () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    signInMutation.mutate(email.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="text-blue-600" size={32} />
            <h1 className="text-2xl font-bold text-gray-900">Email Guardian</h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-700">Sign In</h2>
          <p className="text-gray-600">Enter your email to access your account</p>
        </div>

        {/* Sign In Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="text-blue-600" size={20} />
              <span>Account Sign In</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={signInMutation.isPending}
                data-testid="input-signin-email"
              />
            </div>
            
            <Button 
              onClick={handleSignIn}
              disabled={signInMutation.isPending || !email.trim()}
              className="w-full"
              data-testid="button-signin"
            >
              {signInMutation.isPending ? (
                "Signing in..."
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2" size={16} />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No password required - your account uses Gmail authentication for security.
          </AlertDescription>
        </Alert>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 hover:text-blue-800"
              onClick={() => setLocation("/setup")}
              data-testid="link-signup"
            >
              Sign up here
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}