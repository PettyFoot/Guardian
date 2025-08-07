import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/dashboard";
import EmailQueue from "@/pages/email-queue";
import Contacts from "@/pages/contacts";
import Donations from "@/pages/donations";
import Settings from "@/pages/settings";
import Setup from "@/pages/setup";
import SignIn from "@/pages/signin";
import Demo from "@/pages/demo";
import Checkout from "@/pages/checkout";
import BusinessWebsite from "@/pages/business-website";
import PaymentSuccess from "@/pages/payment-success";
import NotFound from "@/pages/not-found";
import CharityRegister from "@/pages/charity-register";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/setup" />;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/setup" component={Setup} />
      <Route path="/signin" component={SignIn} />
      <Route path="/demo" component={Demo} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/business" component={BusinessWebsite} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/charity-register" component={CharityRegister} />
      <Route path="/">
        {isAuthenticated ? <Dashboard /> : <Redirect to="/setup" />}
      </Route>
      <Route path="/email-queue">
        <ProtectedRoute component={EmailQueue} />
      </Route>
      <Route path="/contacts">
        <ProtectedRoute component={Contacts} />
      </Route>
      <Route path="/donations">
        <ProtectedRoute component={Donations} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;