#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script to generate a comprehensive, professional Microsoft Word (.docx) document
containing the complete Voiceover Script and Step-by-Step Recording Guide for Demoing
the D&D Fashion ERP project.
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_demo_script_document(output_path):
    doc = docx.Document()

    # Configure Margins (Normal 1 inch = 72pt, let's use 0.75 inch = 54pt for spacious layout)
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.75)
        s.bottom_margin = Inches(0.75)
        s.left_margin = Inches(0.75)
        s.right_margin = Inches(0.75)

    # Color Palette Definitions
    HEX_PRIMARY = "1E293B"       # Slate 900
    HEX_ROSE = "A93054"          # D&D Fashion Brand Rose
    HEX_ROSE_BG = "FFF1F4"       # Soft pink background
    HEX_SLATE_HEADER = "2A3342"  # Table header
    HEX_ROW_ALT = "F8FAFC"       # Alternating row fill
    HEX_BORDER = "CBD5E1"        # Slate 300 border
    HEX_SUCCESS = "065F46"       # Dark Emerald
    HEX_SUCCESS_BG = "ECFDF5"    # Soft green background
    HEX_WARNING_BG = "FFFBEB"    # Soft amber background
    HEX_WARNING = "92400E"       # Dark amber

    COLOR_PRIMARY = RGBColor(30, 41, 59)
    COLOR_ROSE = RGBColor(169, 48, 84)
    COLOR_MUTED = RGBColor(100, 116, 139)
    COLOR_WHITE = RGBColor(255, 255, 255)
    COLOR_DARK = RGBColor(15, 23, 42)

    # Configure Normal Style
    style_normal = doc.styles['Normal']
    font_normal = style_normal.font
    font_normal.name = 'Arial'
    font_normal.size = Pt(10.5)
    font_normal.color.rgb = COLOR_DARK
    style_normal.paragraph_format.line_spacing = 1.2
    style_normal.paragraph_format.space_after = Pt(4)

    # Helper: Set Cell Shading
    def set_cell_shading(cell, hex_color):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    # Helper: Set Cell Borders
    def set_cell_margins_and_border(cell, top=120, bottom=120, left=150, right=150, border_color="CBD5E1"):
        tcPr = cell._tc.get_or_add_tcPr()
        # Margins
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)
        # Borders
        tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/><w:left w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/><w:right w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/></w:tcBorders>')
        tcPr.append(tcBorders)

    # Helper: Add Heading 1
    def add_custom_h1(text, subtitle=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(15)
        run.font.color.rgb = COLOR_ROSE
        if subtitle:
            p_sub = doc.add_paragraph()
            p_sub.paragraph_format.space_after = Pt(6)
            p_sub.paragraph_format.keep_with_next = True
            r_sub = p_sub.add_run(subtitle)
            r_sub.italic = True
            r_sub.font.size = Pt(9.5)
            r_sub.font.color.rgb = COLOR_MUTED

    # Helper: Add Heading 2
    def add_custom_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(12)
        run.font.color.rgb = COLOR_PRIMARY

    # Helper: Add Callout Box
    def add_callout_box(title, text, kind="ROSE"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        tbl.columns[0].width = Inches(7.0)
        cell = tbl.cell(0, 0)
        
        bg_color = HEX_ROSE_BG if kind == "ROSE" else (HEX_SUCCESS_BG if kind == "GREEN" else HEX_WARNING_BG)
        border_color = HEX_ROSE if kind == "ROSE" else ("10B981" if kind == "GREEN" else "F59E0B")
        text_color = COLOR_ROSE if kind == "ROSE" else (RGBColor(6, 95, 70) if kind == "GREEN" else RGBColor(146, 64, 14))

        set_cell_shading(cell, bg_color)
        set_cell_margins_and_border(cell, top=140, bottom=140, left=180, right=180, border_color=border_color)

        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        r_title = p.add_run(f"📌 {title}: ")
        r_title.bold = True
        r_title.font.size = Pt(10.5)
        r_title.font.color.rgb = text_color

        r_text = p.add_run(text)
        r_text.font.size = Pt(10.5)
        r_text.font.color.rgb = COLOR_DARK

        doc.add_paragraph().paragraph_format.space_after = Pt(3)

    # -------------------------------------------------------------
    # 1. DOCUMENT HEADER / COVER BANNER
    # -------------------------------------------------------------
    tbl_banner = doc.add_table(rows=1, cols=1)
    tbl_banner.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_banner.autofit = False
    tbl_banner.columns[0].width = Inches(7.0)
    c_banner = tbl_banner.cell(0, 0)
    set_cell_shading(c_banner, HEX_PRIMARY)
    set_cell_margins_and_border(c_banner, top=200, bottom=200, left=200, right=200, border_color=HEX_PRIMARY)

    p_org = c_banner.paragraphs[0]
    p_org.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_org = p_org.add_run("D&D FASHION ERP • DỰ ÁN HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP THỜI TRANG")
    r_org.font.size = Pt(9.5)
    r_org.font.color.rgb = RGBColor(251, 111, 146)
    r_org.bold = True

    p_title = c_banner.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("KỊCH BẢN THUYẾT MINH & HƯỚNG DẪN THAO TÁC\nQUAY VIDEO DEMO TOÀN BỘ CHỨC NĂNG")
    r_title.font.size = Pt(16)
    r_title.bold = True
    r_title.font.color.rgb = COLOR_WHITE

    p_sub = c_banner.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Tài liệu chuẩn hóa phục vụ thuyết trình, báo cáo nghiệm thu đồ án & quay video giới thiệu giải pháp")
    r_sub.font.size = Pt(10)
    r_sub.font.color.rgb = RGBColor(226, 232, 240)
    r_sub.italic = True

    p_meta = c_banner.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_before = Pt(6)
    r_meta = p_meta.add_run("⏱ Thời lượng dự kiến: 12 – 15 Phút  |  🖥 Môi trường: Web App Local / Cloud  |  🎯 Trạng thái: 100% Hoàn thiện")
    r_meta.font.size = Pt(9)
    r_meta.font.color.rgb = RGBColor(203, 213, 225)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # 2. HƯỚNG DẪN CHUẨN BỊ TRƯỚC KHI QUAY
    # -------------------------------------------------------------
    add_custom_h1("I. HƯỚNG DẪN CHUẨN BỊ TRƯỚC KHI BẤM MÁY QUAY", "Đảm bảo môi trường hoàn hảo để có một video mượt mà, chuyên nghiệp và đạt điểm tối đa")

    # Bảng môi trường và phím tắt
    tbl_prep = doc.add_table(rows=6, cols=2)
    tbl_prep.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_prep.autofit = False
    tbl_prep.columns[0].width = Inches(2.2)
    tbl_prep.columns[1].width = Inches(4.8)

    prep_data = [
        ("Môi trường khởi chạy", "Mở Terminal chạy lệnh `npm run dev`. Đảm bảo server backend và frontend chạy ổn định tại cổng 3000 (http://localhost:3000)."),
        ("Dữ liệu khởi tạo chuẩn", "Trước khi quay, chạy lệnh `npm run db:seed` để khôi phục cơ sở dữ liệu mẫu chuẩn của D&D Fashion với đầy đủ 20 mẫu thời trang, khách VIP, xưởng may và tồn kho."),
        ("Độ phân giải & Zoom", "Màn hình 1080p (1920x1080) hoặc 2K. Mở trình duyệt Chrome/Edge, phóng to cửa sổ toàn màn hình (F11 hoặc tối đa cửa sổ), Zoom trình duyệt 100% (hoặc 90% nếu cần không gian rộng)."),
        ("Thiết lập âm thanh", "Micro thu âm rõ ràng, bật chế độ lọc ồn (Noise Suppression). Đọc với tốc độ vừa phải, ngữ điệu tự tin, dứt khoát, nhấn nhá ở các tính năng nổi bật."),
        ("Phím tắt vàng khi thao tác", "• F1: Bật Trợ lý Kế toán AI (Gemini)\n• F2: Mở nhanh Trạm POS Quầy\n• F3: Mở Đề xuất Nhập/Xuất kho\n• F4: Khóa màn hình nhanh (Security Lock)"),
        ("Tài khoản demo sẵn sàng", "Chuẩn bị sẵn danh sách username/password để đăng nhập mượt mà không bị ngập ngừng.")
    ]

    for idx, (label, desc) in enumerate(prep_data):
        row = tbl_prep.rows[idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.8)
        
        bg = HEX_SLATE_HEADER if idx == 0 else (HEX_ROW_ALT if idx % 2 == 1 else "FFFFFF")
        # Header or normal
        set_cell_shading(c0, HEX_ROW_ALT)
        set_cell_shading(c1, "FFFFFF" if idx % 2 == 1 else HEX_ROW_ALT)
        set_cell_margins_and_border(c0)
        set_cell_margins_and_border(c1)

        p0 = c0.paragraphs[0]
        r0 = p0.add_run(label)
        r0.bold = True
        r0.font.size = Pt(10)
        r0.font.color.rgb = COLOR_PRIMARY

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(desc)
        r1.font.size = Pt(10)
        r1.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Bảng tài khoản RBAC
    add_custom_h2("Danh sách 5 Tài Khoản Demo Phân Quyền Nghiệp Vụ (RBAC)")
    tbl_rbac = doc.add_table(rows=7, cols=4)
    tbl_rbac.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_rbac.autofit = False
    tbl_rbac.columns[0].width = Inches(2.0)
    tbl_rbac.columns[1].width = Inches(1.3)
    tbl_rbac.columns[2].width = Inches(1.0)
    tbl_rbac.columns[3].width = Inches(2.7)

    rbac_headers = ["Họ Tên & Vai Trò Nghiệp Vụ", "Username", "Mật Khẩu", "Quyền Hạn & Phân Hệ Truy Cập"]
    for c_idx, h_text in enumerate(rbac_headers):
        cell = tbl_rbac.rows[0].cells[c_idx]
        set_cell_shading(cell, HEX_PRIMARY)
        set_cell_margins_and_border(cell, border_color=HEX_PRIMARY)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = COLOR_WHITE

    rbac_rows = [
        ("Lê Thị Duyên (Giám Đốc / Quản Lý)", "quanly_duyen", "123456", "Toàn quyền: Dashboard, Master Data, Bán hàng, Mua hàng, Kho, Kế toán, Duyệt đề xuất."),
        ("Đàm Thị Thùy Dung (Kế Toán Trưởng)", "ketoan_dung", "123456", "Kế toán tài chính, Sổ quỹ, Quản lý công nợ, Báo cáo P&L, Hóa đơn bán/mua, Kho."),
        ("Đặng Trà My (Thu Ngân / Bán Hàng)", "banhang_my", "123456", "Trạm POS Quầy, Hóa đơn bán, Quản lý khách hàng, Tra cứu mẫu mã & tồn kho."),
        ("Trần Thanh Phong (Nhân Viên Mua Hàng)", "muahang_phong", "123456", "Nhập hàng xưởng may, Nhà cung cấp vải/phụ liệu, Lập đề xuất đặt may mẫu mới."),
        ("Chu Ngọc Hải (Thủ Kho / Kho Vận)", "thukho_hai", "123456", "Quản trị tồn kho, Thẻ kho chi tiết, Phiếu điều chỉnh kho, Kiểm kê kho, Hàng lỗi."),
        ("Nguyễn Hải Đăng (Chuyên Viên VIP)", "tuvan_dang", "123456", "Bán lẻ POS, CSKH VIP, Tra cứu tồn kho, Lập đề xuất nhập bổ sung mẫu mã.")
    ]

    for r_idx, row_data in enumerate(rbac_rows):
        row = tbl_rbac.rows[r_idx + 1]
        bg = HEX_ROW_ALT if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = tbl_rbac.columns[c_idx].width
            set_cell_shading(cell, bg)
            set_cell_margins_and_border(cell)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(9.5)
            if c_idx == 1 or c_idx == 2:
                r.bold = True
                r.font.color.rgb = COLOR_ROSE

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_callout_box("LƯU Ý ĐẶC BIỆT KHI DEMO ĐỔI MẬT KHẨU (PHASE 8.1)", 
                    "Tính năng Đổi mật khẩu nằm ở góc trên bên phải Header (Bấm vào Tên User → Chọn 'Đổi Mật Khẩu'). Mật khẩu được mã hóa bcrypt chuẩn, tuyệt đối an toàn. Khi demo đổi mật khẩu xong, hãy đăng nhập lại bằng mật khẩu mới để tạo ấn tượng mạnh mẽ với người xem!", 
                    "ROSE")

    # -------------------------------------------------------------
    # 3. BẢNG TỔNG QUAN TIMELINE CÁC PHÂN CẢNH
    # -------------------------------------------------------------
    add_custom_h1("II. TỔNG HỢP TIMELINE PHÂN CẢNH VIDEO DEMO (15 PHÚT)", "Cấu trúc video mạch lạc, logic từ tổng quan đến chi tiết các nghiệp vụ chuỗi thời trang")

    tbl_timeline = doc.add_table(rows=12, cols=4)
    tbl_timeline.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_timeline.autofit = False
    tbl_timeline.columns[0].width = Inches(1.1)
    tbl_timeline.columns[1].width = Inches(1.1)
    tbl_timeline.columns[2].width = Inches(2.2)
    tbl_timeline.columns[3].width = Inches(2.6)

    tl_headers = ["Phân Cảnh", "Thời Lượng", "Nội Dung Nghiệp Vụ Chính", "Điểm Nhấn Kỹ Thuật & Ấn Tượng"]
    for c_idx, h_text in enumerate(tl_headers):
        cell = tbl_timeline.rows[0].cells[c_idx]
        set_cell_shading(cell, HEX_PRIMARY)
        set_cell_margins_and_border(cell, border_color=HEX_PRIMARY)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = COLOR_WHITE

    timeline_data = [
        ("Phần 1", "00:00 - 01:15", "Mở đầu, giới thiệu tổng quan hệ sinh thái D&D Fashion ERP", "Kiến trúc React 19 + Express + SQLite trigger + GenAI"),
        ("Phần 2", "01:15 - 02:30", "Xác thực JWT, Phân quyền RBAC & Đổi mật khẩu chuẩn bcrypt", "Bảo mật tài khoản, không lưu plaintext, mã hóa bcrypt an toàn"),
        ("Phần 3", "02:30 - 04:00", "Dashboard Điều Hành Doanh Nghiệp 6 chỉ số trọng yếu", "100% dữ liệu sống từ SQLite, biểu đồ 6 tháng, cảnh báo nợ/hết hàng"),
        ("Phần 4", "04:00 - 05:45", "Quản lý Master Data (Sản phẩm, Danh mục, Khách VIP, NCC, Nhân sự)", "Mẫu mã thời trang đa size/màu, tính toàn vẹn danh mục, liên kết tài khoản"),
        ("Phần 5", "05:45 - 08:00", "Trạm POS Quầy & Nghiệp Vụ Bán Hàng – Chặn âm kho tuyệt đối", "Giao diện POS trực quan F2, tạo nhanh khách VIP, in bill nhiệt, Atomic Rollback"),
        ("Phần 6", "08:00 - 09:30", "Mua hàng & Nhập kho Xưởng May – Tự động tăng kho qua Trigger", "Lập đơn nhập xưởng, trigger SQLite cộng kho tức thì, công nợ 331, xuất Excel"),
        ("Phần 7", "09:30 - 10:45", "Đề xuất Nhập/Xuất kho & Quy trình Duyệt đa cấp (F3)", "Quy trình đề xuất đặt may/bổ sung, cấp quản lý duyệt, 1-click chuyển đơn mua"),
        ("Phần 8", "10:45 - 12:15", "Quản lý Tồn Kho, Thẻ kho 01/02-VT, Điều chỉnh kho & Kiểm kê", "Thẻ kho truy vết chi tiết từng giây, phiếu điều chỉnh an toàn, xử lý hàng lỗi"),
        ("Phần 9", "12:15 - 14:00", "Kế toán Tài chính, Sổ quỹ thu chi & Quản lý Công Nợ 131/331", "Sổ quỹ 1111/1121, phiếu thu chi tự động định khoản, thu nợ/trả nợ 1-click, Excel"),
        ("Phần 10", "14:00 - 15:30", "Báo cáo Tài chính Đa chiều & Trợ lý Kế toán Thông minh Gemini AI", "P&L Lãi Lỗ, Top bán chạy, chuẩn VAS TT133/200, Trợ lý Gemini AI (F1)"),
        ("Phần 11", "15:30 - 16:00", "Khóa màn hình bảo mật F4 & Tổng kết bài thuyết trình", "Tổng kết ưu thế vượt trội, khẳng định giá trị ứng dụng thực tiễn")
    ]

    for r_idx, row_data in enumerate(timeline_data):
        row = tbl_timeline.rows[r_idx + 1]
        bg = HEX_ROW_ALT if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = tbl_timeline.columns[c_idx].width
            set_cell_shading(cell, bg)
            set_cell_margins_and_border(cell)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(9.5)
            if c_idx == 0:
                r.bold = True
                r.font.color.rgb = COLOR_ROSE
            elif c_idx == 1:
                r.font.color.rgb = RGBColor(79, 70, 229)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # -------------------------------------------------------------
    # 4. KỊCH BẢN CHI TIẾT TỪNG PHÂN CẢNH (KÈM LỜI THOẠI ĐỌC TỪNG CÂU)
    # -------------------------------------------------------------
    add_custom_h1("III. KỊCH BẢN CHI TIẾT TỪNG PHÂN CẢNH (LỜI THOẠI & THAO TÁC)", "Kịch bản chuẩn dạng 3 cột: Màn hình - Thao tác người quay - Lời thoại MC đọc")

    # Helper function to generate a 3-column scene table
    def add_scene_section(scene_num, scene_title, time_range, scene_goal, scene_steps, pro_tips=None):
        add_custom_h2(f"PHÂN CẢNH {scene_num}: {scene_title.upper()} ({time_range})")
        
        # Scene Goal Callout
        p_goal = doc.add_paragraph()
        p_goal.paragraph_format.space_before = Pt(2)
        p_goal.paragraph_format.space_after = Pt(4)
        r_gtitle = p_goal.add_run("🎯 Mục tiêu phân cảnh: ")
        r_gtitle.bold = True
        r_gtitle.font.color.rgb = COLOR_ROSE
        p_goal.add_run(scene_goal)

        # Table for Scene
        tbl = doc.add_table(rows=len(scene_steps) + 1, cols=3)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        tbl.columns[0].width = Inches(1.3)
        tbl.columns[1].width = Inches(2.2)
        tbl.columns[2].width = Inches(3.5)

        headers = ["Thời Gian & Màn Hình", "Thao Tác Thực Tế Của Người Quay", "Lời Thoại Đọc (Voiceover Script)"]
        for c_idx, h_text in enumerate(headers):
            cell = tbl.rows[0].cells[c_idx]
            set_cell_shading(cell, HEX_SLATE_HEADER)
            set_cell_margins_and_border(cell, border_color=HEX_SLATE_HEADER)
            p = cell.paragraphs[0]
            r = p.add_run(h_text)
            r.bold = True
            r.font.size = Pt(9.5)
            r.font.color.rgb = COLOR_WHITE

        for r_idx, (t_screen, action, voiceover) in enumerate(scene_steps):
            row = tbl.rows[r_idx + 1]
            bg = HEX_ROW_ALT if r_idx % 2 == 1 else "FFFFFF"
            
            # Col 0: Time & Screen
            c0 = row.cells[0]
            c0.width = tbl.columns[0].width
            set_cell_shading(c0, HEX_ROW_ALT)
            set_cell_margins_and_border(c0)
            p0 = c0.paragraphs[0]
            r0 = p0.add_run(t_screen)
            r0.bold = True
            r0.font.size = Pt(9)
            r0.font.color.rgb = COLOR_PRIMARY

            # Col 1: Actions
            c1 = row.cells[1]
            c1.width = tbl.columns[1].width
            set_cell_shading(c1, bg)
            set_cell_margins_and_border(c1)
            p1 = c1.paragraphs[0]
            r1 = p1.add_run(action)
            r1.font.size = Pt(9.5)
            r1.font.color.rgb = COLOR_DARK

            # Col 2: Voiceover
            c2 = row.cells[2]
            c2.width = tbl.columns[2].width
            set_cell_shading(c2, bg)
            set_cell_margins_and_border(c2)
            p2 = c2.paragraphs[0]
            r2 = p2.add_run(voiceover)
            r2.font.size = Pt(10)
            r2.font.color.rgb = COLOR_DARK
            # Let's adjust spacing
            p2.paragraph_format.line_spacing = 1.25

        doc.add_paragraph().paragraph_format.space_after = Pt(3)

        if pro_tips:
            add_callout_box("MẸO QUAY (PRO TIP)", pro_tips, "GREEN")

    # -------------------------------------------------------------
    # SCENE 1: MỞ ĐẦU & GIỚI THIỆU TỔNG QUAN
    # -------------------------------------------------------------
    s1_steps = [
        ("00:00 - 00:25\nMàn hình Splash / Trang chủ", 
         "Mở trình duyệt tại màn hình Đăng nhập (hoặc Trang chủ có logo D&D Fashion). Di chuyển chuột nhẹ nhàng quanh logo và tiêu đề hệ thống.", 
         "Xin kính chào quý thầy cô, quý hội đồng thẩm định và các bạn! Hôm nay, em xin trân trọng giới thiệu dự án: D&D FASHION ERP – Hệ thống quản trị chuyên sâu và toàn diện dành cho chuỗi cửa hàng thời trang và xưởng may gia công."),
        ("00:25 - 00:55\nMàn hình Đăng nhập & Tech Stack", 
         "Lướt qua giao diện màn hình đăng nhập, trỏ chuột vào danh sách các vai trò được tích hợp sẵn. Nhấn mạnh tính chuyên nghiệp của giao diện.", 
         "Trong ngành thời trang bán lẻ, bài toán quản lý mẫu mã đa kích cỡ, nhiều màu sắc, cùng vòng quay hàng tồn kho nhanh và quy trình từ xưởng may đến quầy thu ngân luôn là thách thức lớn. Hệ thống D&D Fashion ERP ra đời để giải quyết trọn vẹn chuỗi giá trị này: từ nhập vải, đặt may xưởng, kiểm soát tồn kho theo thẻ kho, bán lẻ quầy POS, quản lý công nợ khách sỉ, đến sổ quỹ thu chi và báo cáo tài chính."),
        ("00:55 - 01:15\nTổng quan công nghệ", 
         "Mở tab trình bày ngắn về công nghệ hoặc để màn hình sẵn sàng đăng nhập.", 
         "Về mặt công nghệ, hệ thống được xây dựng trên nền tảng hiện đại: Frontend với React 19, TypeScript và Tailwind CSS tối ưu trải nghiệm người dùng; Backend Node.js Express kết hợp hệ quản trị cơ sở dữ liệu SQLite bền vững với cơ chế Trigger tự động và Atomic Rollback; bảo mật xác thực JWT, mã hóa mật khẩu bcrypt, cùng sự trợ lực của Trí tuệ nhân tạo Google Gemini AI.")
    ]
    add_scene_section(1, "Mở Đầu & Giới Thiệu Tổng Quan Hệ Sinh Thái D&D Fashion", "00:00 - 01:15", 
                      "Tạo ấn tượng mạnh ban đầu về sự bài bản, chuyên nghiệp của giải pháp ERP thời trang và cấu trúc công nghệ tiên tiến.",
                      s1_steps, 
                      "Nói giọng rõ ràng, truyền cảm. Không để con trỏ chuột đứng yên quá lâu hoặc rung lắc chuột liên tục.")

    # -------------------------------------------------------------
    # SCENE 2: XÁC THỰC JWT, PHÂN QUYỀN RBAC & ĐỔI MẬT KHẨU BCRYPT
    # -------------------------------------------------------------
    s2_steps = [
        ("01:15 - 01:45\nMàn hình Đăng nhập (Login)", 
         "Nhập username `quanly_duyen`, mật khẩu `123456`. Bấm nút 'Đăng Nhập Ngay'. Chỉ chuột vào thông báo Toast xanh báo đăng nhập thành công và chào mừng người dùng.", 
         "Đầu tiên, em xin demo Phân hệ Xác thực & Phân quyền RBAC. Hệ thống trang bị 5 vai trò nghiệp vụ độc lập: Giám đốc, Kế toán trưởng, Thu ngân bán hàng, Nhân viên mua hàng và Thủ kho. Giờ đây, em đăng nhập với tài khoản Quản lý cửa hàng: quanly_duyen, mật khẩu mặc định 123456. Ngay sau khi đăng nhập, hệ thống phát sinh JWT Token bảo mật và điều hướng trực tiếp đến giao diện Dashboard."),
        ("01:45 - 02:15\nHeader User Menu → Đổi Mật Khẩu", 
         "Di chuột lên góc trên bên phải Header, bấm vào Pill người dùng (Lê Thị Duyên) → Chọn mục 'Đổi Mật Khẩu'. Modal Đổi mật khẩu xuất hiện.", 
         "Tại bản nâng cấp Phase 8.1, hệ thống trang bị chức năng Đổi Mật Khẩu tự phục vụ ngay tại menu tài khoản cá nhân. Mật khẩu được mã hóa an toàn bằng thuật toán bcrypt, cam kết tuyệt đối không lưu trữ plaintext trong cơ sở dữ liệu."),
        ("02:15 - 02:30\nThao tác Modal Đổi Mật Khẩu", 
         "Nhập mật khẩu hiện tại `123456`, nhập mật khẩu mới `12345678` (hoặc test nhập < 6 ký tự để thấy validation chặn lại), xác nhận `12345678`. Bấm 'Cập Nhật Mật Khẩu'. Thông báo thành công xanh hiển thị.", 
         "Form kiểm tra nghiêm ngặt: mật khẩu mới tối thiểu 6 ký tự, không được trùng mật khẩu cũ và xác nhận phải khớp chính xác. Khi bấm Cập nhật, mật khẩu mới được băm và cập nhật an toàn vào SQLite ngay tức thì.")
    ]
    add_scene_section(2, "Xác Thực JWT, Phân Quyền RBAC & Đổi Mật Khẩu Bảo Mật", "01:15 - 02:30",
                      "Chứng minh tính an toàn bảo mật chuẩn doanh nghiệp, cơ chế xác thực JWT và tính năng đổi mật khẩu bcrypt mới nhất của Phase 8.1.",
                      s2_steps,
                      "Có thể nhập thử mật khẩu mới dưới 6 ký tự rồi bấm cập nhật để người xem thấy validation báo lỗi ngay lập tức, sau đó nhập đúng để ghi điểm kiểm thử hoàn hảo.")

    # -------------------------------------------------------------
    # SCENE 3: DASHBOARD ĐIỀU HÀNH DOANH NGHIỆP THỜI TRANG
    # -------------------------------------------------------------
    s3_steps = [
        ("02:30 - 03:00\nDashboard Tổng Quan\n(6 Card Chỉ Số KPI)", 
         "Chỉ chuột lần lượt vào 6 Card chỉ số KPI trên đầu trang: Doanh thu, Số hóa đơn, Tổng sản phẩm, Tồn kho thực tế, Giá trị tồn kho (TK156), Tổng công nợ.", 
         "Tiếp theo, xin kính mời quý thầy cô quan sát Bảng điều hành tổng quan Dashboard. Giao diện được thiết kế tinh gọn, tập trung vào 6 chỉ số trọng yếu sống từ SQLite: Doanh thu thực tế trong tháng; Tổng số lượng hóa đơn phát sinh; Danh mục 20 mẫu thời trang; Tồn kho thực tế phân loại theo tình trạng còn hàng hay sắp hết; Giá trị vốn tồn kho Tài khoản 156; và Cân đối công nợ Phải thu khách hàng so với Phải trả xưởng may."),
        ("03:00 - 03:30\nBiểu đồ Recharts 6 tháng", 
         "Cuộn nhẹ xuống biểu đồ cột so sánh Doanh thu & Chi phí nhập xưởng. Rê chuột vào các cột để hiển thị Tooltip số liệu chi tiết.", 
         "Phía dưới là biểu đồ trực quan so sánh Doanh thu bán hàng và Chi phí nhập xưởng trong 6 tháng gần nhất. Giúp ban giám đốc nhận diện nhanh chóng chu kỳ kinh doanh, biên lợi nhuận và xu hướng tiêu dùng theo mùa của ngành thời trang."),
        ("03:30 - 04:00\n2 Bảng Cảnh Báo Hành Động", 
         "Lướt qua 2 bảng: 'Cảnh báo hàng tồn sắp hết' và 'Đơn hàng công nợ chờ thanh toán'. Trỏ vào nút 'Tạo đề xuất nhập kho' và nút thu nợ.", 
         "Đặc biệt, hệ thống tích hợp sẵn 2 bảng cảnh báo chủ động: Cảnh báo những mẫu đầm, áo sơ mi sắp chạm ngưỡng tồn tối thiểu để kịp thời đặt may bổ sung; và Danh sách hóa đơn nợ quá hạn để kế toán tiến hành đôn đốc thu hồi vốn lưu động.")
    ]
    add_scene_section(3, "Dashboard Điều Hành Doanh Nghiệp 6 Chỉ Số Trọng Yếu", "02:30 - 04:00",
                      "Làm nổi bật khả năng trích xuất dữ liệu thời gian thực từ database SQLite (không fake/hardcode) và hỗ trợ ra quyết định kinh doanh.",
                      s3_steps,
                      "Bấm nhẹ nút 'Làm Mới Số Liệu' ở góc banner Dashboard để người xem thấy spinner quay và dữ liệu được refresh tức thì.")

    # -------------------------------------------------------------
    # SCENE 4: QUẢN LÝ DANH MỤC & MASTER DATA THỜI TRANG
    # -------------------------------------------------------------
    s4_steps = [
        ("04:00 - 04:30\nTab Quản Lý → Sản Phẩm\n(`products`)", 
         "Click vào menu '🏷️ Sản Phẩm' trên Sidebar. Lướt qua bảng danh sách 20 sản phẩm thời trang có đầy đủ ảnh minh họa, mã SKU, size S/M/L, giá vốn, giá bán, tồn kho.", 
         "Bây giờ, chúng ta cùng đến với phân hệ Quản lý Master Data. Tại màn hình Sản phẩm, hệ thống quản lý danh mục mẫu mã thời trang chuyên biệt: mỗi mẫu đều có ảnh chụp lookbook sắc nét, mã SKU chuẩn hóa, thông số kích cỡ từ Size S, M đến L, XL, màu sắc, giá vốn và giá niêm yết bán lẻ."),
        ("04:30 - 04:55\nTab Quản Lý → Danh Mục Hàng\n(`categories`)", 
         "Click vào menu '📂 Danh Mục Hàng'. Xem 7 nhóm hàng: Áo sơ mi, Đầm dạ hội, Quần Jeans, Áo khoác, Túi xách, Giày dép, Áo thun. Thử bấm Thêm danh mục mới.", 
         "Tại phân hệ Danh mục hàng hóa, các nhóm sản phẩm được phân cấp rõ ràng. Cơ sở dữ liệu SQLite áp dụng ràng buộc khóa ngoại Foreign Key nghiêm ngặt, ngăn chặn triệt để hành vi xóa nhầm danh mục khi còn sản phẩm trực thuộc."),
        ("04:55 - 05:20\nTab Quản Lý → Khách Hàng & NCC\n(`customers` & `suppliers`)", 
         "Click '👥 Khách Hàng', xem danh bạ khách VIP (Hạng thẻ Silver, Gold, Diamond, điểm tích lũy, công nợ). Chuyển sang '🏢 Nhà Cung Cấp', xem danh bạ xưởng may gia công D&D.", 
         "Phân hệ Khách hàng hỗ trợ phân hạng VIP như Bạc, Vàng, Kim Cương kèm chính sách chiết khấu tự động và hạn mức nợ tín dụng. Song song đó, phân hệ Nhà cung cấp lưu trữ danh bạ các xưởng may gia công, đối tác cung ứng vải sợi và phụ liệu may mặc."),
        ("05:20 - 05:45\nTab Quản Lý → Nhân Sự\n(`employees`)", 
         "Click '👔 Người Dùng (Nhân Sự)'. Xem hồ sơ nhân viên showroom, kế toán, kho vận và chức năng liên kết tự động tài khoản đăng nhập.", 
         "Mục Nhân sự quản lý toàn bộ hồ sơ nhân viên theo phòng ban: Showroom thu ngân, Kế toán, Kho vận và Ban giám đốc. Mỗi hồ sơ nhân viên được liên kết trực tiếp với tài khoản người dùng đăng nhập hệ thống, đảm bảo tính phân quyền minh bạch.")
    ]
    add_scene_section(4, "Quản Trị Danh Mục & Dữ Liệu Gốc Master Data Thời Trang", "04:00 - 05:45",
                      "Thể hiện độ sâu nghiệp vụ thời trang: quản lý size/màu/ảnh, khách VIP phân hạng, xưởng may và quản trị nhân sự gắn liền tài khoản.",
                      s4_steps,
                      "Gõ thử từ khóa tìm kiếm sản phẩm 'Đầm' hoặc 'Áo sơ mi' vào ô tìm kiếm để thấy bảng filter sản phẩm siêu nhanh.")

    # -------------------------------------------------------------
    # SCENE 5: TRẠM BÁN HÀNG POS QUẦY & NGHIỆP VỤ BÁN HÀNG
    # -------------------------------------------------------------
    s5_steps = [
        ("05:45 - 06:15\nNhấn F2 mở Trạm POS Quầy\n(`pos`)", 
         "Bấm phím tắt F2 (hoặc click '⚡ Bán Hàng POS Quầy' trên Sidebar). Giao diện POS bán lẻ mở ra với danh mục sản phẩm ảnh thời trang, bộ lọc size, và giỏ hàng bên phải.", 
         "Và đây là một trong những phân hệ ấn tượng nhất: Trạm Thu Ngân Bán Lẻ POS tại quầy, có thể truy cập nhanh bằng phím tắt F2! Giao diện được tối ưu hóa cho thao tác chạm và quét mã vạch tốc độ cao của nhân viên thu ngân showroom thời trang."),
        ("06:15 - 06:45\nChọn sản phẩm, chọn Size & Giỏ hàng", 
         "Bấm chọn 1 sản phẩm (ví dụ: Áo Sơ Mi Lụa Cổ V SP01), chọn Size M, bấm 'Thêm vào giỏ'. Tiếp tục chọn Đầm Dạ Hội SP02 Size L. Tăng giảm số lượng.", 
         "Em thao tác chọn mẫu Áo sơ mi lụa và Đầm dạ hội, chọn kích cỡ Size M và Size L. Giỏ hàng cập nhật số lượng, đơn giá và tính toán thành tiền tức thì. Hệ thống kiểm soát lượng tồn khả dụng, không cho phép chọn quá số lượng hiện có."),
        ("06:45 - 07:15\nChọn Khách VIP & Thêm nhanh Khách", 
         "Tại ô khách hàng, gõ chọn khách VIP 'Chị Mai Lan' (Diamond - chiết khấu 10%). Hoặc bấm icon 'UserPlus' mở modal tạo nhanh khách mới tại quầy có kiểm tra trùng SĐT.", 
         "Thu ngân có thể chọn khách quen VIP như chị Mai Lan – ngay lập tức hạng thẻ Kim Cương tự động áp mức giảm giá ưu đãi 10%. Nếu là khách mới ghé showroom, thu ngân bấm nút Tạo nhanh để đăng ký thông tin chỉ trong 10 giây với cơ chế chống trùng số điện thoại thông minh."),
        ("07:15 - 07:40\nThanh toán, Chặn âm kho & In Bill Quầy", 
         "Chọn phương thức 'Tiền mặt', nhập tiền khách đưa 2.000.000đ, hệ thống tính tiền thừa. Bấm 'Thanh Toán & In Hóa Đơn'. Modal hóa đơn nhiệt 80mm xuất hiện đẹp mắt.", 
         "Đặc biệt, hệ thống trang bị cơ chế CHẶN ÂM KHO TUYỆT ĐỐI bằng Atomic Transaction Rollback: nếu có bất kỳ sản phẩm nào vượt quá tồn kho thực tế, giao dịch sẽ bị từ chối ngay lập tức để bảo vệ dữ liệu. Khi thanh toán thành công, hóa đơn bill nhiệt 80mm được tạo tự động với đầy đủ logo D&D, mã QR và thông tin chi tiết."),
        ("07:40 - 08:00\nXem danh sách Hóa Đơn Bán Hàng\n(`sales`)", 
         "Chuyển sang tab '📑 Bán Hàng (Hóa Đơn)'. Chỉ vào hóa đơn vừa lập với trạng thái ĐÃ THANH TOÁN, tồn kho đã tự động bị trừ.", 
         "Tại tab Hóa Đơn Bán Hàng, đơn hàng vừa bán đã được ghi nhận ngay lập tức, phân loại trạng thái rõ ràng, và số lượng tồn kho của các mẫu vừa bán đã được trừ chính xác thông qua Trigger SQLite.")
    ]
    add_scene_section(5, "Trạm Thu Ngân POS Quầy & Nghiệp Vụ Bán Hàng (Chặn Âm Kho)", "05:45 - 08:00",
                      "Đây là phân hệ 'Highlight' nhất của đồ án. Cần thể hiện rõ: Phím F2, Thêm giỏ hàng, Khách VIP chiết khấu, In bill nhiệt 80mm, và cơ chế Chặn âm kho tuyệt đối.",
                      s5_steps,
                      "Hãy dừng lại 3 giây ở màn hình Preview hóa đơn nhiệt (Receipt 80mm) để người xem thấy rõ sự chỉn chu từ logo, bảng sản phẩm đến lời cảm ơn khách hàng.")

    # -------------------------------------------------------------
    # SCENE 6: MUA HÀNG & NHẬP KHO TỪ XƯỞNG MAY GIA CÔNG
    # -------------------------------------------------------------
    s6_steps = [
        ("08:00 - 08:30\nTab Giao Dịch → Nhập Hàng Xưởng\n(`purchases`)", 
         "Click vào menu '🏭 Nhập Hàng Xưởng' trên Sidebar. Xem danh sách các hóa đơn mua vào (HDM). Bấm nút '+ Lập Đơn Nhập Hàng'.", 
         "Sau khi bán hàng làm giảm lượng tồn kho, chúng ta cùng xem quy trình Mua Hàng & Nhập Kho Từ Xưởng May Gia Công. Đây là nghiệp vụ trọng tâm giúp chuỗi thời trang D&D duy trì nguồn cung ổn định."),
        ("08:30 - 09:05\nThao tác Modal Nhập Hàng Xưởng", 
         "Modal lập hóa đơn mua hàng hiện ra. Chọn Nhà cung cấp: 'Xưởng May Tân Bình'. Chọn sản phẩm: 'Áo Sơ Mi Lụa Công Sở', số lượng nhập: 30 cái, đơn giá vốn: 180.000đ. Nhập thuế VAT khấu trừ 8%. Bấm 'Lưu Hóa Đơn Nhập'.", 
         "Thu mua chọn Xưởng may đối tác, chọn mẫu sản phẩm và nhập số lượng lô hàng theo kích cỡ, đơn giá vốn nhập xưởng và thuế GTGT đầu vào được khấu trừ Tài khoản 133. Khi bấm Lưu, giao dịch được thực thi qua SQLite Transaction."),
        ("09:05 - 09:30\nKiểm chứng Trigger tăng kho & Xuất Excel", 
         "Thông báo thành công hiện lên. Vào tab Tồn kho xem sản phẩm đã tăng thêm 30 cái. Quay lại tab Mua hàng bấm nút 'Xuất Excel'. Mở file Excel xem bảng báo cáo.", 
         "Điểm đột phá kỹ thuật ở đây là Trigger tự động trong cơ sở dữ liệu SQLite: tồn kho của mẫu áo sơ mi lập tức tăng thêm đúng 30 sản phẩm mà không cần can thiệp thủ công. Đồng thời công nợ phải trả xưởng may Tài khoản 331 được ghi nhận chính xác. Người dùng có thể xuất file Excel báo cáo nhập hàng chuẩn biểu mẫu kế toán chỉ với 1 cú click.")
    ]
    add_scene_section(6, "Mua Hàng & Nhập Kho Xưởng May (Tự Động Tăng Kho Qua Trigger)", "08:00 - 09:30",
                      "Khẳng định tính tự động hóa cao: Trigger SQLite tự tăng tồn kho, ghi nhận công nợ nhà cung cấp và khả năng xuất báo cáo Excel hoàn hảo.",
                      s6_steps,
                      "Sau khi bấm Lưu hóa đơn nhập, mở nhanh tab Kho để khán giả nhìn thấy số lượng tồn nhảy số tăng lên ngay trước mắt!")

    # -------------------------------------------------------------
    # SCENE 7: ĐỀ XUẤT NHẬP/XUẤT KHO & QUY TRÌNH PHÊ DUYỆT
    # -------------------------------------------------------------
    s7_steps = [
        ("09:30 - 10:00\nNhấn F3 mở Đề Xuất Nhập/Xuất\n(`requisitions`)", 
         "Bấm phím tắt F3. Màn hình Đề Xuất Nhập/Xuất kho mở ra. Bấm nút '+ Tạo Đề Xuất Mới'.", 
         "Để chuẩn hóa luồng vận hành giữa các bộ phận, hệ thống cung cấp Phân hệ Đề Xuất Nhập/Xuất Kho – truy cập nhanh bằng phím tắt F3. Nhân viên bán hàng hoặc thủ kho khi thấy mẫu đầm dạ hội bán chạy sắp hết có thể lập ngay một đề xuất bổ sung hàng khẩn cấp."),
        ("10:00 - 10:25\nTạo đề xuất & Chọn độ khẩn cấp", 
         "Điền lý do: 'Bổ sung mẫu thiết kế mới cho BST Thu Đông'. Chọn mức độ: 'KHẨN CẤP'. Chọn mẫu Đầm dạ hội, số lượng 50 chiếc. Bấm 'Gửi Đề Xuất'.", 
         "Form đề xuất cho phép thiết lập độ khẩn cấp: Thường, Cao hoặc Khẩn cấp; chọn xưởng may đề xuất và danh mục mẫu mã. Đề xuất sau khi gửi sẽ nằm ở trạng thái CHỜ DUYỆT, đồng thời hiển thị Badge cảnh báo số lượng trên Sidebar."),
        ("10:25 - 10:45\nPhê duyệt & Chuyển đổi 1-Click", 
         "Bấm vào đề xuất vừa tạo. Với quyền Quản lý/Giám đốc, bấm nút 'Phê Duyệt Đề Xuất'. Sau đó bấm nút 'Chuyển thành Đơn Mua Hàng Xưởng'.", 
         "Chỉ cấp Quản lý hoặc Giám đốc mới có thẩm quyền Phê duyệt. Tuyệt vời hơn nữa, từ đề xuất đã duyệt, hệ thống hỗ trợ tính năng Chuyển đổi 1-Click trực tiếp thành Hóa đơn nhập hàng xưởng mà không cần phải nhập lại thông tin từ đầu!")
    ]
    add_scene_section(7, "Đề Xuất Nhập/Xuất Kho & Quy Trình Duyệt Đa Cấp", "09:30 - 10:45",
                      "Chứng minh quy trình cộng tác phân quyền chặt chẽ giữa Nhân viên đề xuất và Quản lý phê duyệt theo chuẩn ERP doanh nghiệp.",
                      s7_steps,
                      "Nhấn mạnh phím tắt F3 và tính năng chuyển đổi 1-click sang hóa đơn mua hàng – tính năng rất được các doanh nghiệp đánh giá cao.")

    # -------------------------------------------------------------
    # SCENE 8: QUẢN LÝ KHO HÀNG, THẺ KHO & KIỂM KÊ
    # -------------------------------------------------------------
    s8_steps = [
        ("10:45 - 11:15\nTab Kho → Tồn Kho Sản Phẩm\n(`inventory`)", 
         "Click vào menu '📦 Tồn Kho & Xuất Nhập' trên Sidebar. Lướt qua danh sách tồn kho, trạng thái Còn hàng (xanh), Sắp hết (vàng), Hết hàng (đỏ). Lọc theo danh mục.", 
         "Kính mời quý thầy cô tiếp tục theo dõi Phân hệ Quản Lý Kho Hàng – trái tim vận hành của chuỗi thời trang. Bảng tồn kho tổng hợp hiển thị chi tiết số lượng thực tế, số lượng khả dụng, định mức tồn an toàn và trạng thái cảnh báo trực quan bằng màu sắc."),
        ("11:15 - 11:40\nThẻ Kho Chi Tiết (Mẫu 01/02-VT)\nTab 'Lịch Sử Biến Động'", 
         "Chuyển sang tab phụ 'Lịch Sử / Thẻ Kho'. Xem từng dòng biến động: Ngày giờ, Loại nghiệp vụ (Bán lẻ, Nhập xưởng, Điều chỉnh), Số lượng vào/ra, Tồn cuối, và Mã chứng từ tham chiếu.", 
         "Phân hệ Thẻ Kho chuẩn mẫu 01/02-VT theo quy định kế toán: ghi nhận từng giây biến động Nhập - Xuất - Tồn của mỗi sản phẩm. Bất kỳ giao dịch bán hàng tại POS hay nhập kho từ xưởng may đều được truy vết nguồn gốc minh bạch tuyệt đối."),
        ("11:40 - 12:00\nPhiếu Điều Chỉnh Tồn Kho", 
         "Bấm vào nút 'Điều chỉnh kho' của một sản phẩm. Nhập số lượng thực tế sau kiểm kê, nhập lý do: 'Kiểm kê định kỳ phát hiện thừa 1 chiếc'. Bấm Lưu.", 
         "Khi phát hiện sai lệch giữa số sách và thực tế tại showroom, thủ kho có thể tạo Phiếu Điều Chỉnh Tồn Kho có ghi rõ lý do. Hệ thống có cơ chế bảo vệ, nghiêm cấm điều chỉnh làm âm kho."),
        ("12:00 - 12:15\nKiểm Kê Kho & Quản Lý Hàng Lỗi", 
         "Mở nhanh tab 'Kiểm Kê Kho' và 'Hàng Lỗi / Đổi Trả'. Chỉ vào các phiếu ghi nhận sản phẩm lỗi chỉ may hoặc đổi trả của khách.", 
         "Ngoài ra, hệ thống còn hỗ trợ Phiếu kiểm kê kho toàn diện và Quản lý hàng lỗi, đổi trả bảo hành – giúp phân loại rõ ràng sản phẩm cần sửa chữa hay hoàn trả về xưởng may gia công.")
    ]
    add_scene_section(8, "Quản Trị Kho Vận, Thẻ Kho 01/02-VT & Kiểm Kê Định Kỳ", "10:45 - 12:15",
                      "Làm nổi bật tính pháp lý và độ chuẩn xác của Thẻ kho (01/02-VT), khả năng truy vết lịch sử và cơ chế điều chỉnh an toàn.",
                      s8_steps,
                      "Nhấp chuột vào một mã chứng từ trên thẻ kho để chứng minh tính liên kết dữ liệu xuyên suốt giữa các phân hệ.")

    # -------------------------------------------------------------
    # SCENE 9: KẾ TOÁN TÀI CHÍNH, SỔ QUỸ & QUẢN LÝ CÔNG NỢ
    # -------------------------------------------------------------
    s9_steps = [
        ("12:15 - 12:45\nTab Kế Toán → Thu Chi (Sổ Quỹ)\n(`cashbook`)", 
         "Click menu '💰 Thu Chi (Sổ Quỹ)'. Xem tổng quỹ tiền mặt (TK 1111) và tài khoản ngân hàng (TK 1121). Lướt qua bảng danh sách phiếu thu, phiếu chi.", 
         "Bước sang Phân hệ Kế Toán & Tài Chính. Tại Sổ Quỹ Thu Chi, hệ thống quản lý song song hai dòng tiền: Tiền mặt tại két showroom (Tài khoản 1111) và Tiền gửi ngân hàng (Tài khoản 1121). Mọi dòng tiền vào ra đều được giám sát chặt chẽ theo số dư thực tế."),
        ("12:45 - 13:15\nLập Phiếu Thu / Phiếu Chi\n& Tự động định khoản", 
         "Bấm nút '+ Lập Phiếu Thu'. Chọn đối tượng: Khách hàng sỉ, số tiền: 5.000.000đ, lý do: 'Thu hồi công nợ đợt 1'. Chọn TK đối ứng 131. Bấm Lưu và In Phiếu.", 
         "Kế toán có thể lập Phiếu Thu tiền mặt hoặc Báo có ngân hàng. Hệ thống tự động gợi ý định khoản Nợ/Có theo Chế độ Kế toán Doanh nghiệp Việt Nam (Thông tư 133 và 200). Ngay sau khi lưu, kế toán có thể in Phiếu thu chuẩn chỉnh có chữ ký các bên."),
        ("13:15 - 13:45\nTab Kế Toán → Quản Lý Công Nợ\n(`debts`)", 
         "Click menu '💳 Quản Lý Công Nợ'. Xem 2 khối: Công nợ phải thu khách hàng (TK 131) và Công nợ phải trả xưởng may (TK 331).", 
         "Tại Phân hệ Quản Lý Công Nợ, hệ thống bóc tách rõ ràng: Công nợ Phải thu khách hàng (Tài khoản 131) đối với các đơn hàng bán buôn, bán sỉ; và Công nợ Phải trả xưởng may (Tài khoản 331)."),
        ("13:45 - 14:00\nThao tác Nhanh Thu Nợ / Trả Nợ & Excel", 
         "Bấm nút 'Thu nợ' tại dòng một khách hàng đang nợ. Modal phiếu thu tự động điền tên khách và số nợ. Bấm Xuất Excel đối soát công nợ.", 
         "Nút bấm thông minh 'Thu Nợ' hoặc 'Trả Nợ' cho phép kích hoạt nhanh phiếu thu chi tương ứng mà không mất công tra cứu lại thông tin. Tính năng xuất Excel báo cáo đối soát công nợ giúp kế toán dễ dàng gửi biên bản xác nhận công nợ cuối tháng cho đối tác.")
    ]
    add_scene_section(9, "Kế Toán Tài Chính, Sổ Quỹ Thu Chi & Công Nợ Đối Tác", "12:15 - 14:00",
                      "Thể hiện kiến thức chuyên sâu về tài chính kế toán: tài khoản 111, 112, 131, 331, khả năng đối soát và tự động hạch toán.",
                      s9_steps,
                      "Nhấn mạnh tính năng nút 'Thu nợ' tự điền sẵn dữ liệu, giúp kế toán tiết kiệm 80% thời gian tác nghiệp.")

    # -------------------------------------------------------------
    # SCENE 10: BÁO CÁO TÀI CHÍNH & TRỢ LÝ TRÍ TUỆ NHÂN TẠO GEMINI AI
    # -------------------------------------------------------------
    s10_steps = [
        ("14:00 - 14:35\nTab Kế Toán → Báo Cáo Tài Chính\n(`reports`)", 
         "Click menu '📊 Báo Cáo Tài Chính'. Xem các tab con: Tổng quan cửa hàng, Doanh thu theo thời gian, Top sản phẩm bán chạy (Best Sellers), Báo cáo Lãi Lỗ P&L.", 
         "Phân hệ Báo Cáo Tài Chính cung cấp góc nhìn đa chiều về sức khỏe doanh nghiệp thời trang: Báo cáo doanh thu theo từng mốc ngày, tháng, quý, năm; Bảng xếp hạng Top sản phẩm bán chạy nhất; Hiệu suất bán hàng của từng nhân viên; và Báo cáo Kết quả Hoạt động Kinh doanh P&L phản ánh chi tiết Doanh thu thuần, Giá vốn hàng bán và Lợi nhuận gộp."),
        ("14:35 - 15:05\nNhấn F1 mở Trợ Lý Gemini AI\n(`ai-assistant`)", 
         "Bấm phím tắt F1 (hoặc click icon Sparkles trên Header). Modal Trợ Lý AI xuất hiện với giao diện hiện đại, chuyên nghiệp.", 
         "Và đây là tính năng đột phá mang đậm dấu ấn công nghệ 4.0: Trợ Lý Kế Toán & Cố Vấn Thời Trang Trí Tuệ Nhân Tạo Google Gemini AI – kích hoạt tức thì bằng phím tắt F1!"),
        ("15:05 - 15:30\nHỏi đáp nghiệp vụ kế toán & cố vấn", 
         "Click vào câu hỏi mẫu: 'Chi trả tiền thuê mặt bằng showroom 15 triệu hạch toán Nợ/Có như thế nào?' hoặc gõ câu hỏi thực tế. AI phân tích và trả lời chuẩn Thông tư 133/200.", 
         "Trợ lý AI được nạp dữ liệu ngữ cảnh thực tế của cửa hàng D&D và am hiểu sâu sắc Chế độ kế toán Việt Nam. Người dùng có thể hỏi về cách định khoản các chi phí đặc thù như thuê mặt bằng, chi phí chụp lookbook, khấu hao máy móc, hoặc yêu cầu AI phân tích cơ cấu giá vốn của các bộ sưu tập thời trang mới. Câu trả lời chuẩn xác, nhanh chóng và vô cùng hữu ích!")
    ]
    add_scene_section(10, "Báo Cáo Tài Chính Đa Chiều & Trợ Lý Gemini AI Đột Phá", "14:00 - 15:30",
                      "Kết hợp giữa báo cáo phân tích quản trị sắc bén và công nghệ Trí tuệ nhân tạo Gemini AI tiên tiến nhất hiện nay.",
                      s10_steps,
                      "Hãy nhấn phím F1 dứt khoát trên bàn phím để kích hoạt AI modal một cách ấn tượng. Để AI generate câu trả lời trong khoảng 2-3 giây rồi lướt xem câu trả lời chi tiết.")

    # -------------------------------------------------------------
    # SCENE 11: KHÓA MÀN HÌNH (F4) & TỔNG KẾT BẾ MẠC
    # -------------------------------------------------------------
    s11_steps = [
        ("15:30 - 15:45\nNhấn F4 Khóa Màn Hình Nhanh\n(Screen Lock)", 
         "Đóng modal AI. Bấm phím tắt F4. Màn hình bảo mật Khóa Màn Hình hiển thị làm mờ toàn bộ giao diện làm việc, yêu cầu nhập mật khẩu để mở khóa.", 
         "Trước khi kết thúc, em xin giới thiệu thêm một tính năng tiện ích rất thực tế tại các showroom thời trang: Phím tắt F4 Khóa Màn Hình Nhanh. Khi nhân viên thu ngân hoặc kế toán cần rời khỏi quầy trong giây lát, chỉ cần nhấn F4, toàn bộ màn hình sẽ được khóa an toàn, ngăn chặn việc lộ dữ liệu doanh thu hoặc sửa đổi chứng từ."),
        ("15:45 - 16:15\nMở khóa & Lời kết bế mạc video", 
         "Nhập mật khẩu mở khóa thành công. Quay lại màn hình chính Dashboard. Di chuyển chuột nhẹ nhàng và nhìn vào camera gửi lời cảm ơn.", 
         "Tổng kết lại, D&D FASHION ERP đã hiện thực hóa trọn vẹn một giải pháp quản trị toàn diện: từ giao diện tinh tế, thân thiện, kiến trúc công nghệ hiện đại, cơ sở dữ liệu SQLite bền vững với cơ chế bảo toàn dữ liệu nghiêm ngặt, cho đến sự hỗ trợ đắc lực của Trí tuệ nhân tạo AI. Hệ thống hoàn toàn sẵn sàng ứng dụng thực tế vào việc vận hành chuỗi thời trang chuyên nghiệp.\n\nEm xin chân thành cảm ơn quý thầy cô và các bạn đã chú ý lắng nghe và theo dõi phần trình diễn demo. Kính chúc quý thầy cô nhiều sức khỏe và thành công!")
    ]
    add_scene_section(11, "Khóa Màn Hình Nhanh (F4) & Lời Kết Bế Mạc Thuyết Trình", "15:30 - 16:15",
                      "Kết thúc video một cách trọn vẹn, thuyết phục, lịch thiệp và để lại ấn tượng sâu đậm về tính hoàn thiện cao của dự án.",
                      s11_steps,
                      "Đọc lời cảm ơn với giọng điệu tươi vui, tự hào và tự tin. Kết thúc video bằng cách hiển thị lại logo D&D Fashion ERP.")

    # -------------------------------------------------------------
    # 5. BẢNG CHECKLIST HẬU KỲ VÀ TIÊU CHÍ ĐÁNH GIÁ
    # -------------------------------------------------------------
    add_custom_h1("IV. BẢNG CHECKLIST KIỂM TRA TRƯỚC VÀ SAU KHI QUAY", "Đảm bảo không bỏ sót bất kỳ tiêu chí chấm điểm và thẩm định kỹ thuật nào")

    tbl_check = doc.add_table(rows=9, cols=3)
    tbl_check.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_check.autofit = False
    tbl_check.columns[0].width = Inches(0.8)
    tbl_check.columns[1].width = Inches(2.7)
    tbl_check.columns[2].width = Inches(3.5)

    chk_headers = ["STT", "Hạng Mục Kiểm Tra", "Yêu Cầu Tiêu Chuẩn Đạt Chuẩn"]
    for c_idx, h_text in enumerate(chk_headers):
        cell = tbl_check.rows[0].cells[c_idx]
        set_cell_shading(cell, HEX_PRIMARY)
        set_cell_margins_and_border(cell, border_color=HEX_PRIMARY)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = COLOR_WHITE

    checklist_items = [
        ("1", "Dữ liệu ban đầu (Database Seed)", "Đã chạy `npm run db:seed`. Dữ liệu hiển thị đầy đủ 20 mẫu thời trang, đối tác, tồn kho."),
        ("2", "Đăng nhập & RBAC", "Đăng nhập đúng tài khoản quản lý `quanly_duyen`, kiểm tra hiển thị đúng avatar và vai trò."),
        ("3", "Đổi mật khẩu bcrypt (Phase 8.1)", "Thao tác đổi mật khẩu thành công trong menu cá nhân, kiểm tra mật khẩu mới hoạt động."),
        ("4", "Trạm POS & Chặn âm kho", "Thêm giỏ hàng, chọn size, áp chiết khấu khách VIP, in bill nhiệt 80mm, chứng minh chặn âm kho."),
        ("5", "Nhập hàng & Trigger tăng kho", "Lập đơn nhập xưởng HDM, xác nhận tồn kho tăng tự động qua SQLite Trigger."),
        ("6", "Đề xuất & Duyệt 1-Click", "Nhấn F3 tạo đề xuất, duyệt đề xuất và chuyển đổi thành đơn mua hàng."),
        ("7", "Thẻ kho & Sổ quỹ & Công nợ", "Kiểm tra thẻ kho mẫu 01/02-VT, lập phiếu thu/chi có định khoản, đối soát công nợ 131/331."),
        ("8", "Trợ lý Gemini AI & Phím tắt", "Nhấn F1 gọi AI tư vấn nghiệp vụ kế toán, nhấn F4 test khóa màn hình bảo mật.")
    ]

    for r_idx, (stt, item, standard) in enumerate(checklist_items):
        row = tbl_check.rows[r_idx + 1]
        bg = HEX_ROW_ALT if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate([stt, item, standard]):
            cell = row.cells[c_idx]
            cell.width = tbl_check.columns[c_idx].width
            set_cell_shading(cell, bg)
            set_cell_margins_and_border(cell)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(9.5)
            if c_idx == 0:
                r.bold = True
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif c_idx == 1:
                r.bold = True
                r.font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Footer note
    p_end = doc.add_paragraph()
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_end = p_end.add_run("--- CHÚC BẠN CÓ MỘT VIDEO DEMO THÀNH CÔNG RỰC RỠ VÀ ĐẠT ĐIỂM SỐ CAO NHẤT! ---")
    r_end.bold = True
    r_end.font.size = Pt(11)
    r_end.font.color.rgb = COLOR_ROSE

    # Save document
    doc.save(output_path)
    print(f"[OK] Document successfully created at: {output_path}")

if __name__ == '__main__':
    target_file = os.path.join(os.getcwd(), 'KICH_BAN_QUAY_VIDEO_DEMO_DD_FASHION_ERP.docx')
    create_demo_script_document(target_file)
