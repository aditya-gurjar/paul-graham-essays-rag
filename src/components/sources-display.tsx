"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface Source {
  id?: number;
  title: string;
  url: string;
}

interface SourcesDisplayProps {
  sources: Source[];
}

export default function SourcesDisplay({ sources }: SourcesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const uniqueSources = sources.filter(
    (source, index, self) =>
      index === self.findIndex((s) => s.url === source.url)
  );
  
  return (
    <div className="mt-3 pt-2 border-t border-muted-foreground/20">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-0"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 mr-1" />
        ) : (
          <ChevronDown className="h-3 w-3 mr-1" />
        )}{' '}
        References ({uniqueSources.length})
      </Button>
      
      {isExpanded && (
        <div className="mt-2 space-y-1 pl-1">
          {uniqueSources.map((source, index) => (
            <div key={index} className="flex items-start">
              <span className="text-xs text-muted-foreground mr-2">
                {source.id ? `[${source.id}]` : `${index + 1}.`}
              </span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-xs text-blue-500 hover:underline"
              >
                {source.title}
                <ExternalLink className="h-3 w-3 ml-1 inline-flex" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}