export interface Commit {
  id: string;
  parents: string[];
  message: string;
  timestamp: number;
  author: string;
  content: string;
}

export interface Branch {
  name: string;
  commitId: string;
}

export interface GitRepository {
  commits: Record<string, Commit>;
  branches: Record<string, Branch>;
  HEAD: { type: 'branch'; name: string } | { type: 'commit'; id: string };
  stagingArea: string | null;
  workingDirectory: string;
  commitOrder: string[];
  mergeState?: {
    sourceBranch: string;
  };
}
