// In components/chat-message.tsx
import { Message } from '@/app/types';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SourcesDisplay from '@/components/sources-display';

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export default function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  // Function to convert markdown-like bold syntax to HTML
  const formatContent = (content: string) => {
    // Replace **text** with <strong>text</strong>
    const boldFormatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Add line breaks
    const withLineBreaks = boldFormatted.replace(/\n/g, '<br />');
    
    // Return formatted content
    return { __html: withLineBreaks };
  };

  return (
    <div className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && (
        <Avatar className="w-8 h-8 mt-1 bg-primary text-primary-foreground flex items-center justify-center">
          <span className="text-xs font-medium">AI</span>
        </Avatar>
      )}
      
      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
        <Card className={`border-0 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          <CardContent className="p-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-4/5 h-4" />
                <Skeleton className="w-2/3 h-4" />
              </div>
            ) : (
              <div className="space-y-2">
                {message.role === 'assistant' ? (
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={formatContent(message.content)}
                  />
                ) : (
                  <div className="text-sm">{message.content}</div>
                )}
                
                {message.sources && message.sources.length > 0 && (
                  <SourcesDisplay sources={message.sources} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {message.role === 'user' && (
        <Avatar className="w-8 h-8 mt-1 bg-primary-foreground text-primary order-2 flex items-center justify-center">
          <span className="text-xs font-medium">You</span>
        </Avatar>
      )}
    </div>
  );
}