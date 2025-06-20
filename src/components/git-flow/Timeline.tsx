"use client";

import type { GitRepository, Commit } from '@/types/git';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const LANE_HEIGHT = 60;
const COMMIT_WIDTH = 100;
const COMMIT_RADIUS = 16;

const branchColors = [
    '#2563eb', '#ca8a04', '#16a34a', '#dc2626', '#9333ea', 
    '#db2777', '#0891b2', '#f97316'
];

const getBranchColor = (branchName: string, branchNames: string[]) => {
    if (branchName === 'main') return 'hsl(var(--primary))';
    const index = branchNames.filter(b => b !== 'main').indexOf(branchName);
    return branchColors[index % branchColors.length];
};

interface CommitNode extends Commit {
    x: number;
    y: number;
}

export default function Timeline({ repoState }: { repoState: GitRepository }) {

    const { nodes, lanes, branchNames, width, height } = useMemo(() => {
        const { commits, branches, commitOrder } = repoState;

        const bNames = Object.keys(branches).sort((a,b) => a === 'main' ? -1 : b === 'main' ? 1: a.localeCompare(b));
        const laneMap = new Map(bNames.map((name, i) => [name, i]));
        
        const commitToBranch = new Map<string, string>();
        for (const branch of Object.values(branches)) {
            let currentId: string | undefined = branch.commitId;
            const visited = new Set<string>();
            while (currentId && !visited.has(currentId)) {
                visited.add(currentId);
                const commit = commits[currentId];
                if (!commit) break;

                // If a commit is already part of another branch's history, don't re-assign it,
                // unless it's the current branch's head (for branching points).
                if (!commitToBranch.has(currentId) || currentId === branch.commitId) {
                    commitToBranch.set(currentId, branch.name);
                }

                if (commit.parents.length > 0) {
                    // Follow first parent for history traversal
                    currentId = commit.parents[0];
                } else {
                    currentId = undefined;
                }
            }
        }
        
        const nodeMap = new Map<string, CommitNode>();
        commitOrder.forEach((commitId, index) => {
            const commit = commits[commitId];
            if(!commit) return;
            const branchName = commitToBranch.get(commitId) || 'main'; // Fallback to main
            let lane = laneMap.get(branchName);

            if(lane === undefined) {
                lane = laneMap.size;
                laneMap.set(branchName, lane);
            }
            
            nodeMap.set(commit.id, {
                ...commit,
                x: (index + 1) * COMMIT_WIDTH,
                y: lane * LANE_HEIGHT + LANE_HEIGHT / 2
            });
        });
        
        return {
            nodes: Array.from(nodeMap.values()),
            lanes: laneMap,
            branchNames: bNames,
            width: (commitOrder.length + 2) * COMMIT_WIDTH,
            height: (laneMap.size + 1) * LANE_HEIGHT
        };

    }, [repoState]);
    
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const headCommitId = repoState.HEAD.type === 'branch' ? repoState.branches[repoState.HEAD.name].commitId : repoState.HEAD.id;

    return (
        <TooltipProvider>
            <div className="w-full h-full overflow-auto">
                <svg width={width} height={height} className="font-sans">
                    <defs>
                        <style>
                            {`
                                .path-line {
                                    transition: d 0.5s ease-in-out;
                                }
                                .commit-node {
                                    transition: transform 0.3s ease-in-out;
                                }
                                .commit-node:hover {
                                    transform-origin: center;
                                    transform-box: fill-box;
                                }
                            `}
                        </style>
                    </defs>
                    {nodes.map(node => 
                        node.parents.map(parentId => {
                            const parentNode = nodeMap.get(parentId);
                            if (!parentNode) return null;
                            
                            const isStraight = parentNode.y === node.y && node.parents.length === 1;
                            const d = isStraight
                                ? `M ${parentNode.x} ${parentNode.y} L ${node.x} ${node.y}`
                                : `M ${parentNode.x} ${parentNode.y} C ${parentNode.x + COMMIT_WIDTH / 2} ${parentNode.y}, ${node.x - COMMIT_WIDTH / 2} ${node.y}, ${node.x} ${node.y}`;
                            
                            return <path key={`${parentId}-${node.id}`} d={d} stroke="#ccc" strokeWidth="2" fill="none" className="path-line" />;
                        })
                    )}
                    
                    {nodes.map(node => (
                        <Tooltip key={node.id}>
                            <TooltipTrigger asChild>
                                <g transform={`translate(${node.x}, ${node.y})`} className="commit-node cursor-pointer hover:scale-110">
                                    <circle 
                                        r={COMMIT_RADIUS}
                                        fill={headCommitId === node.id ? 'hsl(var(--accent))' : 'hsl(var(--primary))'}
                                        stroke={headCommitId === node.id ? 'hsl(var(--primary))' : "hsl(var(--primary-foreground))"}
                                        strokeWidth={headCommitId === node.id ? 3 : 2}
                                    />
                                    <text y="4" textAnchor="middle" fill={headCommitId === node.id ? 'hsl(var(--accent-foreground))' : 'hsl(var(--primary-foreground))'} fontSize="10px" pointerEvents="none">{node.id.substring(0,4)}</text>
                                </g>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-bold">{node.message}</p>
                                <p className="text-sm text-muted-foreground">by {node.author} on {new Date(node.timestamp).toLocaleDateString()}</p>
                                <p className="font-mono text-xs mt-2">commit {node.id}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                    
                    {Object.values(repoState.branches).map(branch => {
                        const commitNode = nodeMap.get(branch.commitId);
                        if (!commitNode) return null;
                        const branchColor = getBranchColor(branch.name, branchNames);
                        const isHead = repoState.HEAD.type === 'branch' && repoState.HEAD.name === branch.name;
                        return (
                            <g key={branch.name} transform={`translate(${commitNode.x + COMMIT_RADIUS + 8}, ${commitNode.y})`}>
                               <rect x="0" y="-12" width={branch.name.length * 8 + 16 + (isHead ? 35 : 0)} height="24" rx="4" fill={branchColor} />
                               <text x="8" y="5" fill="white" fontSize="12px" fontWeight="bold">
                                 {branch.name}
                                 {isHead && <tspan fontWeight="normal" opacity="0.8"> (HEAD)</tspan>}
                               </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </TooltipProvider>
    );
}
