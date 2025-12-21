'use client';

import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InsufficientCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
  requiredCredits?: number;
  title?: string;
  description?: string;
  actionLabel?: string;
}

export default function InsufficientCreditsModal({
  open,
  onOpenChange,
  onUpgrade,
  requiredCredits = 1,
  title = "Insufficient Credits",
  description = "You don't have enough credits to perform this action.",
  actionLabel = "Buy Credits"
}: InsufficientCreditsModalProps) {
  const handleUpgrade = () => {
    onOpenChange(false);
    onUpgrade();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This action requires {requiredCredits} {requiredCredits === 1 ? 'credit' : 'credits'}.
            Purchase more credits to continue using our services.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Our credit packages offer great value:
          </p>
          <ul className="text-sm space-y-1 ml-4">
            <li>• ₹49 for 1 credit</li>
            <li>• ₹199 for 5 credits (Most Popular)</li>
            <li>• ₹499 for 15 credits</li>
            <li>• ₹699 for 20 credits</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            All packages come with 3 months validity
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpgrade}>
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
