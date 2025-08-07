import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, ExternalLink, CheckCircle } from "lucide-react";

export default function CharityRegister() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    contactEmail: "",
    contactName: "",
  });
  const [isRegistered, setIsRegistered] = useState(false);
  const [stripeAccountUrl, setStripeAccountUrl] = useState("");
  const [charityId, setCharityId] = useState("");
  const [showStripeInfo, setShowStripeInfo] = useState(false); // State to control visibility of Stripe info

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/charities/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.warning) {
        toast({
          title: "Charity Registered with Warning",
          description: data.warning,
          variant: "default",
        });
        setShowStripeInfo(true);

        // If it's an HTTPS/live mode issue, show specific guidance
        if (data.stripeTestKeysInfo) {
          toast({
            title: "Development Environment Detected",
            description: data.stripeTestKeysInfo,
            variant: "default",
          });
        }
      } else if (data.stripeAccountUrl) {
        toast({
          title: "Charity Registered Successfully!",
          description: "Please complete your Stripe Connect setup to receive donations.",
        });
        setIsRegistered(true);
        setStripeAccountUrl(data.stripeAccountUrl);
        setCharityId(data.charity.id);
      } else {
        // Handle cases where registration is successful but no Stripe URL is provided
        toast({
          title: "Charity Registered Successfully!",
          description: "Your charity is now listed. Stripe setup may be handled separately.",
        });
        setIsRegistered(true); // Still mark as registered
        setCharityId(data.charity.id); // Set charity ID if available
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register charity",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name || !formData.contactEmail || !formData.contactName) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(formData);
  };

  if (isRegistered) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <CardTitle className="text-2xl text-green-900">Registration Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Your charity has been successfully registered with Email Guardian.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                To start receiving donations, please complete your Stripe Connect setup by clicking the button below.
                This will allow us to securely transfer donations to your organization.
              </p>
            </div>

            {showStripeInfo && stripeAccountUrl && ( // Conditionally render Stripe info
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Next Steps:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Complete Stripe Connect account setup</li>
                  <li>• Verify your bank account details</li>
                  <li>• Start receiving donations from Email Guardian users</li>
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {stripeAccountUrl ? (
                <Button
                  onClick={() => window.open(stripeAccountUrl, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Complete Stripe Setup
                </Button>
              ) : (
                <Button
                  onClick={() => window.open('https://stripe.com/docs/connect', '_blank')}
                  className="flex-1"
                  variant="outline"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Enable Stripe Connect
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                Return to Home
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Charity ID: {charityId}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Keep this ID for your records
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="text-purple-600" size={32} />
          </div>
          <CardTitle className="text-2xl">Register Your Charity</CardTitle>
          <p className="text-gray-600">
            Join Email Guardian's donation network and start receiving contributions from users who value spam-free communication.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Charity Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Local Food Bank"
                  required
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://yourcharity.org"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of your charity's mission and work"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  type="text"
                  value={formData.contactName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  placeholder="contact@yourcharity.org"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your charity will be added to our platform</li>
                <li>• You'll set up a Stripe Connect account for secure payments</li>
                <li>• Users can select your charity for their donations</li>
                <li>• Receive automatic payouts based on your preferences</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Registering...' : 'Register Charity'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}