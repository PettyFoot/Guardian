import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Shield, Mail, CheckCircle, ArrowRight, User } from "lucide-react";

// Mock user data for demo
const DEMO_USER = {
  id: "demo-user-123",
  email: "demo@example.com",
  gmailAccessToken: "demo-token",
  gmailRefreshToken: "demo-refresh"
};

export default function Demo() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartDemo = () => {
    setIsLoading(true);
    
    // Simulate login delay
    setTimeout(() => {
      login(DEMO_USER);
      setLocation("/");
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Try Email Guardian Demo</h1>
          <p className="text-gray-600 text-lg">
            Explore the full interface with sample data
          </p>
        </div>

        {/* Demo Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="text-orange-500" size={24} />
              <span>Demo Mode</span>
              <Badge variant="secondary" className="ml-2">No Gmail Required</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Demo mode lets you explore all features with sample data. No Gmail account or API keys needed!
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">What you'll see in demo mode:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Sample filtered emails waiting for donations</li>
                  <li>• Mock donation transactions and earnings</li>
                  <li>• Contact management interface</li>
                  <li>• Dashboard with analytics and metrics</li>
                  <li>• Complete settings and configuration pages</li>
                </ul>
              </div>

              <Button 
                onClick={handleStartDemo}
                disabled={isLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Loading Demo...
                  </>
                ) : (
                  <>
                    <User className="mr-2" size={16} />
                    Start Demo
                    <ArrowRight className="ml-2" size={16} />
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/setup")}
                  className="text-sm"
                >
                  <Mail className="mr-2" size={14} />
                  Set up real Gmail integration instead
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Demo data resets when you refresh the page</p>
        </div>
      </div>
    </div>
  );
}