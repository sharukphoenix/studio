"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GitCommitHorizontal, GitBranch, GitMerge, SquareArrowDown, RotateCcw } from 'lucide-react';
import type { GitRepository } from '@/types/git';

interface ControlsProps {
  repoState: GitRepository;
  onCommit: (message: string) => void;
  onBranch: (name: string) => void;
  onCheckout: (name: string) => void;
  onMerge: (name: string) => void;
  onStage: () => void;
  onInit: () => void;
}

export default function Controls({ repoState, onCommit, onBranch, onCheckout, onMerge, onStage, onInit }: ControlsProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [mergeBranch, setMergeBranch] = useState<string>('');
  
  const currentBranch = repoState.HEAD.type === 'branch' ? repoState.HEAD.name : 'detached';
  const otherBranches = Object.keys(repoState.branches).filter(b => b !== currentBranch);
  const isWorkingDirClean = repoState.workingDirectory === (repoState.HEAD.type === 'branch' ? repoState.commits[repoState.branches[repoState.HEAD.name].commitId].content : repoState.commits[repoState.HEAD.id].content);

  const handleCommitClick = () => {
    if (commitMessage.trim()) {
      onCommit(commitMessage.trim());
      setCommitMessage('');
    }
  };

  const handleBranchClick = () => {
    if (newBranchName.trim()) {
      onBranch(newBranchName.trim());
      setNewBranchName('');
    }
  };
  
  const handleMergeClick = () => {
    if (mergeBranch) {
        onMerge(mergeBranch);
        setMergeBranch('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onInit} variant="outline" size="sm"><RotateCcw className="mr-2 h-4 w-4" /> Init Repo</Button>
      
      <Button onClick={onStage} variant="outline" size="sm" disabled={isWorkingDirClean}>
        <SquareArrowDown className="mr-2 h-4 w-4" /> Stage
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" disabled={repoState.stagingArea === null}><GitCommitHorizontal className="mr-2 h-4 w-4" /> Commit</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commit Changes</DialogTitle>
          </DialogHeader>
          <Input 
            placeholder="Your commit message..." 
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCommitClick();
                (e.target as HTMLElement).closest('[role="dialog"]')
                  ?.querySelector('[aria-label="Close"]')
                  // The type assertion is a bit of a hack, but it works in this context.
                  // A more robust solution might involve managing dialog open state manually.
                  ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              }
            }}
          />
          <DialogFooter>
            <DialogClose asChild>
                <Button onClick={handleCommitClick}>Commit</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm"><GitBranch className="mr-2 h-4 w-4" /> Branch</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new branch</DialogTitle>
            <DialogDescription>
                Branches allow you to work on features in isolation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branch-name" className="text-right">Name</Label>
                <Input id="branch-name" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button onClick={handleBranchClick}>Create branch</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" disabled={otherBranches.length === 0}><GitMerge className="mr-2 h-4 w-4" /> Merge</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge a branch</DialogTitle>
            <DialogDescription>
                Merge another branch into your current branch ({currentBranch}).
            </DialogDescription>
          </DialogHeader>
          <Select onValueChange={setMergeBranch} value={mergeBranch}>
            <SelectTrigger><SelectValue placeholder="Select a branch to merge" /></SelectTrigger>
            <SelectContent>
              {otherBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <DialogClose asChild>
                <Button onClick={handleMergeClick} disabled={!mergeBranch}>Merge</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Select onValueChange={onCheckout} value={currentBranch}>
        <SelectTrigger className="w-[180px]" size="sm">
          <GitBranch className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Checkout branch" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(repoState.branches).map(b => (
            <SelectItem key={b} value={b}>{b}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
