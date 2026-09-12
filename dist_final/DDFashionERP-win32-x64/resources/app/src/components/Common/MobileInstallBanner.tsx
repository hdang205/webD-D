import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download, Share2, PlusSquare, Check } from 'lucide-react';

export const MobileInstallBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed before
    const dismissed = localStorage.getItem('dnd_mobile_banner_dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check if mobile device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    setIsIOS(isIosDevice);

    // If on mobile and not standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isMobileDevice && !isStandalone) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('dnd_mobile_banner_dismissed', 'true');
  };

  if (!showBanner || isDismissed) return null;

  return (
    <div className="md:hidden bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-3 border-b border-rose-800/60 shadow-lg text-xs relative animate-in slide-in-from-top duration-300">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-[#fb6f92] to-[#a93054] rounded-xl text-white font-bold shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Cài đặt App Thời Trang D&D</span>
              <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full">PWA Mobile</span>
            </div>
            <p className="text-[11px] text-pink-200 mt-0.5 leading-snug">
              {isIOS 
                ? 'Bấm nút Chia sẻ (Share) 📤 rồi chọn "Thêm vào MH chính" để dùng toàn màn hình mượt mà như App gốc.'
                : 'Thêm vào Màn hình chính trên điện thoại để quét mã vạch và bán hàng POS không cần mở lại trình duyệt.'}
            </p>
          </div>
        </div>

        <button 
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 cursor-pointer"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
