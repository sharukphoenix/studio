"use client";

import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  stagedContent: string | null;
  headContent: string;
}

export default function TextEditor({ content, onContentChange, stagedContent, headContent }: TextEditorProps) {
  const isModified = content !== headContent;
  const isStaged = stagedContent !== null;
  const hasConflict = content.includes('<<<<<<< HEAD');
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="font-headline">Working Copy</CardTitle>
            <div className="flex gap-2">
              {hasConflict && <Badge variant="destructive">Conflict</Badge>}
              {!hasConflict && isStaged && <Badge variant="secondary">Staged</Badge>}
              {!hasConflict && isModified && !isStaged && <Badge variant="destructive">Modified</Badge>}
              {!hasConflict && !isModified && !isStaged && <Badge variant="outline">Clean</Badge>}
            </div>
        </div>
        <CardDescription>
          {hasConflict
            ? "A merge conflict has occurred. Please resolve it and commit."
            : "This is your virtual file. Make changes and commit them."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <Textarea 
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="h-full w-full resize-none text-sm font-mono"
          placeholder="Start coding here..."
        />
      </CardContent>
    </Card>
  );
}
