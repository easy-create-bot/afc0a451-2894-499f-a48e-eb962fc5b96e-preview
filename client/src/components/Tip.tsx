import { useState } from 'react';
import { Button } from './ui/button'; // Assuming this path is correct based on existing imports
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export function Tip() {
  const [showTip, setShowTip] = useState<boolean>(false);

  return <div className="ml-4">
    <Dialog open={showTip} onOpenChange={setShowTip}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer w-fit" onClick={() => setShowTip(true)}>
          What should your prompt look like?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Tip
          </DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  </div>
}
