"use client";

import { useReducer, useEffect, useState, useMemo, useRef } from 'react';
import type { GitRepository, Commit } from '@/types/git';
import TextEditor from './TextEditor';
import Timeline from './Timeline';
import Controls from './Controls';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import * as diff from 'diff';

const initialCommitId = 'a1b2c3d';
const initialContent = `// Welcome to GitFlow!
// This is your workspace. Type something here and stage your changes.
`;

const getInitialState = (): GitRepository => ({
  commits: {
    [initialCommitId]: {
      id: initialCommitId,
      parents: [],
      message: 'Initial commit',
      author: 'GitFlow',
      timestamp: Date.now(),
      content: initialContent,
    }
  },
  branches: {
    'main': { name: 'main', commitId: initialCommitId },
  },
  HEAD: { type: 'branch', name: 'main' },
  stagingArea: null,
  workingDirectory: initialContent,
  commitOrder: [initialCommitId],
});

type Action = 
  | { type: 'INIT' }
  | { type: 'EDIT_FILE', payload: string }
  | { type: 'STAGE' }
  | { type: 'COMMIT', payload: { message: string, author: string } }
  | { type: 'BRANCH', payload: { branchName: string, fromCommitId: string } }
  | { type: 'CHECKOUT', payload: string }
  | { type: 'MERGE', payload: string }
  | { type: 'REVERT', payload: { commitId: string } };

function findCommonAncestor(state: GitRepository, commitId1: string, commitId2: string): string | null {
    const getAncestors = (startId: string): Set<string> => {
        const ancestors = new Set<string>();
        const queue: string[] = [startId];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            ancestors.add(currentId);
            const commit = state.commits[currentId];
            if (commit) {
                queue.push(...commit.parents);
            }
        }
        return ancestors;
    };

    const ancestors1 = getAncestors(commitId1);
    const ancestors2 = getAncestors(commitId2);

    const commonAncestors = [...ancestors1].filter(id => ancestors2.has(id));
    
    if (commonAncestors.length === 0) return null;

    commonAncestors.sort((a, b) => {
        const indexA = state.commitOrder.indexOf(a);
        const indexB = state.commitOrder.indexOf(b);
        return indexB - indexA;
    });

    return commonAncestors[0];
}


