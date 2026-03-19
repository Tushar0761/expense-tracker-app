import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { addBorrower } from '@/lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface AddBorrowerDialogProps {
  onSuccess: (newBorrower: { id: number; borrowerName: string }) => void;
}

export const AddBorrowerDialog = ({ onSuccess }: AddBorrowerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerName.trim()) {
      toast.error('Borrower name is required');
      return;
    }

    try {
      setIsLoading(true);
      const newBorrower = await addBorrower(borrowerName);
      toast.success('Borrower added successfully!');
      onSuccess(newBorrower);
      setOpen(false);
      setBorrowerName('');
    } catch (error) {
      console.error('Failed to add borrower:', error);
      toast.error('Failed to add borrower');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          type="button"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Borrower</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Borrower Name</Label>
            <Input
              id="name"
              placeholder="Enter borrower name"
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Borrower'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
