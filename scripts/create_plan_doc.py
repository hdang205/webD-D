# -*- coding: utf-8 -*-
"""
Script to generate the Professional Word Document (.docx) for:
10. KẾ HOẠCH LẬP TRÌNH - DỰ ÁN QUẢN LÝ CỬA HÀNG THỜI TRANG D&D (D&D FASHION ERP)
Team: 7 Members
- Nhóm trưởng: Lê Thị Duyên (Product Owner / Business Analyst)
- Quan trọng nhất / Technical Lead & Core Architecture: Nguyễn Hải Đăng
- Phần không quá quan trọng / Tester, QA & Hỗ trợ tài liệu: Đặng Trà My
- Các thành viên khác: Chu Ngọc Hải, Đàm Thị Thùy Dung, Lê Thành Long, Trần Thanh Phong
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def create_document():
    doc = docx.Document()

    # 1. Page Setup (A4, Margins: Top=2cm, Bottom=2cm, Left=2.5cm, Right=2cm)
    sections = doc.sections
    for section in sections:
        section.page_width = Inches(8.27)   # A4 width
        section.page_height = Inches(11.69) # A4 height
        section.top_margin = Inches(0.79)   # ~2.0 cm
        section.bottom_margin = Inches(0.79)# ~2.0 cm
        section.left_margin = Inches(0.98)  # ~2.5 cm
        section.right_margin = Inches(0.79) # ~2.0 cm

        # Header & Footer setup
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("D&D Fashion ERP — Kế hoạch Lập trình & Phân công Dự án")
        hrun.font.name = "Times New Roman"
        hrun.font.size = Pt(8.5)
        hrun.font.italic = True
        hrun.font.color.rgb = RGBColor(120, 144, 156)

        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        frun = fp.add_run("Trang ")
        frun.font.name = "Times New Roman"
        frun.font.size = Pt(9)
        frun.font.color.rgb = RGBColor(120, 144, 156)
        
        # Add Page Numbering XML in footer
        fldSimple = OxmlElement('w:fldSimple')
        fldSimple.set(qn('w:instr'), 'PAGE')
        fp._p.append(fldSimple)

        frun2 = fp.add_run(" / Nhóm 7 thành viên — Trưởng nhóm: Lê Thị Duyên | Tech Lead: Nguyễn Hải Đăng")
        frun2.font.name = "Times New Roman"
        frun2.font.size = Pt(8.5)
        frun2.font.color.rgb = RGBColor(140, 160, 175)

    # Helper styling functions
    def set_cell_background(cell, fill_hex):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def set_table_borders(table, color="D2D6DC", sz="4"):
        tblPr = table._tbl.tblPr
        tblBorders = OxmlElement('w:tblBorders')
        for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
            border = OxmlElement(f'w:{border_name}')
            border.set(qn('w:val'), 'single')
            border.set(qn('w:sz'), sz)
            border.set(qn('w:space'), '0')
            border.set(qn('w:color'), color)
            tblBorders.append(border)
        tblPr.append(tblBorders)

    def add_p(text="", style='Normal', space_before=0, space_after=4, line_spacing=1.2, align=WD_ALIGN_PARAGRAPH.LEFT, bold=False, italic=False, font_size=12, color=RGBColor(31, 41, 55)):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = line_spacing
        if text:
            run = p.add_run(text)
            run.font.name = "Times New Roman"
            run.font.size = Pt(font_size)
            run.font.bold = bold
            run.font.italic = italic
            run.font.color.rgb = color
        return p

    def add_bullet(bold_prefix="", text="", level=0, space_after=3):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.left_indent = Inches(0.25 * (level + 1))
        
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.name = "Times New Roman"
            r_bold.font.size = Pt(11.5)
            r_bold.font.bold = True
            r_bold.font.color.rgb = RGBColor(15, 44, 89)
        
        if text:
            r_text = p.add_run(text)
            r_text.font.name = "Times New Roman"
            r_text.font.size = Pt(11.5)
            r_text.font.color.rgb = RGBColor(31, 41, 55)
        return p

    def add_callout(title, text, border_color="1E40AF", bg_color="F0F7FF"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.5)
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=140, bottom=140, left=200, right=160)
        
        tcPr = cell._tc.get_or_add_tcPr()
        tcBorders = OxmlElement('w:tcBorders')
        
        # Left border thick
        left = OxmlElement('w:left')
        left.set(qn('w:val'), 'single')
        left.set(qn('w:sz'), '32') # 4pt
        left.set(qn('w:color'), border_color)
        tcBorders.append(left)
        
        # None for others
        for b in ['top', 'bottom', 'right']:
            node = OxmlElement(f'w:{b}')
            node.set(qn('w:val'), 'none')
            tcBorders.append(node)
        tcPr.append(tcBorders)

        cp = cell.paragraphs[0]
        cp.paragraph_format.space_before = Pt(0)
        cp.paragraph_format.space_after = Pt(2)
        cp.paragraph_format.line_spacing = 1.15
        
        r_title = cp.add_run(f"★ {title}\n")
        r_title.font.name = "Times New Roman"
        r_title.font.size = Pt(11.5)
        r_title.font.bold = True
        r_title.font.color.rgb = RGBColor(15, 44, 89)

        r_text = cp.add_run(text)
        r_text.font.name = "Times New Roman"
        r_text.font.size = Pt(11)
        r_text.font.italic = False
        r_text.font.color.rgb = RGBColor(40, 50, 65)

        p_spacer = doc.add_paragraph()
        p_spacer.paragraph_format.space_before = Pt(0)
        p_spacer.paragraph_format.space_after = Pt(2)

    # -------------------------------------------------------------
    # DOCUMENT COVER / TITLE BLOCK
    # -------------------------------------------------------------
    p_inst = add_p("DỰ ÁN HỆ THỐNG QUẢN LÝ CỬA HÀNG THỜI TRANG D&D (D&D FASHION ERP)", 
                   space_before=0, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER, 
                   bold=True, font_size=12, color=RGBColor(71, 85, 105))
    
    p_subinst = add_p("BÁO CÁO KỸ THUẬT VÀ PHÂN CÔNG NHÂN SỰ DỰ ÁN", 
                      space_before=0, space_after=14, align=WD_ALIGN_PARAGRAPH.CENTER, 
                      bold=False, italic=True, font_size=11, color=RGBColor(100, 116, 139))

    # Main Title
    p_main = add_p("10. KẾ HOẠCH LẬP TRÌNH", 
                   space_before=6, space_after=6, align=WD_ALIGN_PARAGRAPH.CENTER, 
                   bold=True, font_size=20, color=RGBColor(15, 44, 89))
    
    p_subtitle = add_p("(SOFTWARE DEVELOPMENT PLAN & AGILE/SCRUM ROADMAP)", 
                       space_before=0, space_after=16, align=WD_ALIGN_PARAGRAPH.CENTER, 
                       bold=True, italic=True, font_size=12, color=RGBColor(30, 64, 175))

    # Summary box
    summary_text = (
        "Tài liệu chi tiết hóa toàn diện kiến trúc công nghệ MVC, lộ trình triển khai 04 Sprint theo quy trình chuẩn Agile/Scrum "
        "và cơ cấu phân công trách nhiệm cho 7 thành viên trong dự án Quản lý Cửa hàng Thời trang D&D. Trọng tâm kỹ thuật then chốt, "
        "CSDL 12 bảng, phân quyền RBAC và luồng POS/kế toán Thông tư 133 được dẫn dắt trực tiếp bởi Tech Lead Nguyễn Hải Đăng; "
        "công tác điều phối tổng thể và phạm vi nghiệp vụ được chủ trì bởi Trưởng nhóm Lê Thị Duyên; "
        "công tác kiểm thử cơ bản, chuẩn bị dữ liệu mẫu và hoàn thiện tài liệu được hỗ trợ bởi Tester Đặng Trà My."
    )
    add_callout("TỔNG QUAN TÀI LIỆU KẾ HOẠCH LẬP TRÌNH", summary_text, border_color="0F2C59", bg_color="F1F5F9")

    # -------------------------------------------------------------
    # 10.1. KIẾN TRÚC CÔNG NGHỆ PHẦN MỀM (TECH STACK & MVC)
    # -------------------------------------------------------------
    add_p("10.1. Kiến trúc Công nghệ Phần mềm (Tech Stack & MVC)", 
          space_before=14, space_after=6, bold=True, font_size=15, color=RGBColor(15, 44, 89))

    p_intro = add_p(
        "Hệ thống Quản lý Cửa hàng Thời trang D&D được nghiên cứu, thiết kế và xây dựng chặt chẽ theo mô hình kiến trúc chuẩn "
        "MVC (Model – View – Controller). Mô hình này đảm bảo sự tách biệt hoàn toàn giữa tầng biểu diễn dữ liệu (View), tầng xử lý logic nghiệp vụ "
        "(Controller) và tầng quản trị cơ sở dữ liệu quan hệ (Model), giúp hệ thống đạt độ tin cậy cao, dễ bảo trì, mở rộng và bảo mật:",
        space_before=2, space_after=6, font_size=11.5
    )

    # Bullet points for Model - View - Controller
    add_bullet(bold_prefix="• Model (Tầng Dữ liệu & Nghiệp vụ Kế toán): ",
               text="Sử dụng hệ quản trị cơ sở dữ liệu quan hệ Microsoft SQL Server để thiết kế và quản trị 12 bảng thực thể dữ liệu chuẩn hóa (chuẩn 3NF). "
                    "Hệ thống tích hợp chặt chẽ cơ chế kiểm soát ràng buộc toàn vẹn (PK, FK, UNIQUE, CHECK), trigger tự động chống âm kho và xử lý luồng hạch toán "
                    "kế toán tài chính tuân thủ chuẩn mực Thông tư 133/2016/TT-BTC của Bộ Tài chính.",
               space_after=4)

    add_bullet(bold_prefix="• View (Tầng Giao diện Người dùng): ",
               text="Sử dụng HTML5, CSS3, JavaScript kết hợp framework Tailwind CSS để xây dựng hệ thống giao diện hiện đại, trực quan, tối ưu trải nghiệm (UI/UX). "
                    "Bao gồm 10 màn hình giao diện wireframe nghiệp vụ hoàn chỉnh và màn hình POS bán hàng tại quầy chuyên dụng hỗ trợ thao tác nhanh, quét mã vạch barcode, "
                    "tương thích đa độ phân giải (Responsive).",
               space_after=4)

    add_bullet(bold_prefix="• Controller (Tầng Điều khiển & Xử lý Logic Nghiệp vụ): ",
               text="Sử dụng nền tảng Node.js kết hợp framework Express.js để xây dựng hệ thống RESTful API an toàn, hiệu năng cao. Phụ trách cơ chế bảo mật xác thực "
                    "bằng JSON Web Token (JWT), kiểm soát phân quyền truy cập đa cấp (RBAC) và thực thi toàn bộ các nghiệp vụ phức tạp: mua hàng, xuất nhập kho, bán lẻ POS, "
                    "tính chiết khấu, thuế VAT, theo dõi công nợ đối tác và luân chuyển dòng tiền sổ quỹ.",
               space_after=8)

    # 10.1.1 Bảng Tech Stack
    add_p("Bảng 10.1: Tổng hợp Ma trận Công nghệ và Mục đích Sử dụng trong Dự án", 
          space_before=6, space_after=4, bold=True, italic=True, font_size=11, color=RGBColor(30, 64, 175), align=WD_ALIGN_PARAGRAPH.CENTER)

    table_tech = doc.add_table(rows=5, cols=3)
    table_tech.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_tech.autofit = False
    set_table_borders(table_tech, color="CBD5E1", sz="4")

    headers_tech = ["Thành phần", "Công nghệ sử dụng", "Mục đích triển khai cụ thể trong hệ thống"]
    widths_tech = [Inches(1.5), Inches(2.2), Inches(2.8)]

    # Header formatting
    for col_idx, text in enumerate(headers_tech):
        cell = table_tech.cell(0, col_idx)
        cell.width = widths_tech[col_idx]
        set_cell_background(cell, "0F2C59")
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    data_tech = [
        ("Frontend (View)", 
         "HTML5, CSS3, JavaScript,\nTailwind CSS, Lucide Icons", 
         "Xây dựng 10 màn hình giao diện wireframe quản trị, bảng Dashboard biểu đồ kinh doanh và giao diện POS bán hàng chuyên dụng thao tác siêu tốc."),
        ("Backend (Controller)", 
         "Node.js, Express.js,\nJWT (JSON Web Token), bcrypt", 
         "Xử lý hệ thống RESTful API, kiểm soát xác thực phân quyền 5 vai trò (RBAC), điều phối nghiệp vụ bán lẻ POS, xuất nhập kho tự động và hạch toán sổ quỹ."),
        ("Database (Model)", 
         "Microsoft SQL Server\n(T-SQL, Triggers, Views)", 
         "Lưu trữ và quản trị an toàn 12 bảng CSDL quan hệ chuẩn hóa 3NF, lưu trữ chứng từ kế toán, hóa đơn, tồn kho và danh mục sản phẩm thời trang."),
        ("Công cụ Phát triển", 
         "VS Code, Git / GitHub,\nPostman, SSMS (SQL Management)", 
         "Môi trường lập trình đồng bộ mã nguồn nhóm qua Git, kiểm thử tự động hệ thống API bằng Postman, thiết kế và tối ưu truy vấn dữ liệu trên SSMS.")
    ]

    for row_idx, row_data in enumerate(data_tech, start=1):
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, val in enumerate(row_data):
            cell = table_tech.cell(row_idx, col_idx)
            cell.width = widths_tech[col_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=130, right=130)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(10.5)
                run.font.color.rgb = RGBColor(15, 44, 89)
            elif col_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(10)
                run.font.color.rgb = RGBColor(30, 64, 175)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.size = Pt(10)
                run.font.color.rgb = RGBColor(31, 41, 55)
            run.font.name = "Times New Roman"

    p_spacer1 = doc.add_paragraph()
    p_spacer1.paragraph_format.space_before = Pt(0)
    p_spacer1.paragraph_format.space_after = Pt(4)

    # 10.1.2 Chi tiết 12 Bảng Dữ liệu & 10 Màn hình Giao diện
    add_p("Chi tiết Kiến trúc Dữ liệu 12 Bảng và Hệ thống 10 Màn hình Giao diện:", 
          space_before=4, space_after=4, bold=True, font_size=12, color=RGBColor(15, 44, 89))

    add_bullet(bold_prefix="• Hệ thống 12 Bảng CSDL Chuẩn hóa (Model): ",
               text="Gồm: (1) company_info [Thông tin doanh nghiệp & kỳ kế toán]; (2) users [Người dùng & bảo mật mật khẩu bcrypt]; "
                    "(3) employees [Hồ sơ nhân sự & phân quyền]; (4) accounts [Hệ thống tài khoản chuẩn TT133]; (5) categories [Danh mục thời trang]; "
                    "(6) products [Sản phẩm, size, màu, barcode, giá vốn, giá bán, tồn kho]; (7) partners [Khách hàng VIP, Nhà cung cấp]; "
                    "(8) invoices & invoice_items [Hóa đơn bán hàng POS và đơn đặt mua PO]; (9) inventory_logs & inventory_log_items [Phiếu nhập kho 01-VT, phiếu xuất kho 02-VT]; "
                    "(10) stock_requisitions [Phiếu đề xuất mua/xuất kho nội bộ]; (11) cash_transactions [Sổ quỹ Phiếu thu/chi TK 111, 112]; "
                    "(12) journal_entries & journal_details [Sổ nhật ký chung, định khoản nợ/có tự động].",
               space_after=4)

    add_bullet(bold_prefix="• Danh mục 10 Màn hình Giao diện Nghiệp vụ (View Wireframes): ",
               text="Gồm: (1) Màn hình Đăng nhập & Xác thực JWT; (2) Dashboard Tổng quan Doanh thu & Cảnh báo Tồn kho; "
                    "(3) Màn hình POS Bán lẻ tại quầy chuyên dụng; (4) Quản lý Danh mục & Sản phẩm Thời trang (Size/Màu/Mã vạch); "
                    "(5) Đơn mua hàng (PO) & Phiếu nhập kho 01-VT; (6) Quản lý Xuất kho & Biên bản Kiểm kê kho; "
                    "(7) Quản lý Đối tác (Khách hàng VIP, Nhà cung cấp); (8) Quản lý Phiếu Đề xuất Mua hàng / Xuất kho; "
                    "(9) Sổ quỹ Tiền mặt & Tiền gửi Ngân hàng (Phiếu Thu 01-TT, Phiếu Chi 02-TT); "
                    "(10) Hệ thống Báo cáo Kế toán Tài chính theo Thông tư 133/2016/TT-BTC.",
               space_after=8)

    # -------------------------------------------------------------
    # 10.2. LỘ TRÌNH TRIỂN KHAI 8 TUẦN THEO SCRUM/AGILE
    # -------------------------------------------------------------
    add_p("10.2. Lộ trình Triển khai 8 Tuần theo Scrum/Agile", 
          space_before=14, space_after=6, bold=True, font_size=15, color=RGBColor(15, 44, 89))

    add_p(
        "Dự án được tổ chức và quản trị nghiêm ngặt theo khung phương pháp Agile/Scrum trong tổng thời gian 08 tuần, "
        "được chia thành 04 Sprint liên tiếp (mỗi Sprint kéo dài đúng 02 tuần). Sau mỗi Sprint, nhóm cam kết bàn giao một phiên bản "
        "phần mềm gia tăng có khả năng chạy thực tế (Potentially Shippable Product Increment) để tiến hành kiểm thử, đối chiếu dữ liệu "
        "kế toán và nghiệm thu trước khi bước sang giai đoạn tiếp theo:",
        space_before=2, space_after=6, font_size=11.5
    )

    # Bảng 10.2: Lộ trình 4 Sprint
    add_p("Bảng 10.2: Kế hoạch và Lộ trình Triển khai 04 Sprint (8 Tuần)", 
          space_before=6, space_after=4, bold=True, italic=True, font_size=11, color=RGBColor(30, 64, 175), align=WD_ALIGN_PARAGRAPH.CENTER)

    table_sprint = doc.add_table(rows=5, cols=4)
    table_sprint.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_sprint.autofit = False
    set_table_borders(table_sprint, color="CBD5E1", sz="4")

    headers_sprint = ["Sprint", "Thời gian", "Mục tiêu chính", "Nhiệm vụ kỹ thuật & Sản phẩm bàn giao"]
    widths_sprint = [Inches(1.0), Inches(1.1), Inches(2.0), Inches(2.4)]

    for col_idx, text in enumerate(headers_sprint):
        cell = table_sprint.cell(0, col_idx)
        cell.width = widths_sprint[col_idx]
        set_cell_background(cell, "0F2C59")
        set_cell_margins(cell, top=120, bottom=120, left=120, right=120)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    sprints_data = [
        ("Sprint 1", "Tuần 1–2", 
         "Khởi tạo hệ thống, Kiến trúc MVC &\nQuản lý Sản phẩm thời trang", 
         "• Dựng khung kiến trúc MVC nền tảng, thiết lập kết nối Microsoft SQL Server tạo 12 bảng chuẩn hóa.\n"
         "• Xây dựng hệ thống phân quyền JWT và phân vai trò RBAC bảo mật.\n"
         "• Lập trình đầy đủ tính năng CRUD Danh mục và Quản lý Sản phẩm thời trang (size/màu/mã vạch barcode).\n"
         "★ Bàn giao: Khung hệ thống hoàn chỉnh, module Đăng nhập bảo mật và màn hình Quản lý Sản phẩm hoạt động ổn định."),
        
        ("Sprint 2", "Tuần 3–4", 
         "Phân hệ Mua hàng, Quản lý NCC &\nNhập kho tự động (Mẫu 01-VT)", 
         "• Xây dựng module Đối tác Nhà cung cấp và quản lý Đơn mua hàng (PO).\n"
         "• Phát triển quy trình lập Phiếu nhập kho chuẩn mẫu 01-VT theo Bộ Tài chính.\n"
         "• Thiết lập cơ chế tự động tăng số lượng tồn kho tức thời và sinh bút toán nợ TK 331 (Phải trả người bán).\n"
         "★ Bàn giao: Phân hệ Mua hàng hoàn chỉnh và chức năng Nhập kho tự động đồng bộ tồn kho và công nợ."),
        
        ("Sprint 3", "Tuần 5–6", 
         "Bán hàng POS tại quầy, Xuất kho &\nKiểm kê kho định kỳ", 
         "• Xây dựng quản lý Khách hàng VIP đa hạng (Diamond/Gold/Silver) và cơ chế tích điểm.\n"
         "• Lập trình giao diện POS bán lẻ tại quầy chuyên nghiệp, tìm kiếm quét mã vạch barcode.\n"
         "• Tự động trừ số lượng tồn kho theo thời gian thực, tính chiết khấu khuyến mại, thuế VAT, hạch toán công nợ nợ TK 131.\n"
         "• Xây dựng phân hệ Kiểm kê kho và lập Biên bản kiểm kê xử lý thừa/thiếu hàng.\n"
         "★ Bàn giao: Màn hình POS bán hàng hoạt động mượt mà, tự động trừ kho và biên bản kiểm kê kho chuẩn xác."),
        
        ("Sprint 4", "Tuần 7–8", 
         "Sổ quỹ Thu/Chi, Báo cáo Tài chính TT133 &\nKiểm thử toàn diện, Đóng gói", 
         "• Xây dựng phân hệ Sổ quỹ tiền mặt (TK 111) và tiền gửi ngân hàng (TK 112) với Phiếu Thu (01-TT), Phiếu Chi (02-TT).\n"
         "• Tự động kết xuất Bảng cân đối tài khoản và Báo cáo Kết quả hoạt động kinh doanh (P&L) theo Thông tư 133/2016/TT-BTC.\n"
         "• Tiến hành kiểm thử toàn diện (Integration & Regression Testing), tối ưu hóa tốc độ và bảo mật hệ thống.\n"
         "• Đóng gói mã nguồn, hoàn thiện bộ hồ sơ báo cáo Word và Slide thuyết trình PPT.\n"
         "★ Bàn giao: Bộ phần mềm ERP hoàn chỉnh, bộ tài liệu kỹ thuật, báo cáo Word và Slide PPT thuyết trình chuyên nghiệp.")
    ]

    for row_idx, row_data in enumerate(sprints_data, start=1):
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, val in enumerate(row_data):
            cell = table_sprint.cell(row_idx, col_idx)
            cell.width = widths_sprint[col_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=110, right=110)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(10.5)
                run.font.color.rgb = RGBColor(15, 44, 89)
            elif col_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(10)
                run.font.color.rgb = RGBColor(71, 85, 105)
            elif col_idx == 2:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(10)
                run.font.color.rgb = RGBColor(30, 64, 175)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(31, 41, 55)
            run.font.name = "Times New Roman"

    p_spacer2 = doc.add_paragraph()
    p_spacer2.paragraph_format.space_before = Pt(0)
    p_spacer2.paragraph_format.space_after = Pt(4)

    # 10.2.1 Quy trình Vận hành Agile Hàng tuần
    add_p("Quy trình Thực thi Agile/Scrum Hàng tuần trong Dự án:", 
          space_before=6, space_after=4, bold=True, font_size=12, color=RGBColor(15, 44, 89))

    add_bullet(bold_prefix="• Sprint Planning (Kế hoạch Sprint): ",
               text="Tổ chức vào 08h00 sáng Thứ Hai đầu mỗi Sprint. Toàn bộ 7 thành viên tham gia phân rã User Stories từ Product Backlog "
                    "thành các công việc kỹ thuật cụ thể (Technical Tasks) trên bảng Agile Kanban, thống nhất trọng số Story Points và giao quyền "
                    "chủ động thực hiện cho các thành viên.",
               space_after=4)

    add_bullet(bold_prefix="• Daily Standup (Họp nhanh tiến độ 15 phút): ",
               text="Diễn ra định kỳ đúng 15 phút vào 20h00 các buổi tối Thứ Hai, Thứ Tư, Thứ Sáu thông qua Google Meet/Discord. Mỗi thành viên lần lượt "
                    "trả lời 3 câu hỏi cốt lõi: (1) Đã hoàn thành công việc gì từ buổi trước? (2) Dự kiến hoàn thành công việc gì tiếp theo? "
                    "(3) Có gặp khó khăn hoặc trở ngại kỹ thuật (blockers) nào cần nhóm hỗ trợ tháo gỡ hay không?",
               space_after=4)

    add_bullet(bold_prefix="• Sprint Review & Retrospective (Đánh giá & Rút kinh nghiệm): ",
               text="Diễn ra vào chiều Chủ Nhật cuối mỗi Sprint. Nhóm tiến hành trình diễn demo trực tiếp các tính năng phần mềm đã hoàn thành, "
                    "đối chiếu tính chính xác của dữ liệu tồn kho và các bút toán hạch toán kế toán. Sau đó, tiến hành họp Retrospective để phân tích "
                    "các điểm làm tốt (What went well), các điểm tồn tại cần cải tiến (What can be improved) và thống nhất giải pháp áp dụng ngay cho Sprint kế tiếp.",
               space_after=8)

    # Bảng phân rã chi tiết Sprint Tasks (Làm nổi bật Nguyễn Hải Đăng & Đặng Trà My)
    add_p("Bảng 10.3: Ma trận Phân rã Công việc Chi tiết theo Từng Sprint (WBS Matrix)", 
          space_before=6, space_after=4, bold=True, italic=True, font_size=11, color=RGBColor(30, 64, 175), align=WD_ALIGN_PARAGRAPH.CENTER)

    table_wbs = doc.add_table(rows=5, cols=4)
    table_wbs.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_wbs.autofit = False
    set_table_borders(table_wbs, color="CBD5E1", sz="4")

    headers_wbs = ["Giai đoạn", "Công việc Cốt lõi / Then chốt (Core Tasks)", "Công việc Hỗ trợ / Phụ trợ (Support Tasks)", "Điều phối & Nghiệm thu"]
    widths_wbs = [Inches(1.0), Inches(2.3), Inches(1.8), Inches(1.4)]

    for col_idx, text in enumerate(headers_wbs):
        cell = table_wbs.cell(0, col_idx)
        cell.width = widths_wbs[col_idx]
        set_cell_background(cell, "0F2C59")
        set_cell_margins(cell, top=120, bottom=120, left=100, right=100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(10.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    wbs_data = [
        ("Sprint 1\n(Tuần 1–2)", 
         "★ Nguyễn Hải Đăng (Tech Lead):\n"
         "- Thiết kế kiến trúc tổng thể MVC & luồng dữ liệu Node.js.\n"
         "- Thiết kế CSDL SQL Server 12 bảng, tạo khóa ngoại & index.\n"
         "- Lập trình xác thực JWT & bảo mật middleware RBAC.\n"
         "• Chu Ngọc Hải: Script tạo bảng SSMS & Seeding CSDL.\n"
         "• Lê Thành Long: Dựng UI Quản lý Danh mục & Sản phẩm.",
         "• Đặng Trà My (Tester & Doc):\n"
         "- Chuẩn bị dữ liệu mẫu (mock data 50 sản phẩm, hình ảnh, size/màu).\n"
         "- Test chức năng đăng nhập, kiểm tra thông báo lỗi validation UI.\n"
         "- Ghi chép biên bản họp Sprint Planning.",
         "• Lê Thị Duyên (PO):\n"
         "- Phê duyệt đặc tả Product Backlog.\n"
         "- Nghiệm thu module Đăng nhập & CRUD Sản phẩm."),

        ("Sprint 2\n(Tuần 3–4)", 
         "★ Nguyễn Hải Đăng (Tech Lead):\n"
         "- Xây dựng kiến trúc xử lý giao dịch đơn mua PO và phiếu nhập.\n"
         "- Xử lý trigger/logic tự động tăng số lượng tồn kho tức thời.\n"
         "- Viết hàm sinh công nợ phải trả tự động vào TK 331.\n"
         "• Chu Ngọc Hải: API Đơn mua PO, Nhà cung cấp, Phiếu 01-VT.\n"
         "• Lê Thành Long: Giao diện nhập đơn mua hàng và xem phiếu nhập.",
         "• Đặng Trà My (Tester & Doc):\n"
         "- Nhập liệu danh sách 15 nhà cung cấp mẫu.\n"
         "- Viết test case kiểm thử luồng tạo đơn mua hàng và nhập kho.\n"
         "- Chụp ảnh giao diện phiếu nhập 01-VT lưu tài liệu.",
         "• Lê Thị Duyên (PO):\n"
         "- Kiểm tra quy chuẩn biểu mẫu 01-VT theo TT133.\n"
         "- Nghiệm thu luồng tăng tồn kho và công nợ NCC."),

        ("Sprint 3\n(Tuần 5–6)", 
         "★ Nguyễn Hải Đăng (Tech Lead):\n"
         "- Trực tiếp thiết kế thuật toán POS bán lẻ: quét barcode, tính giỏ hàng.\n"
         "- Lập trình cơ chế tự động trừ tồn kho thời gian thực, chống âm kho.\n"
         "- Xử lý công thức chiết khấu VIP, thuế VAT 8%-10% và sinh nợ TK 131.\n"
         "• Đàm Thị Thùy Dung: Logic kiểm kê kho & xử lý chênh lệch.\n"
         "• Lê Thành Long: Màn hình POS bán hàng chuyên dụng tại quầy.",
         "• Đặng Trà My (Tester & Doc):\n"
         "- Test thao tác quét barcode, thêm bớt sản phẩm trên POS.\n"
         "- Kiểm thử trường hợp thanh toán thừa/thiếu tiền khách đưa.\n"
         "- Hỗ trợ nhập kết quả kiểm kê kho mẫu.",
         "• Lê Thị Duyên (PO):\n"
         "- Nghiệm thu tính năng POS bán hàng tại quầy.\n"
         "- Kiểm tra biên bản kiểm kê và đối soát chênh lệch kho."),

        ("Sprint 4\n(Tuần 7–8)", 
         "★ Nguyễn Hải Đăng (Tech Lead):\n"
         "- Tích hợp toàn diện luồng dữ liệu tài chính kế toán theo TT133.\n"
         "- Thuật toán tổng hợp Bảng cân đối tài khoản và Báo cáo KQKD.\n"
         "- Tối ưu hóa hiệu năng, review code toàn hệ thống và bảo mật.\n"
         "• Trần Thanh Phong: API Sổ quỹ TK 111, 112 & Sổ công nợ.\n"
         "• Lê Thành Long: Màn hình Sổ quỹ Thu/Chi và Báo cáo tài chính.",
         "• Đặng Trà My (Tester & Doc):\n"
         "- Kiểm thử tổng thể (Regression Test) toàn bộ kịch bản nghiệp vụ.\n"
         "- Hỗ trợ rà soát lỗi chính tả, căn chỉnh định dạng báo cáo Word.\n"
         "- Đóng góp tài liệu Hướng dẫn sử dụng cho người dùng cuối.",
         "• Lê Thị Duyên (PO):\n"
         "- Nghiệm thu tổng thể toàn bộ hệ thống phần mềm.\n"
         "- Tổng hợp báo cáo tổng kết Word và chuẩn bị bảo vệ.")
    ]

    for row_idx, row_data in enumerate(wbs_data, start=1):
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, val in enumerate(row_data):
            cell = table_wbs.cell(row_idx, col_idx)
            cell.width = widths_wbs[col_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(10)
                run.font.color.rgb = RGBColor(15, 44, 89)
            elif col_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.size = Pt(9.2)
                run.font.color.rgb = RGBColor(15, 23, 42)
            elif col_idx == 2:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.size = Pt(9.2)
                run.font.color.rgb = RGBColor(71, 85, 105)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.size = Pt(9.2)
                run.font.color.rgb = RGBColor(30, 64, 175)
            run.font.name = "Times New Roman"

    p_spacer3 = doc.add_paragraph()
    p_spacer3.paragraph_format.space_before = Pt(0)
    p_spacer3.paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # 10.3. PHÂN CÔNG TRÁCH NHIỆM NHÓM (7 THÀNH VIÊN)
    # -------------------------------------------------------------
    add_p("10.3. Phân công Trách nhiệm Nhóm (7 Thành viên)", 
          space_before=14, space_after=6, bold=True, font_size=15, color=RGBColor(15, 44, 89))

    add_p(
        "Nhằm tối ưu hóa năng lực chuyên môn và đảm bảo dự án hoàn thành đúng tiến độ với chất lượng phần mềm cao nhất, "
        "nhóm 7 thành viên được phân định trách nhiệm rõ ràng. Trong đó, Trưởng nhóm Lê Thị Duyên giữ vai trò định hướng nghiệp vụ "
        "và nghiệm thu sản phẩm; Tech Lead Nguyễn Hải Đăng gánh vác toàn bộ các phân hệ kỹ thuật phức tạp và quan trọng nhất "
        "(Kiến trúc, CSDL 12 bảng, Bảo mật phân quyền, POS Bán lẻ và Tích hợp Kế toán TT133); "
        "thành viên Đặng Trà My đảm nhận các công việc phụ trợ vừa sức (Kiểm thử chức năng cơ bản, chuẩn bị dữ liệu mẫu và tài liệu):",
        space_before=2, space_after=6, font_size=11.5
    )

    # Bảng 10.4: Phân công trách nhiệm 7 thành viên
    add_p("Bảng 10.4: Bảng Phân công Chi tiết Trách nhiệm 7 Thành viên trong Dự án", 
          space_before=6, space_after=4, bold=True, italic=True, font_size=11, color=RGBColor(30, 64, 175), align=WD_ALIGN_PARAGRAPH.CENTER)

    table_members = doc.add_table(rows=8, cols=4)
    table_members.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_members.autofit = False
    set_table_borders(table_members, color="CBD5E1", sz="4")

    headers_members = ["STT", "Họ và tên", "Vai trò chính", "Nhiệm vụ phụ trách cụ thể & Mức độ ưu tiên"]
    widths_members = [Inches(0.6), Inches(1.8), Inches(1.8), Inches(2.3)]

    for col_idx, text in enumerate(headers_members):
        cell = table_members.cell(0, col_idx)
        cell.width = widths_members[col_idx]
        set_cell_background(cell, "0F2C59")
        set_cell_margins(cell, top=120, bottom=120, left=100, right=100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    members_data = [
        ("1", 
         "Lê Thị Duyên\n(Trưởng nhóm)", 
         "Product Owner (PO) /\nBusiness Analyst (BA)", 
         "• Quản lý phạm vi yêu cầu nghiệp vụ hệ thống (Scope Management).\n"
         "• Xác định Product Backlog, ưu tiên User Stories từng Sprint.\n"
         "• Nghiệm thu tính đúng đắn của từng chức năng theo nghiệp vụ thực tế.\n"
         "• Chủ trì tổng hợp, hoàn thiện và duyệt toàn bộ báo cáo Word của nhóm.\n"
         "★ Tầm quan trọng: Rất quan trọng (Lãnh đạo dự án & Quản lý phạm vi)."),

        ("2", 
         "Chu Ngọc Hải", 
         "Database & Backend Dev", 
         "• Hỗ trợ triển khai CSDL 12 bảng trên SQL Server Management Studio (SSMS).\n"
         "• Lập trình RESTful API phân hệ Quản lý Nhà cung cấp và Đơn mua hàng (PO).\n"
         "• Xây dựng quy trình lập Phiếu nhập kho 01-VT và sinh nợ TK 331 tự động.\n"
         "★ Tầm quan trọng: Quan trọng (Phân hệ Mua hàng & Nhập kho)."),

        ("3", 
         "Đàm Thị Thùy Dung", 
         "Scrum Master &\nBackend Dev", 
         "• Điều phối các nghi lễ Scrum: Sprint Planning, Daily Standup, Retrospective.\n"
         "• Lập trình phân hệ Quản lý Kho, Phiếu xuất kho 02-VT.\n"
         "• Xây dựng chức năng Kiểm kê kho định kỳ và lập Biên bản kiểm kê.\n"
         "★ Tầm quan trọng: Quan trọng (Vận hành Scrum & Phân hệ Kho)."),

        ("4", 
         "Nguyễn Hải Đăng", 
         "Technical Lead /\nCore System & Architecture Dev", 
         "• Thiết kế kiến trúc tổng thể toàn hệ thống MVC (Model - View - Controller).\n"
         "• Thiết kế và chuẩn hóa CSDL Microsoft SQL Server 12 bảng, triggers, indexes.\n"
         "• Lập trình Core RESTful API, hệ thống xác thực JWT & bảo mật phân quyền RBAC.\n"
         "• Trực tiếp xây dựng phân hệ then chốt: Màn hình & Logic POS Bán lẻ tại quầy, thuật toán tự động trừ tồn kho, tính chiết khấu, VAT, nợ TK 131.\n"
         "• Thiết kế thuật toán tự động hạch toán kế toán theo chuẩn Thông tư 133.\n"
         "• Review chất lượng mã nguồn toàn đội và tháo gỡ các vướng mắc kỹ thuật phức tạp.\n"
         "★ Tầm quan trọng: Cốt lõi / Then chốt nhất (Trụ cột Kỹ thuật Hệ thống)."),

        ("5", 
         "Lê Thành Long", 
         "Frontend Developer", 
         "• Lập trình giao diện người dùng (View) bằng HTML5, CSS3 và Tailwind CSS.\n"
         "• Xây dựng giao diện tương tác cho màn hình POS bán lẻ tại quầy chuyên dụng.\n"
         "• Thiết kế giao diện Dashboard điều hành và màn hình Sổ quỹ Thu/Chi.\n"
         "★ Tầm quan trọng: Quan trọng (Giao diện Người dùng View)."),

        ("6", 
         "Trần Thanh Phong", 
         "Financial Backend Dev", 
         "• Lập trình hệ thống API phân hệ Sổ quỹ tiền mặt (TK 111) và ngân hàng (TK 112).\n"
         "• Xây dựng module hạch toán Phiếu Thu (01-TT), Phiếu Chi (02-TT) và quản lý công nợ.\n"
         "• Lập trình trích xuất dữ liệu Bảng cân đối tài khoản và Báo cáo KQKD TT133.\n"
         "★ Tầm quan trọng: Quan trọng (Phân hệ Tài chính & Sổ quỹ)."),

        ("7", 
         "Đặng Trà My", 
         "Tester / QA &\nHỗ trợ Tài liệu / Nhập liệu", 
         "• Viết kịch bản kiểm thử (Test cases) chức năng cơ bản theo đặc tả có sẵn.\n"
         "• Thực hiện kiểm thử giao diện thủ công (Manual UI Testing) trên các trình duyệt.\n"
         "• Chuẩn bị và nhập bộ dữ liệu mẫu (Mock data sản phẩm, khách hàng, nhà cung cấp).\n"
         "• Hỗ trợ chụp ảnh màn hình minh họa, định dạng báo cáo Word và hướng dẫn sử dụng.\n"
         "• Ghi chép biên bản cuộc họp Daily Standup và Sprint Retrospective.\n"
         "★ Tầm quan trọng: Bổ trợ / Vừa sức (Kiểm thử cơ bản, Nhập liệu & Tài liệu).")
    ]

    for row_idx, row_data in enumerate(members_data, start=1):
        # Special highlight for Nguyễn Hải Đăng (Row index 4)
        if row_idx == 4:
            bg_color = "EFF6FF" # Light blue highlight
        elif row_idx % 2 == 1:
            bg_color = "F8FAFC"
        else:
            bg_color = "FFFFFF"

        for col_idx, val in enumerate(row_data):
            cell = table_members.cell(row_idx, col_idx)
            cell.width = widths_members[col_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(10.5)
                run.font.color.rgb = RGBColor(15, 44, 89)
            elif col_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(10)
                if row_idx == 4:
                    run.font.color.rgb = RGBColor(30, 64, 175) # Nguyễn Hải Đăng
                elif row_idx == 1:
                    run.font.color.rgb = RGBColor(15, 44, 89)  # Lê Thị Duyên
                else:
                    run.font.color.rgb = RGBColor(31, 41, 55)
            elif col_idx == 2:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(71, 85, 105)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(31, 41, 55)
            run.font.name = "Times New Roman"

    p_spacer4 = doc.add_paragraph()
    p_spacer4.paragraph_format.space_before = Pt(0)
    p_spacer4.paragraph_format.space_after = Pt(4)

    # 10.3.1 Bảng Ma trận Trách nhiệm RACI
    add_p("Bảng 10.5: Ma trận Phân nhiệm Trách nhiệm RACI theo Từng Module Nghiệp vụ", 
          space_before=6, space_after=4, bold=True, italic=True, font_size=11, color=RGBColor(30, 64, 175), align=WD_ALIGN_PARAGRAPH.CENTER)

    raci_note = (
        "Quy ước ma trận RACI: "
        "R (Responsible - Người trực tiếp thực hiện); "
        "A (Accountable - Người chịu trách nhiệm phê duyệt cuối cùng); "
        "C (Consulted - Người tham gia tư vấn chuyên môn); "
        "I (Informed - Người nhận thông tin/kiểm thử hỗ trợ)."
    )
    add_p(raci_note, space_before=0, space_after=4, italic=True, font_size=9.5, color=RGBColor(100, 116, 139), align=WD_ALIGN_PARAGRAPH.CENTER)

    table_raci = doc.add_table(rows=9, cols=8)
    table_raci.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_raci.autofit = False
    set_table_borders(table_raci, color="CBD5E1", sz="4")

    headers_raci = ["Phân hệ / Nghiệp vụ", "Duyên (PO)", "Hải (BE)", "Dung (SM)", "Đăng (Tech)", "Long (FE)", "Phong (Fin)", "My (QA)"]
    widths_raci = [Inches(1.7), Inches(0.68), Inches(0.72), Inches(0.65), Inches(0.65), Inches(0.65), Inches(0.65), Inches(0.65)]

    for col_idx, text in enumerate(headers_raci):
        cell = table_raci.cell(0, col_idx)
        cell.width = widths_raci[col_idx]
        set_cell_background(cell, "0F2C59")
        set_cell_margins(cell, top=100, bottom=100, left=60, right=60)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(9.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    raci_data = [
        ("1. Kiến trúc MVC & CSDL 12 bảng", "A", "R (Hỗ trợ)", "C", "R (Chính Core)", "I", "C", "I"),
        ("2. Xác thực JWT & Phân quyền RBAC", "A", "I", "C", "R (Chính Core)", "R", "I", "I"),
        ("3. Quản lý Sản phẩm & Barcode", "A", "R (Chính)", "I", "C (Review)", "R (Giao diện)", "I", "R (Nhập dữ liệu)"),
        ("4. Đơn Mua PO & Nhập kho 01-VT", "A", "R (Chính)", "I", "C (Review)", "R (Giao diện)", "C", "I (Test luồng)"),
        ("5. POS Bán lẻ & Trừ tồn kho tức thời", "A", "I", "C", "R (Chính Core)", "R (Giao diện)", "C", "I (Test giỏ hàng)"),
        ("6. Quản lý Xuất kho & Kiểm kê định kỳ", "A", "I", "R (Chính)", "C (Review)", "R (Giao diện)", "C", "I (Test biên bản)"),
        ("7. Sổ quỹ Thu/Chi (111, 112) & Công nợ", "A", "I", "I", "C (Kiến trúc)", "R (Giao diện)", "R (Chính)", "I (Nhập mock data)"),
        ("8. Báo cáo Tài chính & Bảng Cân đối TT133", "A", "I", "I", "R (Tích hợp Core)", "R (Giao diện)", "R (Chính)", "I (Định dạng Word)")
    ]

    for row_idx, row_data in enumerate(raci_data, start=1):
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, val in enumerate(row_data):
            cell = table_raci.cell(row_idx, col_idx)
            cell.width = widths_raci[col_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=80, bottom=80, left=60, right=60)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.1
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.bold = True
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(15, 44, 89)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(val)
                run.font.size = Pt(9)
                if "R (Chính)" in val:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(185, 28, 28) # Red/Bold for primary responsible
                elif "A" in val:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(30, 64, 175) # Blue for Accountable
                elif "R" in val:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(15, 23, 42)
                else:
                    run.font.color.rgb = RGBColor(100, 116, 139)
            run.font.name = "Times New Roman"

    p_spacer5 = doc.add_paragraph()
    p_spacer5.paragraph_format.space_before = Pt(0)
    p_spacer5.paragraph_format.space_after = Pt(4)

    # 10.3.2 Phân tích Đóng góp Chuyên biệt
    add_p("Phân tích Cơ chế Phối hợp & Trách nhiệm Chuyên biệt của các Thành viên:", 
          space_before=4, space_after=4, bold=True, font_size=12, color=RGBColor(15, 44, 89))

    add_bullet(bold_prefix="1. Vai trò Trụ cột Kỹ thuật của Nguyễn Hải Đăng (Tech Lead): ",
               text="Nguyễn Hải Đăng chịu trách nhiệm là 'kiến trúc sư trưởng' của toàn bộ giải pháp kỹ thuật. Đăng trực tiếp xử lý các bài toán "
                    "hóc búa nhất: dựng toàn bộ khung MVC từ gốc, thiết kế quan hệ 12 bảng CSDL SQL Server, xây dựng cơ chế xác thực bảo mật JWT, "
                    "lập trình lõi POS bán hàng (thuật toán tính tiền, trừ kho, chống âm kho) và thiết kế kiến trúc hạch toán kế toán theo Thông tư 133. "
                    "Đăng cũng đóng vai trò Tech Lead duyệt code (Code Review), kiểm soát chất lượng kỹ thuật và hỗ trợ gỡ lỗi chuyên sâu cho toàn đội.",
               space_after=4)

    add_bullet(bold_prefix="2. Vai trò Lãnh đạo & Quản lý Dự án của Lê Thị Duyên (Trưởng nhóm / PO): ",
               text="Lê Thị Duyên giữ vai trò then chốt trong định hướng sản phẩm và quản lý nhóm. Duyên làm việc trực tiếp với yêu cầu nghiệp vụ thực tế, "
                    "chuẩn hóa các quy tắc kế toán và bán lẻ thành các User Story cụ thể; phân công nhiệm vụ và theo dõi sát sao tiến độ bàn giao của từng thành viên; "
                    "chủ trì nghiệm thu các sản phẩm sau mỗi Sprint và trực tiếp tổng hợp, biên tập và hoàn thiện hồ sơ báo cáo Word chính thức của dự án.",
               space_after=4)

    add_bullet(bold_prefix="3. Vai trò Bổ trợ Thiết thực của Đặng Trà My (Tester / QA & Tài liệu): ",
               text="Đặng Trà My đảm nhận các nhiệm vụ phụ trợ nhưng đóng vai trò quan trọng trong việc hoàn thiện sản phẩm: viết các kịch bản kiểm thử "
                    "(test cases) cơ bản cho từng màn hình, tiến hành kiểm tra giao diện thủ công (manual UI test) trên các trình duyệt để phát hiện lỗi hiển thị, "
                    "chuẩn bị và nhập liệu bộ dữ liệu demo sinh động (hàng chục sản phẩm, size/màu, hình ảnh thời trang, khách hàng mẫu); "
                    "hỗ trợ định dạng văn bản báo cáo Word, tổng hợp hình ảnh giao diện và ghi chép biên bản các cuộc họp nội bộ.",
               space_after=8)

    # -------------------------------------------------------------
    # 10.4. TIÊU CHUẨN ĐÁNH GIÁ, QUẢN LÝ RỦI RO & CAM KẾT CHẤT LƯỢNG
    # -------------------------------------------------------------
    add_p("10.4. Tiêu chuẩn Đánh giá Chất lượng, Quản lý Rủi ro & Cam kết Bàn giao", 
          space_before=14, space_after=6, bold=True, font_size=15, color=RGBColor(15, 44, 89))

    add_p(
        "Để đảm bảo hệ thống phần mềm D&D Fashion ERP vận hành tuyệt đối chính xác, bảo mật và đáp ứng đầy đủ yêu cầu "
        "kỹ thuật lẫn nghiệp vụ kế toán thực tế, nhóm thiết lập các tiêu chuẩn kiểm soát chất lượng và kế hoạch phòng ngừa rủi ro cụ thể:",
        space_before=2, space_after=6, font_size=11.5
    )

    # Bullet points for DoD and Risk
    add_bullet(bold_prefix="• Định nghĩa Hoàn thành (Definition of Done - DoD): ",
               text="Một tính năng chỉ được xem là hoàn thành khi: (1) Mã nguồn tuân thủ coding standards và được Tech Lead Nguyễn Hải Đăng review; "
                    "(2) Đã vượt qua 100% test cases do Tester Đặng Trà My kiểm thử độc lập; (3) Dữ liệu tồn kho và bút toán nợ/có hạch toán cân đối chuẩn xác; "
                    "(4) Được Product Owner Lê Thị Duyên trực tiếp nghiệm thu đạt yêu cầu nghiệp vụ.",
               space_after=4)

    add_bullet(bold_prefix="• Kế hoạch Quản lý Rủi ro (Risk Management Matrix): ",
               text="Nhóm chủ động nhận diện các rủi ro tiềm ẩn: (1) Xung đột mã nguồn trên Git -> Xử lý bằng quy tắc Git Flow nghiêm ngặt, chỉ Tech Lead merge vào nhánh main; "
                    "(2) Sai lệch dữ liệu kho khi bán đồng thời tại POS -> Xử lý bằng database transaction và lock row trên SQL Server; "
                    "(3) Chậm tiến độ cá nhân -> Theo dõi qua Daily Standup 3 buổi/tuần để kịp thời tái phân bổ nguồn lực.",
               space_after=8)

    # Summary callout
    final_text = (
        "KẾT LUẬN & CAM KẾT BÀN GIAO DỰ ÁN:\n"
        "Bản Kế hoạch Lập trình 8 tuần theo mô hình Scrum/Agile với kiến trúc MVC và phân công trách nhiệm chi tiết cho 7 thành viên "
        "là kim chỉ nam xuyên suốt quá trình thực hiện dự án Hệ thống Quản lý Cửa hàng Thời trang D&D. Toàn thể 7 thành viên cam kết "
        "tuân thủ nghiêm túc các mốc thời gian Sprint, tiêu chuẩn mã nguồn và quy trình kiểm thử để bàn giao một sản phẩm phần mềm "
        "hoàn chỉnh, chạy ổn định, giao diện đẹp mắt và đáp ứng trọn vẹn nghiệp vụ quản lý bán lẻ và kế toán theo Thông tư 133/2016/TT-BTC."
    )
    add_callout("CAM KẾT CHẤT LƯỢNG VÀ TIẾN ĐỘ TỪ TOÀN BỘ 7 THÀNH VIÊN", final_text, border_color="1E40AF", bg_color="F8FAFC")

    # Save document
    output_filename = "Ke_Hoach_Lap_Trinh_Project_D&D_Fashion.docx"
    doc.save(output_filename)
    print(f"Document successfully created and saved as: {output_filename}")

if __name__ == "__main__":
    create_document()
