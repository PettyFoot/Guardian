import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { StatsCard } from "@/components/ui/stats-card";
import { EmailItem } from "@/components/ui/email-item";
import { DonationItem } from "@/components/ui/donation-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Shield, 
  Filter, 
  Clock, 
  DollarSign, 
  Users, 
  UserPlus, 
  CheckSquare, 
  Download,
  CheckCircle,
  RotateCcw,
  Server
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

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
              trend="+12%"
              trendText="from yesterday"
              trendType="positive"
            />
            
            <StatsCard
              title="Pending Donations"
              value={stats?.pendingDonations || 0}
              icon={Clock}
              iconColor="text-orange-600"
              iconBg="bg-orange-50"
              subtext={`$${stats?.pendingDonations || 0}.00 potential revenue`}
            />
            
            <StatsCard
              title="Donations Received"
              value={`$${stats?.donationsReceived || 0}`}
              icon={DollarSign}
              iconColor="text-green-600"
              iconBg="bg-green-50"
              subtext={`${Math.floor(stats?.donationsReceived || 0)} successful donations this month`}
            />
            
            <StatsCard
              title="Known Contacts"
              value={stats?.knownContacts || 0}
              icon={Users}
              iconColor="text-purple-600"
              iconBg="bg-purple-50"
              trend="+5 added"
              trendText="this week"
              trendType="positive"
            />
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

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="flex items-center space-x-3 p-4 h-auto justify-start">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <UserPlus className="text-blue-600" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Add Contact</p>
                    <p className="text-sm text-gray-500">Whitelist a new email address</p>
                  </div>
                </Button>

                <Button variant="outline" className="flex items-center space-x-3 p-4 h-auto justify-start">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckSquare className="text-green-600" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Bulk Actions</p>
                    <p className="text-sm text-gray-500">Process multiple emails at once</p>
                  </div>
                </Button>

                <Button variant="outline" className="flex items-center space-x-3 p-4 h-auto justify-start">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Download className="text-purple-600" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Export Data</p>
                    <p className="text-sm text-gray-500">Download donation reports</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                  <p className="font-medium text-gray-900">Gmail API</p>
                  <p className="text-sm text-green-600">Connected</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                  <p className="font-medium text-gray-900">Stripe Webhooks</p>
                  <p className="text-sm text-green-600">Active</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <RotateCcw className="text-green-600" size={24} />
                  </div>
                  <p className="font-medium text-gray-900">Auto-Sync</p>
                  <p className="text-sm text-green-600">Every 5 minutes</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Server className="text-green-600" size={24} />
                  </div>
                  <p className="font-medium text-gray-900">Server Status</p>
                  <p className="text-sm text-green-600">Operational</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Sidebar>
  );
}
