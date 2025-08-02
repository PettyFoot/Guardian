import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DonationItem } from "@/components/ui/donation-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { DollarSign } from "lucide-react";

const CURRENT_USER_ID = "user-123";

export default function Donations() {
  const { data: donations, isLoading } = useQuery({
    queryKey: ["/api/donations"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/donations?userId=${CURRENT_USER_ID}`);
      return res.json();
    }
  });

  const totalAmount = donations?.reduce((sum: number, donation: any) => 
    sum + parseFloat(donation.amount), 0) || 0;

  const thisMonth = donations?.filter((d: any) => {
    const donationDate = new Date(d.paidAt);
    const now = new Date();
    return donationDate.getMonth() === now.getMonth() && 
           donationDate.getFullYear() === now.getFullYear();
  }) || [];

  const thisMonthAmount = thisMonth.reduce((sum: number, donation: any) => 
    sum + parseFloat(donation.amount), 0);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header 
          title="Donations" 
          subtitle="Track all received donations and revenue"
          gmailStatus="connected"
        />
        
        <div className="p-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-green-600" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">This Month</p>
                    <p className="text-3xl font-bold text-gray-900">${thisMonthAmount.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-blue-600" size={24} />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{thisMonth.length} donations</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Average Donation</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ${donations?.length ? (totalAmount / donations.length).toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-purple-600" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Donations List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Donations</CardTitle>
              <Badge variant="secondary">
                {donations?.length || 0} total
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : donations?.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No donations yet</h3>
                  <p className="text-gray-500">When someone pays the $1 fee to access your inbox, donations will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {donations?.map((donation: any) => (
                    <DonationItem key={donation.id} donation={donation} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
