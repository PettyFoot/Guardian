import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Eye } from "lucide-react";

interface EmailItemProps {
  email: {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    receivedAt: string;
    status: string;
  };
}

export function EmailItem({ email }: EmailItemProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="destructive" className="bg-red-100 text-red-700">Pending</Badge>;
      case "donation_sent":
        return <Badge className="bg-orange-100 text-orange-700">Donation Sent</Badge>;
      case "paid":
        return <Badge className="bg-green-100 text-green-700">Paid</Badge>;
      case "released":
        return <Badge className="bg-blue-100 text-blue-700">Released</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
      <div className="flex-1">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="text-gray-600" size={20} />
          </div>
          <div>
            <p className="font-medium text-gray-900">{email.sender}</p>
            <p className="text-sm text-gray-500 line-clamp-1">{email.subject}</p>
            <p className="text-xs text-gray-400">{formatTimestamp(email.receivedAt)}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {getStatusBadge(email.status)}
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
          <Eye size={16} />
        </Button>
      </div>
    </div>
  );
}
