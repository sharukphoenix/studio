"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GitCommitHorizontal, GitBranch, GitMerge, SquareArrowDown, RotateCcw, Undo2 } from 'lucide-react';
import type { GitRepository, Commit } from '@/types/git';

interface ControlsProps {
  repoState: GitRepository;
  onCommit: (message: string) => void;
  onBranch: (name: string) => void;
  onCheckout: (name: string) => void;
  onMerge: (name: string) => void;
  onStage: () => void;
  onInit: () => void;
  onRevert: (commitId: string) => void;
  repoCommits: Commit[];
}

export default function Controls({ repoState, onCommit, onBranch, onCheckout, onMerge, onStage, onInit, onRevert, repoCommits }: ControlsProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [mergeBranch, setMergeBranch] = useState<string>('');
  const [revertCommitId, setRevertCommitId] = useState('');
  
  const currentBranch = repoState.HEAD.type === 'branch' ? repoState.HEAD.name : 'detached';
  const otherBranches = Object.keys(repoState.branches).filter(b => b !== currentBranch);
  const isMerging = !!repoState.mergeState;

  const isWorkingDirClean = repoState.workingDirectory === (repoState.HEAD.type === 'branch' ? repoState.commits[repoState.branches[repoState.HEAD.name].commitId].content : repoState.commits[repoState.HEAD.id].content);

  const revertableCommits = repoCommits.filter(c => c.parents.length > 0);

  useEffect(() => {
    if (isMerging) {
      setCommitMessage(`Merge branch '${repoState.mergeState!.sourceBranch}' into '${currentBranch}'`);
    }
  }, [isMerging, repoState.mergeState, currentBranch]);

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

  const handleRevertClick = () => {
    if (revertCommitId) {
      onRevert(revertCommitId);
      setRevertCommitId('');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
      <Button onClick={onInit} variant="outline" size="sm" disabled={isMerging}><RotateCcw className="mr-2 h-4 w-4" /> Init Repo</Button>
      
      <Button onClick={onStage} variant="outline" size="sm" disabled={isWorkingDirClean && !isMerging}>
        <SquareArrowDown className="mr-2 h-4 w-4" /> Stage
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" disabled={repoState.stagingArea === null}>
            <GitCommitHorizontal className="mr-2 h-4 w-4" /> {isMerging ? 'Complete Merge' : 'Commit'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isMerging ? 'Complete Merge Commit' : 'Commit Changes'}</DialogTitle>
             {isMerging && <DialogDescription>Review the commit message for the merge.</DialogDescription>}
          </DialogHeader>
          <Input 
            placeholder="Your commit message..." 
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && commitMessage.trim()) {
                e.preventDefault();
                handleCommitClick();
                 (e.target as HTMLElement).closest('button[aria-label="Close"]')?.click();
              }
            }}
          />
          <DialogFooter>
            <DialogClose asChild>
                <Button onClick={handleCommitClick}>{isMerging ? 'Complete Merge' : 'Commit'}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" disabled={isMerging}><GitBranch className="mr-2 h-4 w-4" /> Branch</Button>
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
          <Button variant="secondary" size="sm" disabled={otherBranches.length === 0 || isMerging}><GitMerge className="mr-2 h-4 w-4" /> Merge</Button>
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

       <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" disabled={revertableCommits.length === 0 || isMerging}><Undo2 className="mr-2 h-4 w-4" /> Revert</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert a commit</DialogTitle>
            <DialogDescription>
                This creates a new commit that undoes the changes from a selected commit.
            </DialogDescription>
          </DialogHeader>
           <Select onValueChange={setRevertCommitId} value={revertCommitId}>
            <SelectTrigger><SelectValue placeholder="Select a commit to revert" /></SelectTrigger>
            <SelectContent>
              {revertableCommits.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                      <span className="font-mono text-xs mr-2">{c.id.substring(0,7)}</span> 
                      <span>{c.message}</span>
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <DialogClose asChild>
                <Button onClick={handleRevertClick} disabled={!revertCommitId}>Revert Commit</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Select onValueChange={onCheckout} value={currentBranch} disabled={isMerging}>
        <SelectTrigger className="w-full sm:w-[180px]" size="sm">
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
