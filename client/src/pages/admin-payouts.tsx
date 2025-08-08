import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Payout {
  id: string;
  charityId: string;
  charityName: string;
  stripeTransferId: string;
  amount: string;
  platformFee: string;
  totalDonations: string;
  donationCount: string;
  status: string;
  errorMessage?: string;
  processedAt: string;
  createdAt: string;
}

interface PayoutSummary {
  period: string;
  totalPayouts: number;
  totalAmount: string;
  totalFees: string;
  totalDonations: string;
  charities: Record<string, any>;
  payouts: Payout[];
}

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/payouts');
      const data = await response.json();
      setPayouts(data);
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (period: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/payout-summary?period=${period}`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayouts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/process-payouts', {
        method: 'POST',
      });
      const data = await response.json();
      console.log('Payout processing results:', data);
      await fetchPayouts();
      await fetchSummary(selectedPeriod);
    } catch (error) {
      console.error('Error processing payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const testPayment = async () => {
    const charityId = prompt('Enter charity ID for test payment:');
    if (!charityId) return;

    const amount = prompt('Enter test amount (default: 1.00):') || '1.00';
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/test-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ charityId, amount: parseFloat(amount) }),
      });
      const data = await response.json();
      console.log('Test payment results:', data);
      await fetchPayouts();
      await fetchSummary(selectedPeriod);
    } catch (error) {
      console.error('Error processing test payment:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
    fetchSummary(selectedPeriod);
  }, [selectedPeriod]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payout Management</h1>
        <div className="space-x-2">
          <Button onClick={processPayouts} disabled={loading}>
            {loading ? 'Processing...' : 'Process Payouts'}
          </Button>
          <Button onClick={testPayment} disabled={loading} variant="outline">
            Test Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalPayouts}</div>
              <p className="text-xs text-muted-foreground">
                {summary.period} period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.totalAmount}</div>
              <p className="text-xs text-muted-foreground">
                Payouts to charities
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.totalFees}</div>
              <p className="text-xs text-muted-foreground">
                Revenue generated
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.totalDonations}</div>
              <p className="text-xs text-muted-foreground">
                Before fees
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Summary</CardTitle>
          <CardDescription>
            View payout statistics for different time periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Label htmlFor="period">Period:</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
          <CardDescription>
            All payout transactions with Stripe transfer details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Charity</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Platform Fee</TableHead>
                <TableHead>Donations</TableHead>
                <TableHead>Transfer ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-medium">{payout.charityName}</TableCell>
                  <TableCell>${payout.amount}</TableCell>
                  <TableCell>${payout.platformFee}</TableCell>
                  <TableCell>
                    {payout.donationCount} (${payout.totalDonations})
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {payout.stripeTransferId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payout.status === 'completed' ? 'default' : 'destructive'}>
                      {payout.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(payout.processedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {payouts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No payouts found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
