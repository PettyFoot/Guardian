import { CheckCircle } from "lucide-react";

interface DonationItemProps {
  donation: {
    id: string;
    senderEmail: string;
    amount: string;
    paidAt: string;
    status: string;
  };
}

export function DonationItem({ donation }: DonationItemProps) {
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
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="text-green-600" size={16} />
        </div>
        <div>
          <p className="font-medium text-gray-900">{donation.senderEmail}</p>
          <p className="text-sm text-gray-500">{formatTimestamp(donation.paidAt)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-green-600">${parseFloat(donation.amount).toFixed(2)}</p>
        <p className="text-xs text-gray-500">Stripe</p>
      </div>
    </div>
  );
}
