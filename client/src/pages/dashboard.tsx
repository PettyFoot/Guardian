import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { StatsCard } from "@/components/ui/stats-card";
import { EmailItem } from "@/components/ui/email-item";
import { DonationItem } from "@/components/ui/donation-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Filter, 
  Clock, 
  DollarSign, 
  Users, 
  UserPlus, 
  CheckCircle,
  RotateCcw,
  Heart,
  Play
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [intervalDialogOpen, setIntervalDialogOpen] = useState(false);
  const [charityDialogOpen, setCharityDialogOpen] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newInterval, setNewInterval] = useState(user?.emailCheckInterval || "1.0");
  const [newCharityName, setNewCharityName] = useState(user?.charityName || "Email Guardian");

  // Manual sync mutation
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/manual-sync");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email filtering started",
        description: "Checking for new emails now...",
      });
      // Refresh dashboard stats
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Could not start manual sync",
        variant: "destructive",
      });
    }
  });

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/contacts", {
        email: email.trim(),
        isWhitelisted: true
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contact added",
        description: `${newContactEmail} has been whitelisted`,
      });
      setNewContactEmail("");
      setContactDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add contact",
        description: error.message || "Could not add contact",
        variant: "destructive",
      });
    }
  });

  // Update interval mutation
  const updateIntervalMutation = useMutation({
    mutationFn: async (interval: string) => {
      const res = await apiRequest("PUT", `/api/user/${user?.id}/email-interval`, {
        emailCheckInterval: parseFloat(interval)
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Interval updated",
        description: `Email checking interval set to ${newInterval} minutes`,
      });
      setIntervalDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update interval",
        description: error.message || "Could not update interval",
        variant: "destructive",
      });
    }
  });

  // Update charity name mutation
  const updateCharityMutation = useMutation({
    mutationFn: async (charityName: string) => {
      const res = await apiRequest("PUT", `/api/user/${user?.id}/charity-name`, {
        charityName: charityName.trim()
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Charity name updated",
        description: `Charity name set to "${newCharityName}"`,
      });
      setCharityDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update charity name", 
        description: error.message || "Could not update charity name",
        variant: "destructive",
      });
    }
  });

  const handleManualSync = () => {
    manualSyncMutation.mutate();
  };

  const handleAddContact = () => {
    if (!newContactEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    addContactMutation.mutate(newContactEmail);
  };

  const handleUpdateInterval = () => {
    updateIntervalMutation.mutate(newInterval);
  };

  const handleUpdateCharity = () => {
    if (!newCharityName.trim()) {
      toast({
        title: "Charity name required",
        description: "Please enter a charity name",
        variant: "destructive",
      });
      return;
    }
    updateCharityMutation.mutate(newCharityName);
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/dashboard/stats?userId=${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: pendingEmails, isLoading: emailsLoading } = useQuery({
    queryKey: ["/api/pending-emails", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pending-emails?userId=${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: recentDonations, isLoading: donationsLoading } = useQuery({
    queryKey: ["/api/donations/recent", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/donations/recent?userId=${user?.id}&limit=5`);
      return res.json();
    },
    enabled: !!user?.id
  });

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Monitor your email filtering and donation system • Connected: {user?.email}
            </p>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <StatsCard
              title="Emails Filtered Today"
              value={stats?.emailsFiltered || 0}
              icon={Filter}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
              trend={
                stats?.emailsFilteredYesterday > 0 
                  ? `${Math.round(((stats?.emailsFiltered || 0) - stats?.emailsFilteredYesterday) / stats?.emailsFilteredYesterday * 100)}%`
                  : stats?.emailsFiltered > 0 ? "+100%" : "0%"
              }
              trendText="from yesterday"
              trendType={
                (stats?.emailsFiltered || 0) >= (stats?.emailsFilteredYesterday || 0) ? "positive" : "negative"
              }
            />
            
            <StatsCard
              title="Pending Donations"
              value={stats?.pendingDonations || 0}
              icon={Clock}
              iconColor="text-orange-600"
              iconBg="bg-orange-50"
              subtext={`$${(stats?.pendingDonationsRevenue || 0).toFixed(2)} potential revenue`}
            />
            
            <StatsCard
              title="Donations Received"
              value={`$${(stats?.donationsReceived || 0).toFixed(2)}`}
              icon={DollarSign}
              iconColor="text-green-600"
              iconBg="bg-green-50"
              subtext={`${stats?.donationsCount || 0} successful donations this month`}
            />
            
            <div className="relative">
              <StatsCard
                title="Known Contacts"
                value={stats?.knownContacts || 0}
                icon={Users}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
                trend={
                  stats?.contactsAddedThisWeek > 0 
                    ? `+${stats?.contactsAddedThisWeek} added`
                    : "No new contacts"
                }
                trendText="this week"
                trendType={stats?.contactsAddedThisWeek > 0 ? "positive" : "neutral"}
              />
              <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm"
                    className="absolute bottom-4 right-4 h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                    data-testid="button-add-contact"
                  >
                    <UserPlus size={16} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Contact</DialogTitle>
                    <DialogDescription>
                      Add an email address to your whitelist so their messages go directly to your inbox.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@example.com"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        data-testid="input-contact-email"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddContact} data-testid="button-save-contact">
                        Add Contact
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Email Queue and Recent Donations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Pending Email Queue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pending Email Queue</CardTitle>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  {stats?.pendingDonations || 0} waiting
                </Badge>
              </CardHeader>
              <CardContent>
                {emailsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingEmails?.slice(0, 3).map((email: any) => (
                      <EmailItem key={email.id} email={email} />
                    ))}
                    
                    <Button variant="outline" className="w-full">
                      View All Pending Emails
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Donations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Donations</CardTitle>
                <span className="text-sm text-gray-500">Last 24 hours</span>
              </CardHeader>
              <CardContent>
                {donationsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentDonations?.map((donation: any) => (
                      <DonationItem key={donation.id} donation={donation} />
                    ))}
                    
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Total Today:</span>
                        <span className="font-semibold text-gray-900">
                          ${recentDonations?.reduce((sum: number, d: any) => sum + parseFloat(d.amount), 0).toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>



          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center space-y-3 p-6 h-auto"
                  onClick={handleManualSync}
                  data-testid="button-manual-sync"
                >
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                    <Play className="text-green-600" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-900">Gmail API</p>
                    <p className="text-sm text-green-600">Run Filter Now</p>
                  </div>
                </Button>

                <Dialog open={intervalDialogOpen} onOpenChange={setIntervalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center space-y-3 p-6 h-auto"
                      data-testid="button-edit-interval"
                    >
                      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                        <RotateCcw className="text-blue-600" size={24} />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-900">Auto-Sync</p>
                        <p className="text-sm text-blue-600">Every {user?.emailCheckInterval || 1} min</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Email Check Interval</DialogTitle>
                      <DialogDescription>
                        Configure how often the system should check for new emails to filter.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="interval">Check Emails Every</Label>
                        <Select value={newInterval} onValueChange={setNewInterval}>
                          <SelectTrigger data-testid="select-interval">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.5">30 seconds</SelectItem>
                            <SelectItem value="1.0">1 minute</SelectItem>
                            <SelectItem value="5.0">5 minutes</SelectItem>
                            <SelectItem value="15.0">15 minutes</SelectItem>
                            <SelectItem value="30.0">30 minutes</SelectItem>
                            <SelectItem value="60.0">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIntervalDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateInterval} data-testid="button-save-interval">
                          Update Interval
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={charityDialogOpen} onOpenChange={setCharityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center space-y-3 p-6 h-auto"
                      data-testid="button-edit-charity"
                    >
                      <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
                        <Heart className="text-purple-600" size={24} />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-900">Charity</p>
                        <p className="text-sm text-purple-600">{user?.charityName || 'Email Guardian'}</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Charity Name</DialogTitle>
                      <DialogDescription>
                        Set the charity name that appears in donation requests sent to unknown senders.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="charityName">Charity Name</Label>
                        <Input
                          id="charityName"
                          type="text"
                          placeholder="Your Charity Name"
                          value={newCharityName}
                          onChange={(e) => setNewCharityName(e.target.value)}
                          data-testid="input-charity-name"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setCharityDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateCharity} data-testid="button-save-charity">
                          Update Name
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Sidebar>
  );
}
