import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Save, Mail, Shield, DollarSign, Bell, AlertTriangle, UserX } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [gmailConnected, setGmailConnected] = useState(true);
  const [autoProcessing, setAutoProcessing] = useState(true);
  const [donationAmount, setDonationAmount] = useState("1.00");
  const [autoReplyTemplate, setAutoReplyTemplate] = useState(`Hello,

Thank you for your email. To help manage my inbox and reduce spam, I use an email filtering system that requires a small $1 donation for unknown senders to ensure your message reaches me.

This one-time payment grants you permanent access to my inbox for future emails.

Please complete your donation here: {DONATION_LINK}

Once your donation is confirmed, your original email will be delivered to my inbox and you'll be added to my known contacts list.

Thank you for understanding!

Best regards,
Email Guardian System`);

  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your configuration has been updated successfully.",
    });
  };

  const revokeGmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/gmail/revoke", { userId: user?.id });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Gmail revoke error response:', errorText);
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      const result = await res.json();
      console.log('Gmail access revoked successfully:', result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Gmail Access Revoked",
        description: "Your Gmail account has been disconnected and access revoked.",
      });
      logout();
      setLocation("/setup");
    },
    onError: (error: any) => {
      console.error('Gmail revoke mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke Gmail access",
        variant: "destructive",
      });
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/user/${user?.id}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Delete account error response:', errorText);
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      const result = await res.json();
      console.log('Account deleted successfully:', result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted.",
      });
      // Clear the query cache to remove deleted user from login list
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      logout();
      setLocation("/setup");
    },
    onError: (error: any) => {
      console.error('Delete account mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    }
  });

  const handleConnectGmail = () => {
    // This would trigger the Gmail OAuth flow
    window.location.href = "/api/auth/gmail";
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header 
          title="Settings" 
          subtitle={`Configure your email filtering and donation system • Connected: ${user?.email}`}
          gmailStatus={gmailConnected ? "connected" : "disconnected"}
        />
        
        <div className="p-8 space-y-8">
          {/* Gmail Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="text-blue-600" size={20} />
                <span>Gmail Integration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Gmail Connection Status</Label>
                  <p className="text-sm text-gray-500">Connect your Gmail account to enable email filtering</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant={gmailConnected ? "default" : "destructive"} className={gmailConnected ? "bg-green-100 text-green-700" : ""}>
                    {gmailConnected ? "Connected" : "Disconnected"}
                  </Badge>
                  <Button onClick={handleConnectGmail} variant={gmailConnected ? "outline" : "default"}>
                    {gmailConnected ? "Reconnect" : "Connect Gmail"}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Auto-Process Emails (Always On)</Label>
                  <p className="text-sm text-gray-500">System automatically processes emails every 5 minutes</p>
                </div>
                <Switch checked={true} disabled={true} />
              </div>
            </CardContent>
          </Card>

          {/* Donation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="text-green-600" size={20} />
                <span>Donation Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="donationAmount" className="text-base font-medium">Donation Amount (USD)</Label>
                <p className="text-sm text-gray-500 mb-2">Amount required for unknown senders to access your inbox</p>
                <Input
                  id="donationAmount"
                  type="number"
                  min="0.50"
                  max="100.00"
                  step="0.01"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* Auto-Reply Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="text-purple-600" size={20} />
                <span>Auto-Reply Template</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="autoReplyTemplate" className="text-base font-medium">Email Template</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Message sent to unknown senders. Use {"{DONATION_LINK}"} as placeholder for the payment link.
                </p>
                <Textarea
                  id="autoReplyTemplate"
                  value={autoReplyTemplate}
                  onChange={(e) => setAutoReplyTemplate(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="text-red-600" size={20} />
                <span>Security & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Automatically Whitelist Donors</Label>
                  <p className="text-sm text-gray-500">Add donors to known contacts after successful payment</p>
                </div>
                <Switch checked={true} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications for new donations and filtered emails</p>
                </div>
                <Switch checked={true} />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="text-red-600" size={20} />
                <span>Danger Zone</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  These actions will permanently affect your account and cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div>
                    <h3 className="font-medium text-gray-900">Revoke Gmail Access</h3>
                    <p className="text-sm text-gray-600">
                      Disconnect your Gmail account and revoke all API permissions. This will stop email filtering immediately.
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => revokeGmailMutation.mutate()}
                    disabled={revokeGmailMutation.isPending}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    {revokeGmailMutation.isPending ? "Revoking..." : "Revoke Access"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <h3 className="font-medium text-gray-900">Delete Account</h3>
                    <p className="text-sm text-gray-600">
                      Permanently delete your account, contacts, and all data. Gmail access will also be revoked.
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={deleteAccountMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <UserX className="mr-2" size={16} />
                    {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="flex items-center space-x-2">
              <Save size={16} />
              <span>Save Settings</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
