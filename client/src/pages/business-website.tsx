import { Shield, Mail, DollarSign, CheckCircle, Users, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BusinessWebsite() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold">Email Guardian</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-blue-400 transition-colors">Pricing</a>
              <a href="#how-it-works" className="hover:text-blue-400 transition-colors">How It Works</a>
              <a href="#contact" className="hover:text-blue-400 transition-colors">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Intelligent Email Filtering with Donation-Based Access
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Email Guardian is a professional email management service that reduces spam and unwanted emails 
            by requiring unknown senders to make a small donation before their messages reach your inbox. 
            Legitimate contacts are automatically whitelisted for seamless communication.
          </p>
          <div className="flex justify-center space-x-4">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Get Started Today
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Powerful Email Management Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Mail className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Automated Filtering</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Automatically filters emails from unknown senders while keeping messages 
                  from known contacts in your inbox. Configurable check intervals from 
                  30 seconds to 1 hour.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <DollarSign className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Donation-Based Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Unknown senders make a small $1 donation to access your inbox. 
                  This creates a barrier for spam while allowing legitimate communication. 
                  Payments processed securely through Stripe.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Gmail Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Seamlessly integrates with your existing Gmail account using secure 
                  OAuth authentication. No need to change email providers or learn 
                  new interfaces.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-orange-600 mb-4" />
                <CardTitle>Contact Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Automatically whitelist donors for future emails. Manually manage 
                  your known contacts list. Once someone donates, they have permanent 
                  access to your inbox.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-12 w-12 text-red-600 mb-4" />
                <CardTitle>Real-Time Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Emails are processed in real-time with configurable intervals. 
                  Dashboard provides live statistics on filtered emails, pending 
                  donations, and contact activity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-12 w-12 text-yellow-600 mb-4" />
                <CardTitle>Automated Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Sends professional auto-reply messages with payment instructions 
                  to unknown senders. Customizable templates and messaging to match 
                  your communication style.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Email Guardian Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Email Received</h3>
              <p className="text-gray-600 text-sm">
                Unknown sender emails your Gmail address
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Automatic Filter</h3>
              <p className="text-gray-600 text-sm">
                Email Guardian intercepts and holds the message
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Donation Request</h3>
              <p className="text-gray-600 text-sm">
                Auto-reply sent with secure payment link
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="font-semibold mb-2">Access Granted</h3>
              <p className="text-gray-600 text-sm">
                Payment processed, email delivered, sender whitelisted
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            Simple, Transparent Pricing
          </h2>
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Email Guardian Service</CardTitle>
              <div className="text-4xl font-bold text-blue-600">Free</div>
              <p className="text-gray-600">for recipients</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Unlimited email filtering</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Gmail integration</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Contact management</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Real-time processing</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Secure payment processing</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  <strong>Senders pay $1</strong> to access your inbox. This amount goes directly to you, 
                  helping support your time and attention while reducing spam.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Business Information */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            About Email Guardian
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold mb-4">Our Service</h3>
              <p className="text-gray-600 mb-4">
                Email Guardian provides intelligent email filtering technology that helps individuals 
                and professionals manage their inbox more effectively. Our service integrates with 
                Gmail to automatically filter unwanted emails while ensuring legitimate communication 
                reaches its destination.
              </p>
              <p className="text-gray-600">
                We use a donation-based model where unknown senders contribute a small amount to 
                access your inbox, creating a natural barrier against spam while supporting the 
                recipient's time and attention.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Business Model</h3>
              <p className="text-gray-600 mb-4">
                Our revenue model is transparent: we provide the filtering technology for free to 
                recipients, while unknown senders pay a small access fee that goes directly to the 
                recipient. Payment processing is handled securely through Stripe.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>• Service is free for email recipients</li>
                <li>• $1 access fee paid by unknown senders</li>
                <li>• Secure payment processing via Stripe</li>
                <li>• No hidden fees or subscription costs</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Get in Touch
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Ready to take control of your inbox? Contact us to learn more about Email Guardian.
          </p>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Technical Support</h3>
                <p className="text-gray-600 text-sm">
                  For technical questions, integration support, or troubleshooting assistance.
                </p>
                <p className="text-blue-600 mt-2">support@emailguardian.com</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Business Inquiries</h3>
                <p className="text-gray-600 text-sm">
                  For partnership opportunities, enterprise solutions, or general business questions.
                </p>
                <p className="text-blue-600 mt-2">business@emailguardian.com</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Payment Issues</h3>
                <p className="text-gray-600 text-sm">
                  For payment-related questions, refunds, or billing support.
                </p>
                <p className="text-blue-600 mt-2">billing@emailguardian.com</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-6 w-6 text-blue-400" />
                <span className="font-bold">Email Guardian</span>
              </div>
              <p className="text-gray-400 text-sm">
                Intelligent email filtering with donation-based access control.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Service</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>How It Works</li>
                <li>Features</li>
                <li>Pricing</li>
                <li>Security</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Documentation</li>
                <li>API Reference</li>
                <li>Contact Support</li>
                <li>Status Page</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Cookie Policy</li>
                <li>GDPR Compliance</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 Email Guardian. All rights reserved. | 
              Business Registration: Email Guardian LLC | 
              Payment Processing: Stripe Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}