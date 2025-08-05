import { useEffect, useState } from "react";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentSuccess() {
  const [searchParams, setSearchParams] = useState<URLSearchParams>();
  const [senderEmail, setSenderEmail] = useState("");
  const [targetEmail, setTargetEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchParams(params);
    setSenderEmail(params.get('sender') || '');
    setTargetEmail(params.get('target') || '');
  }, []);

  const handleGoBack = () => {
    // Redirect to a landing page or close window
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-600">
            Thank you for your donation! Your payment has been processed successfully.
          </p>
          
          {senderEmail && targetEmail && (
            <div className="bg-blue-50 p-4 rounded-lg text-sm">
              <p className="font-medium text-blue-800">Email Access Granted</p>
              <p className="text-blue-600 mt-1">
                <span className="font-medium">{senderEmail}</span> now has permanent access to send emails to <span className="font-medium">{targetEmail}</span>
              </p>
              <p className="text-blue-600 mt-2">
                Your original email will be delivered shortly, and you've been added to the recipient's whitelist for future emails.
              </p>
            </div>
          )}

          <div className="pt-4">
            <Button onClick={handleGoBack} className="w-full" data-testid="button-go-back">
              <ArrowLeft size={16} className="mr-2" />
              Continue
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            This donation helps support inbox management and reduces spam. Thank you for contributing!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}