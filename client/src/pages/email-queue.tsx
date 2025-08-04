import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { EmailItem } from "@/components/ui/email-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function EmailQueue() {
  const { user } = useAuth();
  
  const { data: pendingEmails, isLoading } = useQuery({
    queryKey: ["/api/pending-emails", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pending-emails?userId=${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id
  });

  const pendingCount = pendingEmails?.filter((e: any) => e.status === 'pending')?.length || 0;
  const donationSentCount = pendingEmails?.filter((e: any) => e.status === 'donation_sent')?.length || 0;
  const paidCount = pendingEmails?.filter((e: any) => e.status === 'paid')?.length || 0;

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Queue</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage pending emails and donation requests • Connected: {user?.email}
            </p>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Email Queue Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 text-xs sm:text-sm">
                  <TabsTrigger value="all">
                    All ({pendingEmails?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending 
                    <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">
                      {pendingCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="donation_sent">
                    Donation Sent
                    <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                      {donationSentCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="paid">
                    Paid
                    <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                      {paidCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-lg">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingEmails?.map((email: any) => (
                        <EmailItem key={email.id} email={email} />
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="pending" className="mt-6">
                  <div className="space-y-4">
                    {pendingEmails?.filter((e: any) => e.status === 'pending').map((email: any) => (
                      <EmailItem key={email.id} email={email} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="donation_sent" className="mt-6">
                  <div className="space-y-4">
                    {pendingEmails?.filter((e: any) => e.status === 'donation_sent').map((email: any) => (
                      <EmailItem key={email.id} email={email} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="paid" className="mt-6">
                  <div className="space-y-4">
                    {pendingEmails?.filter((e: any) => e.status === 'paid').map((email: any) => (
                      <EmailItem key={email.id} email={email} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </Sidebar>
  );
}
