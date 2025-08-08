import { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Save, Mail, Shield, DollarSign, Bell, AlertTriangle, UserX, Clock, Trash2, CreditCard, Building2, Plus, CheckCircle } from "lucide-react";

function CleanupButton({ userId }: { userId?: string }) {
  const { toast } = useToast();
  
  const cleanupMutation = useMutation({
    mutationFn: () => fetch('/api/cleanup-duplicate-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).then(res => res.json()),
    onSuccess: (data: any) => {
      toast({
        title: "Cleanup Complete",
        description: `${data.cleaned} duplicate emails removed`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <Button
      onClick={() => cleanupMutation.mutate()}
      variant="outline"
      size="sm"
      disabled={cleanupMutation.isPending}
      data-testid="button-cleanup-duplicates"
    >
      <Trash2 size={16} className="mr-1" />
      {cleanupMutation.isPending ? 'Cleaning...' : 'Clean Up'}
    </Button>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [gmailConnected, setGmailConnected] = useState(true);
  const [autoProcessing, setAutoProcessing] = useState(true);
  const [donationAmount, setDonationAmount] = useState("1.00");
  const [emailCheckInterval, setEmailCheckInterval] = useState("1.0");
  const [useAiResponses, setUseAiResponses] = useState(false);
  const [selectedCharityId, setSelectedCharityId] = useState("");
  const [useCustomCharity, setUseCustomCharity] = useState(false);
  const [customCharity, setCustomCharity] = useState({
    name: "",
    contact: "",
    address: "",
    phone: "",
    email: ""
  });
  const [autoReplyTemplate, setAutoReplyTemplate] = useState(`Hello,

Thank you for your email. To help manage my inbox and reduce spam, I use an email filtering system that requires a small $1 donation for unknown senders to ensure your message reaches me.

This one-time payment grants you permanent access to my inbox for future emails.

Please complete your donation here: {DONATION_LINK}

Once your donation is confirmed, your original email will be delivered to my inbox and you'll be added to my known contacts list.

Thank you for understanding!

Best regards,
Email Guardian System`);

  const { toast } = useToast();

  // Fetch available charities
  const { data: charities = [], isLoading: charitiesLoading } = useQuery({
    queryKey: ['/api/charities'],
    queryFn: async () => {
      const response = await fetch('/api/charities');
      if (!response.ok) {
        throw new Error('Failed to fetch charities');
      }
      return response.json();
    }
  });

  // Get the current charity name for display
  const getCurrentCharityName = () => {
    if (useCustomCharity) {
      return customCharity.name || "Custom Charity";
    } else if (selectedCharityId) {
      const selectedCharity = charities.find((c: { id: string; name: string }) => c.id === selectedCharityId);
      return selectedCharity?.name || "Selected Charity";
    }
    return "No Charity Selected";
  };

  // Load user's current settings
  useEffect(() => {
    if ((user as any)?.emailCheckInterval) {
      setEmailCheckInterval((user as any).emailCheckInterval);
    }
    if ((user as any)?.useAiResponses !== undefined) {
      setUseAiResponses((user as any).useAiResponses);
    }
  }, [user]);

  const updateIntervalMutation = useMutation({
    mutationFn: async (intervalMinutes: number) => {
      const res = await apiRequest("PATCH", `/api/user/${user?.id}/email-check-interval`, { 
        intervalMinutes 
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update email check interval');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Check Interval Updated",
        description: "Your email check frequency has been updated successfully.",
      });
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email check interval",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your configuration has been updated successfully.",
    });
  };

  const handleIntervalChange = (value: string) => {
    setEmailCheckInterval(value);
    const intervalMinutes = parseFloat(value);
    updateIntervalMutation.mutate(intervalMinutes);
  };

  const updateAiResponseMutation = useMutation({
    mutationFn: async (useAi: boolean) => {
      const res = await apiRequest("PATCH", `/api/user/${user?.id}/ai-responses`, { 
        useAiResponses: useAi 
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update AI response setting');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Response Setting Updated",
        description: "Your AI response preference has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI response setting",
        variant: "destructive",
      });
    }
  });

  const updateCharitySelectionMutation = useMutation({
    mutationFn: async (charityData: any) => {
      const res = await apiRequest("PATCH", `/api/user/${user?.id}/charity-selection`, { 
        charityData 
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update charity selection');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Charity Selection Updated",
        description: "Your charity selection has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update charity selection",
        variant: "destructive",
      });
    }
  });

  // Set default charity if user doesn't have one selected
  useEffect(() => {
    if (user && charities.length > 0 && !charitiesLoading) {
      // Check if user has a charity selected (either charityId or customCharityData)
      const hasCharitySelected = (user as any)?.charityId || (user as any)?.customCharityData;
      
      if (!hasCharitySelected) {
        // Select a random charity from the available list
        const eligibleCharities = charities.filter((charity: any) => charity.stripeOnboardingComplete);
        
        if (eligibleCharities.length > 0) {
          const randomCharity = eligibleCharities[Math.floor(Math.random() * eligibleCharities.length)];
          
          // Automatically save the random charity selection
          updateCharitySelectionMutation.mutate({
            type: 'selected',
            charityId: randomCharity.id,
            charity: randomCharity
          });
          
          // Update local state
          setSelectedCharityId(randomCharity.id);
          setUseCustomCharity(false);
          
          // Show notification to user
          toast({
            title: "Default Charity Selected",
            description: `"${randomCharity.name}" has been automatically selected as your default charity. You can change this in your settings.`,
          });
        }
      } else if ((user as any)?.charityId) {
        // User has a selected charity, update local state
        setSelectedCharityId((user as any).charityId);
        setUseCustomCharity(false);
      } else if ((user as any)?.customCharityData) {
        // User has a custom charity, update local state
        try {
          const customCharityData = JSON.parse((user as any).customCharityData);
          setCustomCharity(customCharityData);
          setUseCustomCharity(true);
        } catch (error) {
          console.error('Error parsing custom charity data:', error);
        }
      }
    }
  }, [user, charities, charitiesLoading, updateCharitySelectionMutation, toast]);

  const handleCharitySelection = () => {
    if (useCustomCharity) {
      // Save custom charity
      updateCharitySelectionMutation.mutate({
        type: 'custom',
        charity: customCharity
      });
    } else if (selectedCharityId) {
      // Save selected charity
      const selectedCharity = charities.find((c: any) => c.id === selectedCharityId);
      if (selectedCharity) {
        updateCharitySelectionMutation.mutate({
          type: 'selected',
          charityId: selectedCharityId,
          charity: selectedCharity
        });
      }
    }
  };

  const handleCustomCharityToggle = (checked: boolean) => {
    setUseCustomCharity(checked);
    if (checked) {
      setSelectedCharityId("");
    } else {
      setCustomCharity({
        name: "",
        contact: "",
        address: "",
        phone: "",
        email: ""
      });
    }
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
    <Sidebar>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure your email filtering and donation system • Connected: {user?.email}
            </p>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
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
                  <p className="text-sm text-gray-500">System automatically processes emails based on your configured interval</p>
                </div>
                <Switch checked={true} disabled={true} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium flex items-center space-x-2">
                    <Clock size={16} />
                    <span>Email Check Interval</span>
                  </Label>
                  <p className="text-sm text-gray-500">How often to check for new emails (lower values increase API usage)</p>
                </div>
                <div className="w-48">
                  <Select value={emailCheckInterval} onValueChange={handleIntervalChange} disabled={updateIntervalMutation.isPending}>
                    <SelectTrigger data-testid="select-email-interval">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">30 seconds</SelectItem>
                      <SelectItem value="1.0">1 minute</SelectItem>
                      <SelectItem value="2.0">2 minutes</SelectItem>
                      <SelectItem value="5.0">5 minutes</SelectItem>
                      <SelectItem value="10.0">10 minutes</SelectItem>
                      <SelectItem value="15.0">15 minutes</SelectItem>
                      <SelectItem value="30.0">30 minutes</SelectItem>
                      <SelectItem value="60.0">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                  {updateIntervalMutation.isPending && (
                    <p className="text-sm text-gray-500 mt-1">Updating...</p>
                  )}
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>API Usage Notice:</strong> Shorter check intervals (30 seconds - 2 minutes) will increase Gmail API usage. 
                  Google provides a free quota of 1 billion API calls per day, so this shouldn't be a concern for normal usage. 
                  The system efficiently checks only emails newer than the last check time.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Combined Donation & Charity Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="text-green-600" size={20} />
                <span>Donation & Charity Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Donation Amount */}
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

              {/* Current Charity Display */}
              <div>
                <Label className="text-base font-medium">Current Charity</Label>
                <p className="text-sm text-gray-500 mb-2">The charity that will receive donations from your email filtering system</p>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-sm font-medium text-gray-900">{getCurrentCharityName()}</p>
                  <p className="text-xs text-gray-500 mt-1">This appears in Stripe payment descriptions</p>
                </div>
              </div>

              {/* Charity Selection Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Use Custom Charity</Label>
                  <p className="text-sm text-gray-500">Toggle to add a custom charity instead of selecting from available ones</p>
                </div>
                <Switch 
                  checked={useCustomCharity}
                  onCheckedChange={handleCustomCharityToggle}
                />
              </div>

              {/* Charity Selection Options */}
              {!useCustomCharity ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Select Available Charity</Label>
                    <p className="text-sm text-gray-500 mb-2">Choose from charities that have completed Stripe onboarding</p>
                    <Select 
                      value={selectedCharityId} 
                      onValueChange={setSelectedCharityId}
                      disabled={charitiesLoading}
                    >
                      <SelectTrigger className="max-w-md">
                        <SelectValue placeholder={charitiesLoading ? "Loading charities..." : "Select a charity"} />
                      </SelectTrigger>
                      <SelectContent>
                        {charities.map((charity: any) => (
                          <SelectItem key={charity.id} value={charity.id}>
                            <div className="flex items-center space-x-2">
                              <span>{charity.name}</span>
                              {charity.stripeOnboardingComplete && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {charities.length === 0 && !charitiesLoading && (
                      <p className="text-sm text-gray-500 mt-2">No charities available. Add a custom charity instead.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Custom Charity Details</Label>
                    <p className="text-sm text-gray-500 mb-4">This charity will be contacted to join Stripe Connect for automated payments</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="custom-charity-name">Charity Name *</Label>
                        <Input
                          id="custom-charity-name"
                          value={customCharity.name}
                          onChange={(e) => setCustomCharity(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter charity name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-charity-contact">Contact Person</Label>
                        <Input
                          id="custom-charity-contact"
                          value={customCharity.contact}
                          onChange={(e) => setCustomCharity(prev => ({ ...prev, contact: e.target.value }))}
                          placeholder="Contact person name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-charity-email">Email *</Label>
                        <Input
                          id="custom-charity-email"
                          type="email"
                          value={customCharity.email}
                          onChange={(e) => setCustomCharity(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="charity@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-charity-phone">Phone</Label>
                        <Input
                          id="custom-charity-phone"
                          value={customCharity.phone}
                          onChange={(e) => setCustomCharity(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="custom-charity-address">Address</Label>
                        <Textarea
                          id="custom-charity-address"
                          value={customCharity.address}
                          onChange={(e) => setCustomCharity(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Enter full address"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Custom charities will be contacted to join Stripe Connect for automated payments. 
                  If they cannot complete Stripe onboarding, payments will need to be processed manually, which may cause delays.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button 
                  onClick={handleCharitySelection}
                  disabled={updateCharitySelectionMutation.isPending || 
                    (useCustomCharity && (!customCharity.name || !customCharity.email)) ||
                    (!useCustomCharity && !selectedCharityId)}
                  className="flex items-center space-x-2"
                >
                  <Save size={16} />
                  <span>
                    {updateCharitySelectionMutation.isPending ? 'Saving...' : 'Save Charity Selection'}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Response Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="text-blue-600" size={20} />
                <span>Email Response Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Use AI-Generated Responses</Label>
                  <p className="text-sm text-gray-500">
                    Generate contextual donation requests that reference the sender's original message. 
                    If disabled, uses the template below.
                  </p>
                </div>
                <Switch 
                  checked={useAiResponses}
                  onCheckedChange={(checked) => {
                    setUseAiResponses(checked);
                    updateAiResponseMutation.mutate(checked);
                  }}
                  disabled={updateAiResponseMutation.isPending}
                  data-testid="switch-ai-responses"
                />
              </div>

              {useAiResponses && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    AI responses analyze each email's content to create personalized donation requests while maintaining the core filtering purpose. 
                    Requires OpenAI API key configuration.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Auto-Reply Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="text-purple-600" size={20} />
                <span>Template Response {useAiResponses ? "(Fallback)" : "(Active)"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="autoReplyTemplate" className="text-base font-medium">Email Template</Label>
                <p className="text-sm text-gray-500 mb-2">
                  {useAiResponses 
                    ? "Used as fallback when AI generation fails. Use {DONATION_LINK} as placeholder for the payment link."
                    : "Message sent to unknown senders. Use {DONATION_LINK} as placeholder for the payment link."
                  }
                </p>
                <Textarea
                  id="autoReplyTemplate"
                  value={autoReplyTemplate}
                  onChange={(e) => setAutoReplyTemplate(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                  disabled={useAiResponses}
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

          {/* Maintenance Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="text-orange-600" size={20} />
                <span>Maintenance Tools</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Clean Up Auto-Reply Duplicates</Label>
                  <p className="text-sm text-gray-500">Remove duplicate auto-reply emails if any got created by accident</p>
                </div>
                <CleanupButton userId={user?.id} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Test Payment System</Label>
                  <p className="text-sm text-gray-500">Test the Stripe payment integration with a $1 donation</p>
                </div>
                <Button
                  onClick={() => setLocation('/checkout')}
                  variant="outline"
                  size="sm"
                  data-testid="button-test-payment"
                >
                  <CreditCard size={16} className="mr-1" />
                  Test Payment
                </Button>
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
      </div>
    </Sidebar>
  );
}
