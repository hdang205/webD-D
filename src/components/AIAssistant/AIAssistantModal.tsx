import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Loader2, BookOpen, Lightbulb } from 'lucide-react';
import { CompanyInfo } from '../../types/accounting';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyInfo: CompanyInfo;
  contextData?: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  companyInfo,
  contextData
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Xin chào! Tôi là **Trợ lý Kế toán & Cố vấn Cửa Hàng Thời Trang AI** của **${companyInfo.name || 'Cửa hàng'}**.\n\nBạn có thể hỏi tôi về:\n- Hạch toán & định khoản Nợ/Có nhập kho thời trang, bán lẻ showroom, chi phí quay chụp lookbook, thuê mặt bằng theo **Thông tư 133/2016/TT-BTC** & **200/2014/TT-BTC**.\n- Quản lý công nợ xưởng may, công nợ khách sỉ & VIP.\n- Phân tích hiệu quả kinh doanh & gợi ý cân đối giá vốn/giá bán các bộ sưu tập thời trang.`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    if (!promptToSend) setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          contextData,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi khi kết nối với AI Assistant.');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.result }]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: `⚠️ **Không thể kết nối Gemini AI:** ${e.message}\n\n*Gợi ý:* Hãy kiểm tra lại API Key Gemini trong Secrets hoặc thử lại sau.` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'Chi trả tiền thuê mặt bằng showroom Phố Huế 15 triệu hạch toán Nợ/Có như thế nào?',
    'Nhập kho 50 Áo Sơ Mi Lụa từ Xưởng May trả chậm 30 ngày hạch toán tài khoản nào?',
    'Khác biệt chính giữa Thông tư 133 và Thông tư 200 cho cửa hàng thời trang vừa & nhỏ?',
    'Phân tích nhanh doanh thu, giá vốn và sức khỏe tài chính hiện tại của cửa hàng'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-rose-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Trợ Lý Kế Toán & Cố Vấn Gemini AI</span>
                <span className="text-[10px] bg-pink-100 text-[#a93054] px-2 py-0.5 rounded-full border border-pink-200 font-mono font-bold">
                  TT133 / TT200
                </span>
              </h3>
              <p className="text-xs text-slate-500">Tư vấn nghiệp vụ kế toán thời trang, định khoản Nợ/Có & chính sách thuế Việt Nam</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-rose-100/60 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Chat List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs bg-slate-50/30">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-pink-100 border border-pink-200 text-[#a93054] flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`p-4 rounded-2xl max-w-lg leading-relaxed whitespace-pre-wrap text-xs ${
                msg.role === 'user'
                  ? 'bg-[#fb6f92] text-white rounded-br-none font-medium shadow-xs'
                  : 'bg-white border border-rose-100 text-slate-700 rounded-bl-none shadow-xs'
              }`}>
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-rose-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-[#a93054] font-medium p-3 bg-pink-50 border border-pink-150 rounded-xl w-fit shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#fb6f92]" />
              <span>Trợ lý Gemini đang phân tích định khoản & dữ liệu kế toán...</span>
            </div>
          )}
        </div>

        {/* Quick Sample Suggestions */}
        <div className="px-6 py-2 bg-rose-50/50 border-t border-rose-100 flex items-center gap-2 overflow-x-auto text-[11px]">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-slate-500 font-semibold shrink-0">Gợi ý hỏi:</span>
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 bg-white hover:bg-rose-100 text-slate-700 rounded-lg whitespace-nowrap transition cursor-pointer border border-rose-200 shadow-xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-rose-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              placeholder="Nhập câu hỏi kế toán, mô tả nghiệp vụ cần định khoản..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#fb6f92]"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="p-2.5 bg-[#fb6f92] hover:bg-[#a93054] disabled:opacity-40 text-white rounded-xl transition cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
