'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Message, Source } from '../app/types';
import { v4 as uuidv4 } from 'uuid';
import ChatMessage from '@/components/chat-message';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  // No useToast hook needed with Sonner

  // In app/page.tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create temporary message for streaming
    const tempMessageId = uuidv4();
    setMessages(prev => [
      ...prev,
      {
        id: tempMessageId,
        role: 'assistant',
        content: '',
      },
    ]);

    try {
      // Call RAG API with streaming
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error('Failed to get a response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      // Process the stream
      const decoder = new TextDecoder();
      let sources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;

          const data = JSON.parse(line.replace('data:', '').trim());

          if (data.content) {
            // Update the message content incrementally
            setMessages(prev =>
              prev.map(msg =>
                msg.id === tempMessageId
                  ? { ...msg, content: msg.content + data.content }
                  : msg,
              ),
            );
          }

          if (data.sources) {
            sources = data.sources;
          }

          if (data.done) {
            // Final update with sources
            setMessages(prev =>
              prev.map(msg =>
                msg.id === tempMessageId
                  ? { ...msg, sources: sources || [] }
                  : msg,
              ),
            );
          }
        }
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      toast.error('Failed to get a response. Please try again.');

      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24">
      <div className="w-full max-w-4xl space-y-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Paul Graham Essay Explorer
        </h1>

        <Card className="w-full h-[70vh] flex flex-col">
          <CardContent
            className="flex-1 overflow-y-auto p-4 space-y-4"
            ref={chatContainerRef}
          >
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">
                    Ask about Paul Graham&apos;s essays
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Try questions like &quot;What does Paul Graham think about
                    startup founders?&quot; or &quot;How does Paul Graham view
                    the future of AI?&quot;
                  </p>
                </div>
              </div>
            ) : (
              messages.map(message => (
                <ChatMessage key={message.id} message={message} />
              ))
            )}

            {/* Only show loading indicator if there's no streaming message */}
            {isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1].role === 'user' && (
                <ChatMessage
                  message={{
                    id: 'loading',
                    role: 'assistant',
                    content: 'Thinking...',
                  }}
                  isLoading={true}
                />
              )}
          </CardContent>

          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about Paul Graham's essays..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
      <Toaster />
    </main>
  );
}
