import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  updateAccountBalance,
  fetchTransfers,
  createTransfer,
  type Account,
  type AccountType,
  type CreateTransferPayload,
} from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Wallet,
  Building2,
  CreditCard,
  ArrowRightLeft,
  Plus,
  History,
  TrendingUp,
  Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Accounts() {
  const queryClient = useQueryClient();
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Queries
  const { data: accounts = [], isLoading: isAccountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  const { data: transfers = [], isLoading: isTransfersLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: fetchTransfers,
  });

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsAccountDialogOpen(false);
      toast.success('Account created successfully');
    },
    onError: () => toast.error('Failed to create account'),
  });

  const createTransferMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setIsTransferDialogOpen(false);
      toast.success('Transfer recorded successfully');
    },
    onError: () => toast.error('Failed to record transfer'),
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; creditLimit?: number };
    }) => updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      toast.success('Account details updated');
    },
    onError: () => toast.error('Failed to update account'),
  });

  const updateBalanceMutation = useMutation({
    mutationFn: ({ id, balance }: { id: number; balance: number }) =>
      updateAccountBalance(id, balance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setIsEditDialogOpen(false);
      setEditingAccount(null);
      toast.success('Balance updated successfully');
    },
    onError: () => toast.error('Failed to update balance'),
  });

  const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createAccountMutation.mutate({
      name: formData.get('name') as string,
      type: formData.get('type') as AccountType,
      balance: Number(formData.get('balance')) || 0,
      creditLimit: Number(formData.get('creditLimit')) || 0,
    });
  };

  const handleCreateTransfer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload: CreateTransferPayload = {
      date: formData.get('date') as string,
      amount: Number(formData.get('amount')),
      fromAccountId: Number(formData.get('fromAccountId')),
      toAccountId: Number(formData.get('toAccountId')),
      remarks: formData.get('remarks') as string,
    };
    createTransferMutation.mutate(payload);
  };

  const handleEditAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAccount) return;
    const formData = new FormData(e.currentTarget);

    const newName = formData.get('name') as string;
    const newBalance = Number(formData.get('balance'));
    const creditLimit =
      editingAccount.type === 'CREDIT'
        ? Number(formData.get('creditLimit'))
        : undefined;

    // Update name and credit limit
    if (
      newName !== editingAccount.name ||
      (creditLimit !== undefined &&
        creditLimit !== (editingAccount.creditLimit || 0))
    ) {
      updateAccountMutation.mutate({
        id: editingAccount.id,
        data: {
          name: newName,
          creditLimit: creditLimit,
        },
      });
    }

    // If balance changed, update directly
    if (newBalance !== editingAccount.balance) {
      updateBalanceMutation.mutate({
        id: editingAccount.id,
        balance: newBalance,
      });
    }

    // Close dialog if no balance change (just name update)
    if (newBalance === editingAccount.balance) {
      setIsEditDialogOpen(false);
      setEditingAccount(null);
    }
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setIsEditDialogOpen(true);
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'CASH':
        return <Wallet className="h-5 w-5 text-emerald-500" />;
      case 'BANK':
        return <Building2 className="h-5 w-5 text-blue-500" />;
      case 'CREDIT':
        return <CreditCard className="h-5 w-5 text-rose-500" />;
    }
  };

  const totalBalance = accounts.reduce(
    (sum, acc) =>
      acc.type === 'CREDIT' ? sum - acc.balance : sum + acc.balance,
    0,
  );

  return (
    <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Accounts & Transfers
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Manage your money across different accounts and track movements.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={isTransferDialogOpen}
            onOpenChange={setIsTransferDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
              >
                <ArrowRightLeft className="h-4 w-4" /> Transfer Money
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">Transfer Money</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Move funds between your accounts.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTransfer} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fromAccountId">From Account</Label>
                  <Select name="fromAccountId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id.toString()}>
                          {acc.name} (₹{acc.balance.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="toAccountId">To Account</Label>
                  <Select name="toAccountId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id.toString()}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Input
                    id="remarks"
                    name="remarks"
                    placeholder="Optional notes"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createTransferMutation.isPending}
                  >
                    {createTransferMutation.isPending
                      ? 'Recording...'
                      : 'Execute Transfer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isAccountDialogOpen}
            onOpenChange={setIsAccountDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8 text-xs">
                <Plus className="h-4 w-4" /> Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">Add New Account</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Create a new account to track your finances.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAccount} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g. HDFC Bank, My Wallet"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Account Type</Label>
                  <Select name="type" defaultValue="BANK">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash / Wallet</SelectItem>
                      <SelectItem value="BANK">Bank Account</SelectItem>
                      <SelectItem value="CREDIT">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="balance">Initial Balance (₹)</Label>
                  <Input
                    id="balance"
                    name="balance"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="creditLimit">
                    Credit Limit (₹) - Only for Credit Cards
                  </Label>
                  <Input
                    id="creditLimit"
                    name="creditLimit"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createAccountMutation.isPending}
                  >
                    {createAccountMutation.isPending
                      ? 'Creating...'
                      : 'Create Account'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isEditDialogOpen}
            onOpenChange={(open) => {
              setIsEditDialogOpen(open);
              if (!open) setEditingAccount(null);
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">Edit Account</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Update account name or manually set your current balance.
                </DialogDescription>
              </DialogHeader>
              {editingAccount && (
                <form onSubmit={handleEditAccount} className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Account Name</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      defaultValue={editingAccount.name}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-balance">Current Balance (₹)</Label>
                    <Input
                      id="edit-balance"
                      name="balance"
                      type="number"
                      step="0.01"
                      defaultValue={editingAccount.balance}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Enter your current balance. This won't be affected by
                      expenses.
                    </p>
                  </div>
                  {editingAccount.type === 'CREDIT' && (
                    <div className="grid gap-2">
                      <Label htmlFor="edit-creditLimit">Credit Limit (₹)</Label>
                      <Input
                        id="edit-creditLimit"
                        name="creditLimit"
                        type="number"
                        step="0.01"
                        defaultValue={editingAccount.creditLimit || 0}
                      />
                    </div>
                  )}
                  <DialogFooter>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        updateAccountMutation.isPending ||
                        updateBalanceMutation.isPending
                      }
                    >
                      {updateAccountMutation.isPending ||
                      updateBalanceMutation.isPending
                        ? 'Saving...'
                        : 'Save Changes'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-card/40 border-border/50">
        <CardContent className="py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Net Liquidity
              </p>
              <h2
                className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'} tracking-tight`}
              >
                ₹{totalBalance.toLocaleString()}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Accounts List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-1.5 px-1 pt-1">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold uppercase tracking-tight text-muted-foreground">
              Your Accounts
            </h3>
          </div>
          <div className="grid gap-3">
            {isAccountsLoading ? (
              [1, 2, 3].map((i) => (
                <Card key={i} className="h-16 animate-pulse bg-muted" />
              ))
            ) : accounts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">
                No accounts found. Add one to get started.
              </p>
            ) : (
              accounts.map((acc: Account) => (
                <Card
                  key={acc.id}
                  className="group hover:border-primary/40 transition-all duration-300 overflow-hidden relative bg-card/50"
                >
                  {acc.type === 'CREDIT' && (
                    <div className="absolute top-0 right-0 h-0.5 w-full bg-rose-500/30" />
                  )}
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {getAccountIcon(acc.type)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold group-hover:text-primary transition-colors">
                          {acc.name}
                        </p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                          {acc.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${acc.type === 'CREDIT' ? 'text-rose-500' : 'text-emerald-500'} tabular-nums`}
                        >
                          ₹{acc.balance.toLocaleString()}
                        </p>
                        {acc.type === 'CREDIT' && acc.creditLimit && (
                          <p className="text-[9px] text-muted-foreground leading-tight">
                            Limit: ₹{acc.creditLimit.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEditDialog(acc)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Transfer History */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-1.5 px-1 pt-1">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold uppercase tracking-tight text-muted-foreground">
              Transfer History
            </h3>
          </div>
          <Card className="border border-border/50 bg-card/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="h-8 text-[11px] uppercase font-bold py-2">
                    Date
                  </TableHead>
                  <TableHead className="h-8 text-[11px] uppercase font-bold py-2">
                    From
                  </TableHead>
                  <TableHead className="h-8 text-[11px] uppercase font-bold py-2"></TableHead>
                  <TableHead className="h-8 text-[11px] uppercase font-bold py-2">
                    To
                  </TableHead>
                  <TableHead className="h-8 text-[11px] uppercase font-bold py-2 text-right">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isTransfersLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading transfers...
                    </TableCell>
                  </TableRow>
                ) : transfers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No transfers recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((t) => (
                    <TableRow
                      key={t.id}
                      className="hover:bg-primary/[0.02] transition-colors border-b border-border/10"
                    >
                      <TableCell className="py-2 text-[12px] tabular-nums text-muted-foreground">
                        {format(new Date(t.date), 'dd MMM yy')}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          {t.fromAccount && (
                            <div className="h-4 w-4">
                              {getAccountIcon(t.fromAccount.type)}
                            </div>
                          )}
                          <span className="text-[12px] font-medium">
                            {t.fromAccount?.name || 'Deleted'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground/50" />
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          {t.toAccount && (
                            <div className="h-4 w-4">
                              {getAccountIcon(t.toAccount.type)}
                            </div>
                          )}
                          <span className="text-[12px] font-medium">
                            {t.toAccount?.name || 'Deleted'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold text-blue-500 tabular-nums text-[12px]">
                        ₹{t.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