function gitReducer(state: GitRepository, action: Action): GitRepository {
    switch (action.type) {
        case 'INIT':
            return getInitialState();
        case 'EDIT_FILE':
            return { ...state, workingDirectory: action.payload };
        case 'STAGE': {
            const headCommitId = state.HEAD.type === 'branch' ? state.branches[state.HEAD.name].commitId : state.HEAD.id;
            const headContent = state.commits[headCommitId].content;
            if (state.workingDirectory === headContent && !state.mergeState) {
                return state;
            }
            return { ...state, stagingArea: state.workingDirectory };
        }
        case 'COMMIT': {
            if (state.stagingArea === null) return state;
            if (state.HEAD.type !== 'branch') return state;
            
            const currentBranchName = state.HEAD.name;
            const parentCommitId = state.branches[currentBranchName].commitId;

            // Handle merge commit
            if (state.mergeState) {
                const sourceBranchName = state.mergeState.sourceBranch;
                const sourceCommitId = state.branches[sourceBranchName].commitId;

                const newCommitId = crypto.randomUUID().slice(0, 7);
                const mergeCommit: Commit = {
                    id: newCommitId,
                    parents: [parentCommitId, sourceCommitId].sort(),
                    message: action.payload.message,
                    author: action.payload.author,
                    timestamp: Date.now(),
                    content: state.stagingArea,
                };
                
                const { mergeState, ...restState } = state;

                return {
                    ...restState,
                    commits: { ...state.commits, [newCommitId]: mergeCommit },
                    branches: { ...state.branches, [currentBranchName]: { ...state.branches[currentBranchName], commitId: newCommitId } },
                    workingDirectory: mergeCommit.content,
                    stagingArea: null,
                    commitOrder: [...state.commitOrder, newCommitId],
                };
            }

            const newCommitId = crypto.randomUUID().slice(0, 7);
            const newCommit: Commit = {
                id: newCommitId,
                parents: [parentCommitId],
                message: action.payload.message,
                author: action.payload.author,
                timestamp: Date.now(),
                content: state.stagingArea,
            };

            return {
                ...state,
                commits: { ...state.commits, [newCommitId]: newCommit },
                branches: { ...state.branches, [state.HEAD.name]: { ...state.branches[state.HEAD.name], commitId: newCommitId } },
                stagingArea: null,
                commitOrder: [...state.commitOrder, newCommitId],
            };
        }
        case 'BRANCH': {
            const { branchName, fromCommitId } = action.payload;
            if (state.branches[branchName] || state.mergeState) return state;
            
            return {
                ...state,
                branches: { ...state.branches, [branchName]: { name: branchName, commitId: fromCommitId } }
            };
        }
        case 'CHECKOUT': {
            const branchName = action.payload;
            if (!state.branches[branchName] || state.mergeState) return state;
            
            const headCommitId = state.branches[branchName].commitId;
            const headContent = state.commits[headCommitId].content;

            return {
                ...state,
                HEAD: { type: 'branch', name: branchName },
                workingDirectory: headContent,
                stagingArea: null,
            };
        }
        case 'MERGE': {
            const sourceBranchName = action.payload;
            if (state.HEAD.type !== 'branch' || state.mergeState) return state;
            
            const targetBranchName = state.HEAD.name;
            if (sourceBranchName === targetBranchName) return state;

            const sourceCommitId = state.branches[sourceBranchName].commitId;
            const targetCommitId = state.branches[targetBranchName].commitId;

            const commonAncestorId = findCommonAncestor(state, sourceCommitId, targetCommitId);
            if (!commonAncestorId) return state; 
            
            if (commonAncestorId === targetCommitId) { // Source is ahead, fast-forward
                return {
                    ...state,
                    branches: { ...state.branches, [targetBranchName]: { ...state.branches[targetBranchName], commitId: sourceCommitId } },
                    workingDirectory: state.commits[sourceCommitId].content,
                    stagingArea: null,
                };
            }

            if(commonAncestorId === sourceCommitId) { // Target is ahead, nothing to merge. For simulation, create a merge commit.
                 // Let the logic continue to create a merge commit
            }

            const sourceCommit = state.commits[sourceCommitId];
            const targetCommit = state.commits[targetCommitId];
            const ancestorCommit = state.commits[commonAncestorId];

            const sourceContent = sourceCommit.content;
            const targetContent = targetCommit.content;
            const ancestorContent = ancestorCommit.content;
            
            const mergeResult = diff.merge(targetContent, sourceContent, ancestorContent);
    
            let mergedContentLines: string[] = [];
            let hasConflict = false;

            mergeResult.forEach(hunk => {
                if ('conflict' in hunk) {
                    hasConflict = true;
                    mergedContentLines.push('<<<<<<< HEAD');
                    mergedContentLines.push(...hunk.mine);
                    mergedContentLines.push('=======');
                    mergedContentLines.push(...hunk.theirs);
                    mergedContentLines.push(`>>>>>>> ${sourceBranchName}`);
                } else if ('ok' in hunk) {
                    mergedContentLines.push(...hunk.ok);
                }
            });
            
            const mergedContent = mergedContentLines.join('\n');

            if (hasConflict) {
                return {
                    ...state,
                    workingDirectory: mergedContent,
                    stagingArea: null,
                    mergeState: { sourceBranch: sourceBranchName },
                };
            }
            
            const newCommitId = crypto.randomUUID().slice(0, 7);
            const mergeCommit: Commit = {
                id: newCommitId,
                parents: [targetCommitId, sourceCommitId].sort(),
                message: `Merge branch '${sourceBranchName}' into '${targetBranchName}'`,
                author: 'GitFlow',
                timestamp: Date.now(),
                content: mergedContent,
            };

            return {
                ...state,
                commits: { ...state.commits, [newCommitId]: mergeCommit },
                branches: {
                    ...state.branches,
                    [targetBranchName]: { ...state.branches[targetBranchName], commitId: newCommitId }
                },
                workingDirectory: mergeCommit.content,
                stagingArea: null,
                commitOrder: [...state.commitOrder, newCommitId],
            };
        }
        case 'REVERT': {
            if (state.HEAD.type !== 'branch' || state.mergeState) return state;

            const { commitId } = action.payload;
            const commitToRevert = state.commits[commitId];

            if (!commitToRevert || commitToRevert.parents.length === 0) {
                return state; // Cannot revert initial commit
            }

            const parentOfRevertedCommit = state.commits[commitToRevert.parents[0]];
            const newContent = parentOfRevertedCommit.content;
            
            const newCommitId = crypto.randomUUID().slice(0, 7);
            const parentCommitId = state.branches[state.HEAD.name].commitId;

            const newCommit: Commit = {
                id: newCommitId,
                parents: [parentCommitId],
                message: `Revert "${commitToRevert.message}"`,
                author: 'GitFlow',
                timestamp: Date.now(),
                content: newContent,
            };

            return {
                ...state,
                commits: { ...state.commits, [newCommitId]: newCommit },
                branches: { ...state.branches, [state.HEAD.name]: { ...state.branches[state.HEAD.name], commitId: newCommitId } },
                workingDirectory: newContent,
                stagingArea: null,
                commitOrder: [...state.commitOrder, newCommitId],
            };
        }
        default:
            return state;
    }
}


