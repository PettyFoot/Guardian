import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Shield, 
  Home, 
  Mail, 
  Users, 
  DollarSign, 
  Settings, 
  Menu,
  X,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/email-queue", icon: Mail, label: "Email Queue" },
  { path: "/contacts", icon: Users, label: "Contacts" },
  { path: "/donations", icon: DollarSign, label: "Donations" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 border-b border-gray-800">
        <Shield className="h-8 w-8 text-blue-400" />
        <div>
          <h1 className="text-lg font-bold">Email Guardian</h1>
          <p className="text-xs text-gray-400">Email Filtering System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || 
            (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start text-left h-12 ${
                  isActive 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
                onClick={onItemClick}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 h-12"
          onClick={() => {
            logout();
            onItemClick?.();
          }}
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ children }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Mobile/Tablet Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 md:hidden bg-white shadow-md hover:bg-gray-50"
            data-testid="button-menu-toggle"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 sm:w-80">
          <SidebarContent onItemClick={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Drawer */}
      <div className="hidden md:block">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 bg-white shadow-md hover:bg-gray-50"
              data-testid="button-menu-toggle-desktop"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 sm:w-80">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-screen">
        {/* Top padding for mobile menu button */}
        <div className="pt-16 md:pt-16">
          {children}
        </div>
      </div>
    </div>
  );
}