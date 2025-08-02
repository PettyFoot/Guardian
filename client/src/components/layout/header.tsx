import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title: string;
  subtitle: string;
  gmailStatus: "connected" | "disconnected";
}

const CURRENT_USER_ID = "user-123";

export function Header({ title, subtitle, gmailStatus }: HeaderProps) {
  const { toast } = useToast();

  const syncMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/process-emails", { userId: CURRENT_USER_ID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/donations"] });
      toast({
        title: "Sync Complete",
        description: "Successfully processed new emails and updated stats.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync emails",
        variant: "destructive",
      });
    }
  });

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge 
            variant={gmailStatus === "connected" ? "default" : "destructive"}
            className={gmailStatus === "connected" ? "bg-green-100 text-green-700 border-green-200" : ""}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${gmailStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}></div>
            Gmail {gmailStatus === "connected" ? "Connected" : "Disconnected"}
          </Badge>
          <Button 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-primary hover:bg-blue-700"
          >
            <RefreshCw className={`mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} size={16} />
            {syncMutation.isPending ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </div>
    </header>
  );
}