export default function GitVisualizer() {
  const [repoState, dispatch] = useReducer(gitReducer, undefined, getInitialState);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const prevMergeStateRef = useRef(repoState.mergeState);
  useEffect(() => {
    const prevMergeState = prevMergeStateRef.current;
    if (repoState.mergeState && !prevMergeState) {
       toast({
        variant: "destructive",
        title: "Merge Conflict!",
        description: `Auto-merge failed. Resolve conflicts in the editor, then stage and commit to proceed.`,
        duration: 5000,
      });
    }
    prevMergeStateRef.current = repoState.mergeState;
  }, [repoState.mergeState, toast]);


  const currentBranchCommits = useMemo(() => {
    if (!isClient || repoState.HEAD.type !== 'branch') return [];
    
    const commitsList: Commit[] = [];
    const headCommitId = repoState.branches[repoState.HEAD.name].commitId;
    let currentCommitId: string | undefined = headCommitId;
    const visited = new Set<string>();

    while (currentCommitId && !visited.has(currentCommitId)) {
        visited.add(currentCommitId);
        const commit = repoState.commits[currentCommitId];
        if (commit) {
            commitsList.push(commit);
            // This simplification only follows the first parent.
            // For a merge commit, it will follow the main branch history.
            currentCommitId = commit.parents[0];
        } else {
            currentCommitId = undefined;
        }
    }
    return commitsList.sort((a, b) => b.timestamp - a.timestamp);
  }, [repoState, isClient]);


  const handleCommit = (message: string) => {
    if (repoState.stagingArea === null) {
      toast({
        variant: "destructive",
        title: "Nothing to commit",
        description: "Stage your changes before committing.",
      });
      return;
    }
    
    const isMerging = !!repoState.mergeState;
    dispatch({ type: 'COMMIT', payload: { message, author: 'You' } });

    toast({
      title: isMerging ? "Merge complete!" : "Committed!",
      description: isMerging ? `Successfully merged.` : "Your changes have been committed.",
    });
  };

  const handleBranch = (branchName: string) => {
    if (repoState.mergeState) {
        toast({ variant: 'destructive', title: 'Merge in progress', description: 'Finish the merge before creating a new branch.' });
        return;
    }
    const currentCommitId = repoState.HEAD.type === 'branch' ? repoState.branches[repoState.HEAD.name].commitId : repoState.HEAD.id;
    if (repoState.branches[branchName]) {
      toast({
        variant: 'destructive',
        title: 'Branch exists',
        description: `Branch "${branchName}" already exists.`,
      });
      return;
    }
    dispatch({ type: 'BRANCH', payload: { branchName, fromCommitId: currentCommitId } });
    toast({
        title: 'Branch created',
        description: `Branch "${branchName}" created from current HEAD.`,
    });
  };

  const handleCheckout = (branchName: string) => {
    if (repoState.mergeState) {
      toast({
        variant: "destructive",
        title: "Merge in progress",
        description: `Cannot switch branches while resolving a merge conflict. Please commit or abort.`,
      });
      return;
    }
    dispatch({ type: 'CHECKOUT', payload: branchName });
    toast({
      title: 'Switched branch',
      description: `You are now on branch "${branchName}".`,
    });
  };
  
  const handleMerge = (branchName: string) => {
    if (repoState.HEAD.type === 'branch' && repoState.HEAD.name === branchName) {
        toast({ variant: 'destructive', title: 'Merge Error', description: 'Cannot merge a branch into itself.' });
        return;
    }
    dispatch({ type: 'MERGE', payload: branchName });
    if (!repoState.mergeState) { // This check might be racy, relies on reducer state change
        const sourceCommitId = repoState.branches[branchName].commitId;
        const targetCommitId = repoState.HEAD.type === 'branch' ? repoState.branches[repoState.HEAD.name].commitId : repoState.HEAD.id;
        const commonAncestorId = findCommonAncestor(repoState, sourceCommitId, targetCommitId);
        
        if (commonAncestorId === targetCommitId) {
             toast({ title: 'Fast-forward merge', description: `Merged "${branchName}" into current branch.` });
        } else if (!repoState.mergeState){
             toast({ title: 'Merge successful', description: `Created merge commit for "${branchName}".` });
        }
    }
  };

  const handleRevert = (commitId: string) => {
     if (repoState.mergeState) {
        toast({ variant: 'destructive', title: 'Merge in progress', description: 'Finish the merge before reverting.' });
        return;
    }
    dispatch({ type: 'REVERT', payload: { commitId } });
    toast({
      title: 'Commit reverted',
      description: `Created a new commit to revert the selected changes.`,
    });
  };

  const handleStage = () => {
    dispatch({ type: 'STAGE' });
    toast({ title: 'Changes Staged', description: 'Your changes are ready to be committed.' });
  }

  const handleInit = () => {
    dispatch({ type: 'INIT' });
    toast({ title: 'Repository Initialized', description: 'A new GitFlow repository has been created.' });
  }

  if (!isClient) {
    return null;
  }

  const headCommitId = repoState.HEAD.type === 'branch' ? repoState.branches[repoState.HEAD.name].commitId : repoState.HEAD.id;
  const headContent = repoState.commits[headCommitId]?.content ?? '';

  return (
    <div className="flex flex-col h-full bg-background font-sans">
        <header className="p-4 border-b border-border flex items-center justify-between bg-card shrink-0">
            <h1 className="text-2xl font-bold font-headline text-primary">GitFlow</h1>
            <Controls 
                repoState={repoState}
                onCommit={handleCommit}
                onBranch={handleBranch}
                onCheckout={handleCheckout}
                onMerge={handleMerge}
                onStage={handleStage}
                onInit={handleInit}
                onRevert={handleRevert}
                repoCommits={Object.values(repoState.commits)}
            />
        </header>
        <div className="flex flex-grow overflow-hidden">
            <div className="w-2/5 p-4 h-full flex flex-col min-w-[300px]">
              <TextEditor 
                  content={repoState.workingDirectory}
                  onContentChange={(content) => dispatch({ type: 'EDIT_FILE', payload: content })}
                  stagedContent={repoState.stagingArea}
                  headContent={headContent}
              />
            </div>
            <div className="w-3/5 p-4 h-full overflow-auto border-l flex-grow">
                <Card className="h-full">
                    <CardContent className="p-4 h-full">
                        <Timeline repoState={repoState} />
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
