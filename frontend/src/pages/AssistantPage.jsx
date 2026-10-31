import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Sparkles,
  Send,
  BookOpen,
  Compass,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage, heritageApi } from '../services/api';

const AssistantPage = () => {
  const [message, setMessage] = useState('');
  const [conversationId] = useState(
    () => `hl-sess-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`
  );

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Namaste! I am the HeritageLens AI Cultural Heritage Assistant. Ask me about India’s architectural wonders, historical periods, stone-carving traditions, or specific archival records in our repository.',
      sources: [
        {
          id: 6,
          type: 'site',
          title: 'Konark Sun Temple',
          location: 'Puri, Odisha',
          url: '/site/6',
          citation: 'UNESCO World Heritage Centre (Ref: 246)',
        },
        {
          id: 1,
          type: 'site',
          title: 'Taj Mahal',
          location: 'Agra, Uttar Pradesh',
          url: '/site/1',
          citation: 'ASI Agra Circle & Ebba Koch (2006)',
        },
      ],
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const suggestedQuestions = [
    'What is the architectural significance of the Konark Sun Temple wheel?',
    'Which dynasties contributed to the rock-cut cave temples of Ellora?',
    'Explain the charbagh garden layout and pietra dura at the Taj Mahal.',
    'What construction techniques and materials were used in medieval Hampi ruins?',
  ];

  const handleSend = async (textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend : message;
    if (!query.trim() || loading) return;

    const userMessage = { role: 'user', text: query.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await heritageApi.askAssistant({
        question: query.trim(),
        conversation_id: conversationId,
      });

      const assistantMessage = {
        role: 'assistant',
        text: response.answer,
        sources: response.sources || [],
        mode: response.mode,
        warning: response.warning,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Assistant error:', err);
      const errorText = getApiErrorMessage(
        err,
        'The HeritageLens research service could not process your question.'
      );

      setErrorMessage(errorText);
      // Append an error message bubble
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Inquiry could not be fulfilled: ${errorText}`,
          isError: true,
          sources: [],
        },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-maroon/10 text-maroon rounded-full text-xs font-semibold tracking-wider uppercase mb-3">
            <Sparkles size={14} />
            <span>AI Cultural Heritage Assistant</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-charcoal mb-3">
            Inquire Into India's Heritage
          </h1>
          <p className="text-base md:text-lg text-charcoal/70 max-w-2xl leading-relaxed">
            Ask questions about monuments, architectural eras, inscriptions, or regional crafts. All answers are grounded strictly in verified archival evidence and official citations.
          </p>
        </motion.div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-soft border border-parchment-dark/30 flex flex-col h-[580px] overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-maroon to-vermillion text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot size={18} />
                  </div>
                )}

                <div
                  className={`max-w-xl rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-maroon text-white rounded-tr-xs shadow-xs'
                      : msg.isError
                      ? 'bg-vermillion/10 text-vermillion-dark border border-vermillion/30 rounded-tl-xs'
                      : 'bg-parchment/60 text-charcoal border border-parchment-dark/30 rounded-tl-xs'
                  }`}
                >
                  {/* Assistant Mode Pill if available */}
                  {msg.role === 'assistant' && msg.mode && (
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase">
                      {msg.mode === 'omnirouter_ai' ? (
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck size={11} />
                          <span>Omnirouter Grounded Synthesis</span>
                        </span>
                      ) : (
                        <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Building size={11} />
                          <span>Archive Database Grounded</span>
                        </span>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* Warning Note if API key unconfigured or provider failed */}
                  {msg.warning && (
                    <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200/60 rounded-lg text-[11px] text-amber-900 leading-snug flex items-start gap-1.5">
                      <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-700" />
                      <span>{msg.warning}</span>
                    </div>
                  )}

                  {/* Clickable Grounded Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-parchment-dark/40">
                      <div className="flex items-center gap-1.5 text-xs text-maroon font-semibold mb-2">
                        <BookOpen size={12} />
                        <span>Verified Archival Records Referenced:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src, i) => (
                          <Link
                            key={i}
                            to={src.url || `/site/${src.id}`}
                            className="inline-flex items-center gap-1.5 text-[11px] bg-white hover:bg-gold/10 px-2.5 py-1 rounded-lg border border-parchment-dark/50 text-maroon hover:border-maroon font-semibold transition-all shadow-2xs group"
                            title={src.citation || src.title}
                          >
                            <span>{src.title}</span>
                            {src.location && (
                              <span className="text-[10px] text-charcoal/50 font-normal">
                                · {src.location}
                              </span>
                            )}
                            <ExternalLink size={10} className="text-charcoal/40 group-hover:text-maroon shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-maroon/10 text-maroon flex items-center justify-center shrink-0">
                  <Bot size={18} />
                </div>
                <div className="bg-parchment/60 rounded-2xl p-4 border border-parchment-dark/30 flex items-center gap-2 text-xs text-charcoal/70">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-maroon rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-maroon rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-maroon rounded-full animate-bounce" />
                  </div>
                  <span>Retrieving verified archival records and synthesizing answer...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts if conversation is beginning */}
          {messages.length <= 2 && (
            <div className="px-6 py-3 bg-parchment/30 border-t border-parchment-dark/20">
              <div className="text-xs text-charcoal/60 mb-2 flex items-center gap-1">
                <Compass size={12} />
                <span>Suggested research inquiries:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-xs bg-white hover:bg-parchment text-charcoal/80 px-3 py-1.5 rounded-full border border-parchment-dark/30 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-parchment-dark/30">
            {errorMessage && (
              <div className="mb-2.5 px-3 py-1.5 bg-vermillion/10 rounded-lg text-xs text-vermillion flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-vermillion/60 hover:text-vermillion font-bold text-xs"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Indian heritage, monuments, dynasties, or architectural styles..."
                className="flex-1 px-4 py-3 bg-parchment/40 rounded-xl border border-parchment-dark/30 text-charcoal placeholder-charcoal/40 text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent transition-all"
              />
              <button
                onClick={() => handleSend()}
                disabled={!message.trim() || loading}
                className="px-5 py-3 bg-maroon text-white rounded-xl font-medium text-sm hover:bg-maroon-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-xs"
              >
                <span>Send</span>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
