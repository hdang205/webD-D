import React, { useState, useMemo } from 'react';
import { 
  HeartHandshake, 
  Sparkles, 
  User, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Gift, 
  CheckCircle2, 
  Clock, 
  Star, 
  Copy, 
  Search, 
  Plus, 
  Tag, 
  Scissors, 
  Shirt, 
  Eye, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  Send,
  Check,
  Building2,
  Share2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { 
  CustomerCareLog, 
  CareReminder, 
  BodyShape, 
  Partner, 
  InventoryItem, 
  AuthUser, 
  CustomerCareChannel, 
  CareStatus, 
  CarePriority 
} from '../../types/accounting';

interface CustomerCareViewProps {
  partners: Partner[];
  inventory: InventoryItem[];
  careLogs: CustomerCareLog[];
  careReminders: CareReminder[];
  currentUser: AuthUser | null;
  onSaveCareLog: (log: CustomerCareLog) => void;
  onDeleteCareLog: (id: string) => void;
  onToggleReminderStatus: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onCreateRequisitionFromCare?: (productHint: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const CustomerCareView: React.FC<CustomerCareViewProps> = ({
  partners,
  inventory,
  careLogs,
  careReminders,
  currentUser,
  onSaveCareLog,
  onDeleteCareLog,
  onToggleReminderStatus,
  onDeleteReminder,
  onCreateRequisitionFromCare,
  onNavigateTab
}) => {
  const [activeTab, setActiveTab] = useState<'ADVISOR' | 'LOGS' | 'REMINDERS' | 'SCRIPTS'>('ADVISOR');
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | CustomerCareChannel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CareStatus>('ALL');

  // Copy indicator state
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // ================= STATE CHO CÔNG CỤ TƯ VẤN SIZE & DÁNG NGƯỜI =================
  const [advisorState, setAdvisorState] = useState<{
    selectedPartnerId: string;
    guestName: string;
    guestPhone: string;
    heightCm: number;
    weightKg: number;
    bustCm: number;
    waistCm: number;
    hipsCm: number;
    bodyShape: BodyShape;
    stylePreference: string;
    targetOccasion: string;
  }>({
    selectedPartnerId: partners[0]?.id || '',
    guestName: '',
    guestPhone: '',
    heightCm: 160,
    weightKg: 50,
    bustCm: 85,
    waistCm: 65,
    hipsCm: 90,
    bodyShape: 'HOURGLASS',
    stylePreference: 'Dạ hội sang trọng',
    targetOccasion: 'Dự tiệc cưới / Gala'
  });

  // Modal: Add New Care Log
  const [showLogModal, setShowLogModal] = useState(false);
  const [logFormData, setLogFormData] = useState<{
    partnerId: string;
    channel: CustomerCareChannel;
    purpose: string;
    actionTaken: string;
    customerFeedback: string;
    nextAppointmentDate: string;
    priority: CarePriority;
    status: CareStatus;
    satisfactionRating: number;
  }>({
    partnerId: partners[0]?.id || '',
    channel: 'SHOWROOM',
    purpose: 'Tư vấn chọn trang phục & thử đồ',
    actionTaken: 'Đã tư vấn thử mẫu đầm dạ hội size M và hướng dẫn bảo quản lụa',
    customerFeedback: 'Khách rất ưng ý kiểu dáng và chất liệu lụa satin',
    nextAppointmentDate: '',
    priority: 'HOT',
    status: 'CONSULTING',
    satisfactionRating: 5
  });

  // VIP Customers list
  const customers = useMemo(() => {
    return partners.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH');
  }, [partners]);

  // Selected customer for Advisor
  const selectedAdvisorCustomer = useMemo(() => {
    return customers.find(c => c.id === advisorState.selectedPartnerId);
  }, [customers, advisorState.selectedPartnerId]);

  // Auto calculate BMI and Size recommendation
  const sizeAnalysis = useMemo(() => {
    const { heightCm, weightKg, bustCm, waistCm, hipsCm, bodyShape } = advisorState;
    const heightM = (heightCm || 160) / 100;
    const bmi = weightKg / (heightM * heightM);

    let recommendedSize = 'M';
    if (weightKg < 46 && waistCm < 64) recommendedSize = 'S';
    else if (weightKg <= 53 && waistCm <= 68) recommendedSize = 'M';
    else if (weightKg <= 60 && waistCm <= 74) recommendedSize = 'L';
    else if (weightKg <= 68 && waistCm <= 80) recommendedSize = 'XL';
    else if (weightKg > 68) recommendedSize = 'XXL';

    // Body shape advice
    let shapeName = 'Đồng hồ cát (Hourglass)';
    let dos = [
      'Đầm dạ hội chiết eo ôm dáng thon gọn',
      'Đầm đuôi cá xẻ tà tôn đường cong',
      'Áo cổ V hoặc cổ tim nhẹ nhàng',
      'Thắt lưng bản vừa nhấn eo'
    ];
    let donts = [
      'Trang phục oversize quá rộng làm giấu đi đường cong',
      'Chất liệu vải quá thô cứng không có độ rũ'
    ];
    let recommendedCategory = 'Đầm & Váy';

    if (bodyShape === 'PEAR') {
      shapeName = 'Dáng Quả Lê (Hông & đùi to hơn vai)';
      dos = [
        'Đầm chữ A xòe nhẹ che khuyết điểm đùi',
        'Áo có điểm nhấn ở vai (tay bồng, xếp nếp)',
        'Áo blazer cổ cách điệu tạo cân đối tỷ lệ'
      ];
      donts = [
        'Quần bó sát sáng màu',
        'Váy bút chì quá ôm ở phần hông đùi'
      ];
    } else if (bodyShape === 'RECTANGLE') {
      shapeName = 'Dáng Thước Kẻ / Chữ Nhật (Thanh mảnh, ít đường cong)';
      dos = [
        'Đầm xòe có chiết eo cao hoặc kèm đai lưng',
        'Áo phối bèo nhún, xếp ly tạo cảm giác đầy đặn',
        'Set áo sơ mi lụa và blazer dáng suông thanh lịch'
      ];
      donts = [
        'Đầm suông thẳng đuỗn không nhấn điểm',
        'Áo quá bó sát không điểm nhấn'
      ];
    } else if (bodyShape === 'INVERTED_TRIANGLE') {
      shapeName = 'Dáng Tam Giác Ngược (Vai & ngực rộng hơn hông)';
      dos = [
        'Đầm xếp ly xòe bồng bềnh phần thân dưới',
        'Áo cổ chữ V sâu giúp vai trông thon gọn',
        'Quần ống suông rộng (Palazzo) tạo sự cân đối'
      ];
      donts = [
        'Áo có độn vai dày hoặc cổ thuyền rộng',
        'Họa tiết quá lớn ở phần vai và ngực'
      ];
    } else if (bodyShape === 'APPLE') {
      shapeName = 'Dáng Quả Táo (Vòng 2 đầy đặn)';
      dos = [
        'Đầm suông chữ A nhẹ nhàng không bó bụng',
        'Đầm thắt eo ngay dưới chân ngực (Empire Line)',
        'Áo khoác blazer mỏng mở cúc tạo hiệu ứng đường thẳng đứng thon thả'
      ];
      donts = [
        'Thắt lưng to bản ngay chính giữa bụng',
        'Váy chất liệu bóng bắt sáng quanh vùng eo'
      ];
    }

    return {
      bmi: bmi.toFixed(1),
      bmiCategory: bmi < 18.5 ? 'Gầy nhẹ' : bmi <= 23 ? 'Cân đối chuẩn' : 'Hơi đầy đặn',
      recommendedSize,
      shapeName,
      dos,
      donts,
      recommendedCategory
    };
  }, [advisorState]);

  // Matching in-stock products based on recommended size and category
  const matchingProducts = useMemo(() => {
    return inventory
      .filter(item => {
        const matchSize = !item.size || item.size === advisorState.selectedPartnerId || item.size === sizeAnalysis.recommendedSize || item.size.includes('Free');
        return item.openingQuantity > 0 && matchSize;
      })
      .slice(0, 4);
  }, [inventory, sizeAnalysis.recommendedSize]);

  // Scripts Library
  const scripts = [
    {
      id: 'sc1',
      title: '👗 Kịch Bản Chào Khách VIP & Giới Thiệu BST Mới',
      channel: 'Zalo / SMS / Điện Thoại',
      tag: 'Khách VIP',
      content: `D&D Fashion xin chào Chị [Tên Khách] thân thiết ạ! ❤️
Em [Tên Nhân Viên] bên Showroom 120 Phố Huế xin phép gửi tặng Chị vé mời VIP trải nghiệm sớm Bộ Sưu Tập Thời Trang Thu Đông 2026 với chất liệu Lụa Tơ Tằm & Tweed dệt thủ công độc quyền.
Showroom cũng đã chuẩn bị sẵn mã giảm giá tri ân 15% (Code: VIPTHU2026) dành riêng cho Chị.
Em có thể hỗ trợ chuẩn bị sẵn size [Size Gợi Ý] cho Chị ghé thử vào ngày mai không ạ? Em cảm ơn Chị!`
    },
    {
      id: 'sc2',
      title: '🎂 Kịch Bản Chúc Mừng Sinh Nhật & Tặng Voucher VIP 20%',
      channel: 'Zalo OA / Tin Nhắn',
      tag: 'Sinh Nhật',
      content: `🎉 Chúc mừng Sinh Nhật Chị [Tên Khách] yêu quý! 🎂
D&D Fashion xin chúc Chị bước sang tuổi mới luôn luôn rạng rỡ, hạnh phúc và tràn đầy năng lượng tích cực!
Để ngày đặc biệt của Chị thêm phần ngọt ngào, D&D xin gửi tặng Chị món quà sinh nhật là Voucher giảm ngay 20% cho toàn bộ mẫu đầm dạ hội & công sở thiết kế (Mã: HBD-[Tên Khách]-20).
Voucher có hiệu lực trọn vẹn trong tháng sinh nhật của Chị. Hẹn gặp Chị tại Showroom để D&D phục vụ Chị nhé! ❤️`
    },
    {
      id: 'sc3',
      title: '✨ Kịch Bản Chăm Sóc Sau Mua 3 Ngày & Hỗ Trợ Sửa Lai Đầm',
      channel: 'Hotline / Zalo',
      tag: 'Chăm Sóc Sau Mua',
      content: `D&D Fashion chào Chị [Tên Khách] ạ!
Em là [Tên Nhân Viên] vừa hỗ trợ Chị mua mẫu [Tên Sản Phẩm] hôm trước tại Showroom.
Em nhắn tin hỏi thăm xem Chị đã mặc thử đầm có vừa vặn và ưng ý form dáng chưa ạ?
Nếu Chị cần hỗ trợ lên lai váy, bóp eo nhẹ hoặc muốn hướng dẫn cách giặt ủi lụa tơ tằm giữ form chuẩn nhất, Chị cứ nhắn em nhé, D&D hỗ trợ chỉnh sửa hoàn toàn miễn phí ạ!`
    },
    {
      id: 'sc4',
      title: '⚡ Xử Lý Tình Huống Hết Size Tại Quầy (Hẹn Đặt May Riêng)',
      channel: 'Tư Vấn Trực Tiếp / POS',
      tag: 'Xử Lý Hết Size',
      content: `Dạ em rất xin lỗi Chị vì mẫu đầm này size [Size Khách Hỏi] hiện tại vừa hết tại quầy do nhiều khách yêu thích ạ.
Tuy nhiên, bên em có xưởng may riêng có thể may chuẩn chỉnh theo đúng số đo 3 vòng của Chị và giao tận nơi trong vòng 3-4 ngày tới mà không phát sinh thêm bất kỳ chi phí nào.
Em xin phép lấy số đo vòng eo & chiều cao của Chị để lập ngay đơn đặt xưởng ưu tiên số 1 cho Chị nhé ạ!`
    }
  ];

  // Copy script handler
  const handleCopyScript = (script: typeof scripts[0]) => {
    let text = script.content;
    const custName = selectedAdvisorCustomer ? selectedAdvisorCustomer.name.split('(')[0].trim() : 'Quý Khách';
    const staffName = currentUser ? currentUser.name : 'Chuyên Viên D&D';
    text = text.replace(/\[Tên Khách\]/g, custName);
    text = text.replace(/\[Tên Nhân Viên\]/g, staffName);
    text = text.replace(/\[Size Gợi Ý\]/g, sizeAnalysis.recommendedSize);

    navigator.clipboard.writeText(text);
    setCopiedScriptId(script.id);
    setTimeout(() => setCopiedScriptId(null), 2500);
  };

  // Save current advisor result as a Care Log
  const handleSaveAdvisorAsLog = () => {
    const customer = selectedAdvisorCustomer || {
      id: 'guest',
      name: advisorState.guestName || 'Khách Hàng Tư Vấn Tại Quầy',
      phone: advisorState.guestPhone || ''
    };

    const newLog: CustomerCareLog = {
      id: `care_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partnerId: customer.id,
      partnerName: customer.name,
      partnerPhone: customer.phone,
      staffId: currentUser?.id || 'emp_default',
      staffName: currentUser?.name || 'Nhân Viên Bán Hàng',
      channel: 'SHOWROOM',
      purpose: `Tư vấn phong cách & chọn size cho dịp ${advisorState.targetOccasion}`,
      bodyConsultation: {
        heightCm: advisorState.heightCm,
        weightKg: advisorState.weightKg,
        bustCm: advisorState.bustCm,
        waistCm: advisorState.waistCm,
        hipsCm: advisorState.hipsCm,
        bodyShape: advisorState.bodyShape,
        recommendedSize: sizeAnalysis.recommendedSize,
        stylePreferences: [advisorState.stylePreference],
        styleNotes: `Tư vấn dáng ${sizeAnalysis.shapeName}. Đề xuất size ${sizeAnalysis.recommendedSize}.`
      },
      customerFeedback: 'Khách hàng hài lòng với gợi ý kiểu dáng và sản phẩm đầm phù hợp',
      actionTaken: `Đã đề xuất Size ${sizeAnalysis.recommendedSize} và gợi ý các mẫu đầm tôn dáng`,
      status: 'CONSULTING',
      priority: 'HOT',
      satisfactionRating: 5
    };

    onSaveCareLog(newLog);
    alert('Đã lưu kết quả tư vấn vào Nhật ký Chăm Sóc Khách Hàng!');
    setActiveTab('LOGS');
  };

  // Submit new Care Log Form
  const handleSubmitLogForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === logFormData.partnerId);

    const newLog: CustomerCareLog = {
      id: `care_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partnerId: logFormData.partnerId,
      partnerName: cust?.name || 'Khách Hàng',
      partnerPhone: cust?.phone || '',
      staffId: currentUser?.id || 'emp_default',
      staffName: currentUser?.name || 'Nhân Viên Bán Hàng',
      channel: logFormData.channel,
      purpose: logFormData.purpose,
      actionTaken: logFormData.actionTaken,
      customerFeedback: logFormData.customerFeedback,
      nextAppointmentDate: logFormData.nextAppointmentDate || undefined,
      priority: logFormData.priority,
      status: logFormData.status,
      satisfactionRating: logFormData.satisfactionRating
    };

    onSaveCareLog(newLog);
    setShowLogModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-[#a93054] via-[#fb6f92] to-rose-900 p-6 rounded-3xl text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-rose-100 flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-200" />
              Chuyên Viên Tư Vấn & Chăm Sóc Khách Hàng VIP
            </span>
            <span className="px-2.5 py-0.5 bg-white/30 text-white rounded-full text-[11px] font-bold">
              Fashion CRM & Stylist
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>CSKH & Tư Vấn Bán Hàng Thời Trang</span>
          </h1>
          <p className="text-xs md:text-sm text-rose-100/90 max-w-2xl">
            Công cụ hỗ trợ nhân viên bán hàng: Tư vấn chọn size theo vóc dáng, nhật ký chăm sóc khách quen, lịch nhắc sinh nhật và thư viện kịch bản bán hàng chuẩn showroom.
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex flex-wrap items-center bg-white/15 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ADVISOR')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ADVISOR' ? 'bg-white text-[#a93054] shadow-xs' : 'text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. Tư Vấn Size & Vóc Dáng</span>
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LOGS' ? 'bg-white text-[#a93054] shadow-xs' : 'text-white hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>2. Nhật Ký CSKH ({careLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('REMINDERS')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'REMINDERS' ? 'bg-white text-[#a93054] shadow-xs' : 'text-white hover:bg-white/10'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>3. Lịch Nhắc VIP ({careReminders.filter(r => r.status === 'PENDING').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('SCRIPTS')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SCRIPTS' ? 'bg-white text-[#a93054] shadow-xs' : 'text-white hover:bg-white/10'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>4. Kịch Bản Mẫu ({scripts.length})</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: TƯ VẤN SIZE & VÓC DÁNG THÔNG MINH ================= */}
      {activeTab === 'ADVISOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Input Specs & Shape */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-rose-100 shadow-2xs space-y-5">
            <div className="border-b border-rose-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#a93054]" />
                <span>Nhập Thông Số Đo & Chọn Dáng Người</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhân viên bán hàng điền số đo khách hàng để nhận phân tích tức thì
              </p>
            </div>

            {/* Chọn khách hàng */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Chọn Khách Hàng (Hoặc Nhập Khách Mới)
              </label>
              <select
                value={advisorState.selectedPartnerId}
                onChange={(e) => setAdvisorState(prev => ({ ...prev, selectedPartnerId: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    👤 {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Dáng người */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Dáng Người Của Khách
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'HOURGLASS' as BodyShape, name: 'Đồng Hồ Cát', icon: '⏳' },
                  { id: 'PEAR' as BodyShape, name: 'Dáng Quả Lê', icon: '🍐' },
                  { id: 'RECTANGLE' as BodyShape, name: 'Thước Kẻ / Suông', icon: '📏' },
                  { id: 'INVERTED_TRIANGLE' as BodyShape, name: 'Tam Giác Ngược', icon: '🔺' },
                  { id: 'APPLE' as BodyShape, name: 'Dáng Quả Táo', icon: '🍎' },
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setAdvisorState(prev => ({ ...prev, bodyShape: s.id }))}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      advisorState.bodyShape === s.id
                        ? 'bg-rose-50 border-[#a93054] text-[#a93054] shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-pink-50/40'
                    }`}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-[11px] text-center leading-tight">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Chiều Cao (cm)
                </label>
                <input
                  type="number"
                  min="130"
                  max="195"
                  value={advisorState.heightCm}
                  onChange={(e) => setAdvisorState(prev => ({ ...prev, heightCm: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cân Nặng (kg)
                </label>
                <input
                  type="number"
                  min="35"
                  max="120"
                  value={advisorState.weightKg}
                  onChange={(e) => setAdvisorState(prev => ({ ...prev, weightKg: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* 3 Measurements */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600">
                Số Đo 3 Vòng (Vòng 1 - Vòng 2 - Vòng 3 cm)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="number"
                    placeholder="Vòng 1"
                    value={advisorState.bustCm}
                    onChange={(e) => setAdvisorState(prev => ({ ...prev, bustCm: Number(e.target.value) }))}
                    className="w-full px-2.5 py-2 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                  <span className="block text-[10px] text-center text-slate-400 mt-0.5">V1 (Ngực)</span>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Vòng 2"
                    value={advisorState.waistCm}
                    onChange={(e) => setAdvisorState(prev => ({ ...prev, waistCm: Number(e.target.value) }))}
                    className="w-full px-2.5 py-2 text-center bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900"
                  />
                  <span className="block text-[10px] text-center text-slate-400 mt-0.5">V2 (Eo)</span>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Vòng 3"
                    value={advisorState.hipsCm}
                    onChange={(e) => setAdvisorState(prev => ({ ...prev, hipsCm: Number(e.target.value) }))}
                    className="w-full px-2.5 py-2 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                  <span className="block text-[10px] text-center text-slate-400 mt-0.5">V3 (Mông)</span>
                </div>
              </div>
            </div>

            {/* Dịp mặc */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nhu Cầu / Dịp Mặc
                </label>
                <select
                  value={advisorState.targetOccasion}
                  onChange={(e) => setAdvisorState(prev => ({ ...prev, targetOccasion: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <option value="Dự tiệc cưới / Gala">Dự Tiệc Cưới / Gala</option>
                  <option value="Công sở thanh lịch">Công Sở Thanh Lịch</option>
                  <option value="Dạo phố / Hẹn hò">Dạo Phố / Hẹn Hò</option>
                  <option value="Chụp ảnh Lookbook">Chụp Ảnh Lookbook</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Phong Cách Ưa Thích
                </label>
                <select
                  value={advisorState.stylePreference}
                  onChange={(e) => setAdvisorState(prev => ({ ...prev, stylePreference: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <option value="Dạ hội sang trọng">Dạ Hội Sang Trọng</option>
                  <option value="Tối giản Minimalism">Tối Giản Minimalism</option>
                  <option value="Tiểu thư điệu đà">Tiểu Thư Điệu Đà</option>
                  <option value="Quyến rũ chiết eo">Quyến Rũ Chiết Eo</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveAdvisorAsLog}
              className="w-full py-2.5 bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white rounded-xl text-xs font-bold shadow-xs hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Lưu Kết Quả Vào Hồ Sơ Chăm Sóc Khách Hàng</span>
            </button>
          </div>

          {/* Right Column: Stylist Recommendations & Suggested In-Stock Products */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Analysis Card */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50/50 p-6 rounded-3xl border border-rose-200/80 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#a93054] bg-rose-100/80 px-2.5 py-1 rounded-full">
                    KẾT QUẢ PHÂN TÍCH VÓC DÁNG
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {sizeAnalysis.shapeName}
                  </h3>
                </div>

                {/* Big Size Badge */}
                <div className="text-center p-3 bg-white rounded-2xl shadow-xs border border-rose-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Size Chuẩn</span>
                  <span className="text-2xl font-black text-[#a93054]">
                    Size {sizeAnalysis.recommendedSize}
                  </span>
                </div>
              </div>

              {/* Quick Specs Pill */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="bg-white px-3 py-1.5 rounded-xl border border-rose-100 text-slate-700">
                  Chiều cao: <strong>{advisorState.heightCm} cm</strong>
                </span>
                <span className="bg-white px-3 py-1.5 rounded-xl border border-rose-100 text-slate-700">
                  Cân nặng: <strong>{advisorState.weightKg} kg</strong> (BMI: {sizeAnalysis.bmi} - {sizeAnalysis.bmiCategory})
                </span>
                <span className="bg-white px-3 py-1.5 rounded-xl border border-rose-100 text-slate-700">
                  3 Vòng: <strong>{advisorState.bustCm} - {advisorState.waistCm} - {advisorState.hipsCm} cm</strong>
                </span>
              </div>

              {/* Do's and Don'ts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Nên Mặc (Tôn Dáng & Che Khuyết Điểm)</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {sizeAnalysis.dos.map((d, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>Nên Tránh / Hạn Chế</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {sizeAnalysis.donts.map((d, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Matching Products In Stock */}
            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-[#fb6f92]" />
                    <span>Mẫu Đầm / Áo Sẵn Có Phù Hợp (Size {sizeAnalysis.recommendedSize})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nhân viên có thể gợi ý khách thử ngay tại Showroom hoặc tạo đơn bán hàng POS
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('pos')}
                  className="text-xs font-bold text-[#a93054] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Mở Thu Ngân POS</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {matchingProducts.length === 0 ? (
                <div className="p-8 text-center bg-rose-50/40 rounded-2xl border border-rose-100">
                  <p className="text-xs font-semibold text-slate-600">
                    Hiện mẫu Size {sizeAnalysis.recommendedSize} đang tạm hết tại quầy.
                  </p>
                  <button
                    onClick={() => onNavigateTab('requisitions')}
                    className="mt-2 text-xs font-bold text-[#a93054] underline cursor-pointer"
                  >
                    + Lập phiếu yêu cầu nhập hàng / đặt xưởng may cho khách ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchingProducts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-rose-50/30 hover:bg-rose-50/70 border border-rose-100 rounded-2xl transition flex items-center gap-3"
                    >
                      <div className="w-14 h-14 bg-white rounded-xl border border-rose-200 shrink-0 overflow-hidden flex items-center justify-center">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Shirt className="w-6 h-6 text-rose-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{p.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono font-extrabold text-[#a93054]">
                            {p.sellingPrice.toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            Tồn: {p.openingQuantity} {p.unit}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Size: <strong>{p.size || 'FreeSize'}</strong> • Màu: {p.color || 'Tiêu chuẩn'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ================= TAB 2: NHẬT KÝ CHĂM SÓC KHÁCH HÀNG ================= */}
      {activeTab === 'LOGS' && (
        <div className="space-y-5">
          {/* Action & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm khách hàng, số điện thoại, nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a93054]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <option value="ALL">Mọi Kênh Tư Vấn</option>
                <option value="SHOWROOM">🏢 Trực tiếp Showroom</option>
                <option value="ZALO">💬 Zalo OA</option>
                <option value="PHONE">📞 Điện thoại Hotline</option>
                <option value="FACEBOOK">🌐 Facebook Lookbook</option>
              </select>

              <button
                onClick={() => setShowLogModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Nhật Ký Tư Vấn Mới</span>
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {careLogs
              .filter(l => {
                const matchSearch = 
                  l.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (l.partnerPhone && l.partnerPhone.includes(searchTerm)) ||
                  l.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  l.purpose.toLowerCase().includes(searchTerm.toLowerCase());
                const matchChannel = channelFilter === 'ALL' || l.channel === channelFilter;
                return matchSearch && matchChannel;
              })
              .map(log => (
                <div
                  key={log.id}
                  className="bg-white p-5 rounded-2xl border border-rose-100 shadow-2xs hover:shadow-xs transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{log.partnerName}</h4>
                        {log.priority === 'HOT' && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full">
                            🔥 KHÁCH HOT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {log.partnerPhone || 'Chưa lưu SĐT'} • Ngày: {log.date}
                      </p>
                    </div>

                    <span className="text-xs font-bold bg-rose-50 text-[#a93054] px-2.5 py-1 rounded-xl border border-rose-100">
                      {log.channel === 'SHOWROOM' ? '🏢 Tại Showroom' : log.channel === 'ZALO' ? '💬 Qua Zalo' : '📞 Điện thoại'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 bg-rose-50/30 p-3 rounded-xl border border-rose-100/60">
                    <p className="text-slate-800">
                      <strong>Mục đích:</strong> {log.purpose}
                    </p>
                    <p className="text-slate-700">
                      <strong>Hành động đã làm:</strong> {log.actionTaken}
                    </p>
                    {log.customerFeedback && (
                      <p className="text-emerald-800 italic">
                        <strong>Phản hồi của khách:</strong> "{log.customerFeedback}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Tư vấn bởi: <strong className="text-slate-800">{log.staffName}</strong></span>
                    
                    <button
                      onClick={() => onDeleteCareLog(log.id)}
                      className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="Xóa nhật ký"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: LỊCH NHẮC CHĂM SÓC KHÁCH VIP ================= */}
      {activeTab === 'REMINDERS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {careReminders.map(rem => {
              const isDone = rem.status === 'DONE';
              return (
                <div
                  key={rem.id}
                  className={`p-5 rounded-2xl border-2 transition space-y-3 ${
                    isDone
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : rem.type === 'BIRTHDAY'
                      ? 'bg-gradient-to-br from-pink-50 to-rose-50/50 border-pink-300 shadow-2xs'
                      : 'bg-white border-rose-100 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {rem.type === 'BIRTHDAY' ? '🎂' : rem.type === 'POST_PURCHASE_FOLLOWUP' ? '👗' : '⭐'}
                      </span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#a93054]">
                          {rem.type === 'BIRTHDAY' ? 'SINH NHẬT VIP' : rem.type === 'POST_PURCHASE_FOLLOWUP' ? 'CHĂM SÓC SAU MUA' : 'KHÁCH QUEN CẦN GỌI'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{rem.title}</h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">{rem.description}</p>

                  <div className="text-xs font-semibold text-slate-700 bg-white/80 p-2.5 rounded-xl border border-rose-100 flex items-center justify-between">
                    <span>Hạn xử lý: <strong className="text-[#a93054]">{rem.dueDate}</strong></span>
                    {rem.voucherCode && (
                      <span className="font-mono bg-pink-100 text-pink-800 px-2 py-0.5 rounded text-[11px] font-bold">
                        Voucher: {rem.voucherCode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => onToggleReminderStatus(rem.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isDone
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isDone ? 'Đã hoàn thành' : 'Đánh dấu đã chăm sóc'}</span>
                    </button>

                    <button
                      onClick={() => onDeleteReminder(rem.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 4: THƯ VIỆN KỊCH BẢN MẪU BÁN HÀNG ================= */}
      {activeTab === 'SCRIPTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {scripts.map(script => (
            <div
              key={script.id}
              className="bg-white p-6 rounded-3xl border border-rose-100 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">{script.title}</h3>
                  <span className="text-[11px] font-semibold bg-rose-50 text-[#a93054] px-2 py-0.5 rounded-lg">
                    {script.channel}
                  </span>
                </div>

                <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed">
                  {script.content}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 italic">
                  Tự động điền tên khách: <strong>{selectedAdvisorCustomer?.name || 'Khách VIP'}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => handleCopyScript(script)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                    copiedScriptId === script.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white hover:opacity-90'
                  }`}
                >
                  {copiedScriptId === script.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã Sao Chép Kịch Bản!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao Chép & Gửi Zalo/SMS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL: THÊM NHẬT KÝ CSKH MỚI ================= */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#fb6f92]" />
                <span>Ghi Nhật Ký Chăm Sóc & Tư Vấn</span>
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1.5 hover:bg-rose-50 text-slate-400 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLogForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn Khách Hàng
                </label>
                <select
                  value={logFormData.partnerId}
                  onChange={(e) => setLogFormData(prev => ({ ...prev, partnerId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || 'Chưa có SĐT'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kênh Tương Tác
                  </label>
                  <select
                    value={logFormData.channel}
                    onChange={(e) => setLogFormData(prev => ({ ...prev, channel: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer"
                  >
                    <option value="SHOWROOM">Trực Tiếp Showroom</option>
                    <option value="ZALO">Zalo OA</option>
                    <option value="PHONE">Hotline / Điện Thoại</option>
                    <option value="FACEBOOK">Facebook Fanpage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mức Độ Khách
                  </label>
                  <select
                    value={logFormData.priority}
                    onChange={(e) => setLogFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-700 cursor-pointer"
                  >
                    <option value="HOT">🔥 Khách Rất Tiềm Năng (HOT)</option>
                    <option value="WARM">⭐ Khách Thân Thiết (WARM)</option>
                    <option value="COLD">❄️ Khách Mới Tìm Hiểu (COLD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mục Đích Tư Vấn
                </label>
                <input
                  type="text"
                  required
                  value={logFormData.purpose}
                  onChange={(e) => setLogFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="VD: Tư vấn chọn đầm dạ hội đi tiệc cưới..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hành Động / Kết Quả Tư Vấn
                </label>
                <textarea
                  rows={2}
                  value={logFormData.actionTaken}
                  onChange={(e) => setLogFormData(prev => ({ ...prev, actionTaken: e.target.value }))}
                  placeholder="VD: Đã thử mẫu đầm đỏ Ruby size M, hẹn lấy hàng vào thứ Bảy..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Lưu Nhật Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
