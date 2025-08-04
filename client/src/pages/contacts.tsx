import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, User } from "lucide-react";

export default function Contacts() {
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["/api/contacts", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      const res = await apiRequest("GET", `/api/contacts?userId=${user.id}`);
      return res.json();
    },
    enabled: !!user?.id
  });

  const addContactMutation = useMutation({
    mutationFn: async (contactData: { email: string; name?: string }) => {
      if (!user?.id) throw new Error("User not authenticated");
      const res = await apiRequest("POST", "/api/contacts", {
        userId: user.id,
        email: contactData.email,
        name: contactData.name || null,
        isWhitelisted: true
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", user?.id] });
      setNewContactEmail("");
      setNewContactName("");
      setIsDialogOpen(false);
      toast({
        title: "Contact Added",
        description: "The contact has been successfully added to your whitelist.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add contact",
        variant: "destructive",
      });
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest("DELETE", `/api/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", user?.id] });
      toast({
        title: "Contact Removed",
        description: "The contact has been removed from your whitelist.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove contact",
        variant: "destructive",
      });
    }
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactEmail.trim()) return;
    
    addContactMutation.mutate({
      email: newContactEmail.trim(),
      name: newContactName.trim() || undefined
    });
  };

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Known Contacts</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your email whitelist and trusted senders
            </p>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8">
          <Card>
            <CardHeader className="space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg sm:text-xl">Contact Management</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full sm:w-auto" data-testid="button-add-contact">
                    <Plus className="mr-2" size={16} />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddContact} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        placeholder="contact@example.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Name (optional)</Label>
                      <Input
                        id="name"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Contact Name"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addContactMutation.isPending}>
                        {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {contacts?.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
                      <p className="text-gray-500 mb-4">Start by adding your trusted email contacts to the whitelist.</p>
                      <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2" size={16} />
                        Add First Contact
                      </Button>
                    </div>
                  ) : (
                    contacts?.map((contact: any) => (
                      <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="text-blue-600" size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{contact.email}</p>
                            {contact.name && (
                              <p className="text-sm text-gray-500 truncate">{contact.name}</p>
                            )}
                            <p className="text-xs text-gray-400">
                              Added {new Date(contact.addedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end space-x-3">
                          {contact.isWhitelisted && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                              Whitelisted
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteContactMutation.mutate(contact.id)}
                            disabled={deleteContactMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Sidebar>
  );
}
