import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, ChevronDown, ChevronUp, Bot, User, CornerDownLeft } from 'lucide-react';
import { Message, AgentState } from '../types/client.ts';

interface ConversationPanelProps {
  messages: Message[];
  agentState: AgentState;
  onSendMessage: (text: string) => void;
}

const QUICK_PROMPTS = [
  { label: 'Where is ORD-101?', query: 'Where is order ORD-101?' },
  { label: 'Cancel ORD-103', query: 'Cancel order ORD-103' },
  { label: 'Cancel ORD-101', query: 'Cancel order ORD-101' },
  { label: 'Track ORD-999', query: 'Track ORD-999' },
  { label: 'Sunscreen 14-day return', query: 'I received my sunscreen 14 days ago and opened it. Can I return it?' },
  { label: 'Damaged item', query: 'My product arrived damaged.' },
  { label: 'Shipping cost', query: 'How much is delivery?' },
  { label: 'COD for ₹2,000', query: 'Can I pay cash on delivery for an order worth ₹2,000?' },
  { label: 'Flight to Goa', query: 'Book me a flight to Goa.' },
  { label: 'Help with my order', query: 'Can you help me with my order?' },
];

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  agentState,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-[520px] rounded-3xl bg-[#FFFFFF]/80 border border-[#E8DFD1] shadow-[0_10px_35px_-20px_rgba(45,78,53,0.06)] overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-3.5 border-b border-[#EFE8DC] bg-[#FAF7F2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#355C3A]" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2B3B2E]">
            Live Conversation Transcript
          </h4>
        </div>
        <span className="text-[11px] text-[#78887C] bg-[#ECE5D9] px-2 py-0.5 rounded-full font-mono">
          {messages.length} messages
        </span>
      </div>

      {/* Quick Prompt Carousel */}
      <div className="px-4 py-2 border-b border-[#F0E9DF] bg-[#FAF8F5] overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-medium text-[#7D6F5E] shrink-0 mr-1">
          Quick test:
        </span>
        {QUICK_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(p.query)}
            className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg border border-[#DFD5C7] bg-[#FFFFFF] hover:bg-[#EAE3D6] text-[#344237] transition-all cursor-pointer whitespace-nowrap"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Messages Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#7F8D82]">
            <div className="w-12 h-12 rounded-2xl bg-[#F0EAE1] flex items-center justify-center text-[#557A5D] mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <p className="font-serif text-lg text-[#2A372D] font-medium">
              Start a Conversation with Aria
            </p>
            <p className="text-xs text-[#6F7D72] max-w-xs mt-1">
              Click Start Voice Call or tap any sample prompt above to test order lookups, returns, and brand policies.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isCustomer = msg.speaker === 'customer';
            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 ${isCustomer ? 'justify-end' : 'justify-start'}`}
              >
                {!isCustomer && (
                  <div className="w-8 h-8 rounded-xl bg-[#2D5A35] text-white flex items-center justify-center text-xs font-serif shrink-0 mt-0.5 shadow-2xs">
                    A
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    isCustomer
                      ? 'bg-[#355E3B] text-white rounded-br-xs'
                      : 'bg-[#F9F6F0] border border-[#E7DFD2] text-[#243026] rounded-bl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75">
                    <span className="font-medium tracking-wide uppercase">
                      {isCustomer ? 'You' : 'Aria'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Tool Invocations Badge if any */}
                  {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#DFD7CA]/60 space-y-1.5">
                      {msg.toolInvocations.map((tool, tIdx) => {
                        const toolKey = `${msg.id}_tool_${tIdx}`;
                        const isExpanded = expandedTools[toolKey];
                        return (
                          <div
                            key={tIdx}
                            className="rounded-lg bg-[#EAE2D5]/70 border border-[#D5C9B8] text-[11px] text-[#334235] overflow-hidden"
                          >
                            <button
                              onClick={() => toggleTool(toolKey)}
                              className="w-full px-2.5 py-1.5 flex items-center justify-between text-left font-mono font-medium hover:bg-[#E3D9CA] transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5 text-[#2E5835]">
                                <Terminal className="w-3 h-3" />
                                <span>⚡ {tool.toolName}</span>
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-[#647466]" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-[#647466]" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="p-2 border-t border-[#D5C9B8] bg-[#FAF7F2] font-mono text-[10px] space-y-1">
                                <div>
                                  <span className="text-[#7F7160]">Input: </span>
                                  <pre className="whitespace-pre-wrap text-[#263529] overflow-x-auto">
                                    {JSON.stringify(tool.arguments, null, 2)}
                                  </pre>
                                </div>
                                <div className="mt-1">
                                  <span className="text-[#7F7160]">Verified Output: </span>
                                  <pre className="whitespace-pre-wrap text-[#204E27] overflow-x-auto font-medium">
                                    {JSON.stringify(tool.result, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {isCustomer && (
                  <div className="w-8 h-8 rounded-xl bg-[#E4DFD3] text-[#425044] flex items-center justify-center text-xs shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live thinking bubble */}
        {agentState === 'thinking' && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-xl bg-[#2D5A35] text-white flex items-center justify-center text-xs font-serif shrink-0">
              A
            </div>
            <div className="rounded-2xl px-4 py-2.5 bg-[#F9F6F0] border border-[#E7DFD2] text-[#55695A] text-xs flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3D6946] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#3D6946] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#3D6946] animate-bounce [animation-delay:0.4s]" />
              </span>
              <span>Aria is checking records...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Text Message Fallback Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#EFE8DC] bg-[#FAF7F2]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message or policy question (e.g. Where is ORD-101?)..."
            className="flex-1 bg-white border border-[#DFD6C7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1F2E23] placeholder-[#8A988D] focus:outline-none focus:ring-2 focus:ring-[#3D6946]/30 focus:border-[#3D6946] transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-[#2D5A35] hover:bg-[#204426] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-all cursor-pointer"
            title="Send text message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
