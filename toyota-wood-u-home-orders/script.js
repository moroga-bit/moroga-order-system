// 発注書作成システムのメインスクリプト

class OrderFormManager {
    constructor() {
        this.initializeEventListeners();
        this.setDefaultDate();
        // 初期行を追加 (5行)
        for (let i = 0; i < 5; i++) {
            this.addItemRow();
        }
        this.calculateTotals();
        this.checkForEditMode();
    }

    initializeEventListeners() {
        console.log('イベントリスナー初期化開始');

        // 商品追加ボタン
        const addItemBtn = document.getElementById('addItemBtn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                this.addItemRow();
            });
        }

        // 商品削除ボタン（動的に追加される）
        document.getElementById('itemsTableBody').addEventListener('click', (e) => {
            if (e.target.closest('.remove-item-btn')) {
                this.removeItemRow(e.target.closest('.remove-item-btn'));
            }
        });

        // 数量・単価変更時の計算
        document.getElementById('itemsTableBody').addEventListener('input', (e) => {
            if (e.target.name === 'itemQuantity[]' || e.target.name === 'itemPrice[]') {
                this.calculateItemSubtotal(e.target);
                this.calculateTotals();
            }
        });

        // Enterキーでのフォーカス移動
        document.getElementById('itemsTableBody').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentInput = e.target;
                const currentRow = currentInput.closest('tr');
                const inputs = Array.from(currentRow.querySelectorAll('input'));
                const currentIndex = inputs.indexOf(currentInput);

                if (currentIndex < inputs.length - 2) { // 最後の入力フィールド（小計）の一つ前まで
                    // 次のフィールドへ移動
                    inputs[currentIndex + 1].focus();
                } else {
                    // 次の行へ移動、なければ新規追加
                    const nextRow = currentRow.nextElementSibling;
                    if (nextRow) {
                        const nextRowInputs = nextRow.querySelectorAll('input');
                        if (nextRowInputs.length > 0) {
                            nextRowInputs[0].focus();
                        }
                    } else {
                        // 新しい行を追加してフォーカス
                        this.addItemRow();
                        const newRows = document.getElementById('itemsTableBody').querySelectorAll('tr');
                        const newRow = newRows[newRows.length - 1];
                        newRow.querySelector('input').focus();
                    }
                }
            }
        });

        // プレビューボタン
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.showPreview();
            });
        }

        // プレビュー閉じるボタン
        const closePreviewBtn = document.getElementById('closePreviewBtn');
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => {
                this.hidePreview();
            });
        }

        // プレビューモーダルの背景クリックで閉じる
        const previewArea = document.getElementById('previewArea');
        if (previewArea) {
            previewArea.addEventListener('click', (e) => {
                if (e.target === previewArea || e.target.classList.contains('modal-backdrop')) {
                    this.hidePreview();
                }
            });
        }

        // プレビュー内のPDF生成ボタン
        const generatePdfFromPreviewBtn = document.getElementById('generatePdfFromPreviewBtn');
        if (generatePdfFromPreviewBtn) {
            generatePdfFromPreviewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateHighQualityPDFFromPreview();
            });
        }

        // 発注書管理登録ボタン
        const registerToManagementBtn = document.getElementById('registerToManagementBtn');
        if (registerToManagementBtn) {
            registerToManagementBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.registerToManagement();
            });
        }

        // リセットボタン
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetForm();
            });
        }

        console.log('イベントリスナー初期化完了');
    }

    // 日本語フォントをjsPDFに埋め込む
    async embedJapaneseFont(pdf) {
        const fontUrls = [
            'https://fonts.gstatic.com/s/notosansjp/v52/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.ttf',
            'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansJP/NotoSansJP-Regular.ttf'
        ];

        for (const fontUrl of fontUrls) {
            try {
                const res = await fetch(fontUrl, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const buf = await res.arrayBuffer();
                let binary = '';
                const bytes = new Uint8Array(buf);
                const chunkSize = 0x8000;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    const chunk = bytes.subarray(i, i + chunkSize);
                    binary += String.fromCharCode.apply(null, chunk);
                }
                const base64 = btoa(binary);

                pdf.addFileToVFS('NotoSansJP-Regular.ttf', base64);
                pdf.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
                pdf.setFont('NotoSansJP', 'normal');
                return;
            } catch (err) {
                console.warn(`フォント読み込み失敗: ${fontUrl}`, err);
            }
        }
        pdf.setFont('helvetica', 'normal');
    }

    // 現在のフォームDOMから商品行を順序通りに取得
    getItemsFromDOM() {
        const rows = Array.from(document.querySelectorAll('#itemsTableBody tr'));
        return rows.map(row => {
            const get = (selector) => {
                const el = row.querySelector(selector);
                return el ? el.value : '';
            };
            const quantity = parseFloat(get('input[name="itemQuantity[]"]') || '0') || 0;
            const price = parseFloat(get('input[name="itemPrice[]"]') || '0') || 0;
            return {
                projectName: get('input[name="itemProjectName[]"]'),
                name: get('input[name="itemName[]"]'),
                unit: get('input[name="itemUnit[]"]'),
                quantity,
                price,
                subtotal: quantity * price,remarks: get('input[name="itemRemarks[]"]')
            };
        });
    }

    // ベクター（テキスト）でPDFを生成
    async generateHighQualityPDFFromPreview() {
        await this.generateVectorPDF();
    }

    async generateVectorPDF() {
        try {
            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDFライブラリが読み込まれていません');
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            try {
                await this.embedJapaneseFont(pdf);
            } catch (fontError) {
                console.warn('日本語フォント読み込み失敗、英語フォントで継続:', fontError);
                pdf.setFont('helvetica', 'normal');
            }

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            let y = margin;

            const formData = this.getFormData();
            const items = this.getItemsFromDOM();

            // ヘッダー背景
            pdf.setFillColor(37, 99, 235); // Primary Blue
            pdf.rect(0, 0, pageWidth, 35, 'F');

            // ロゴエリア
            pdf.setFillColor(255, 165, 0); // Orange
            pdf.rect(10, 5, 60, 25, 'F');

            // ロゴテキスト
            pdf.setFontSize(16);
            pdf.setTextColor(255, 255, 255);
            pdf.text('MOROGA', 40, 20, { align: 'center' });

            // 会社名
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            pdf.text('株式会社諸鹿彩色', 40, 12, { align: 'center' });

            // タイトル
            pdf.setFontSize(24);
            pdf.setTextColor(255, 255, 255);
            pdf.text('発注書', pageWidth - 30, 20, { align: 'center' });
            y = 45;

            // 発注書番号
            const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
            pdf.setFontSize(10);
            pdf.setTextColor(37, 99, 235);
            pdf.text(`発注書番号: ${orderNumber}`, pageWidth / 2, y, { align: 'center' });
            y += 20;

            // 会社情報セクション
            const colLeft = margin;
            const colRight = pageWidth / 2 + 5;

            // 発注元
            pdf.setFillColor(248, 250, 252);
            pdf.rect(colLeft - 5, y - 5, pageWidth / 2 - 10, 45, 'F');
            pdf.setLineWidth(0.5);
            pdf.setDrawColor(226, 232, 240);
            pdf.rect(colLeft - 5, y - 5, pageWidth / 2 - 10, 45);

            pdf.setFontSize(12);
            pdf.setTextColor(37, 99, 235);
            pdf.text('発注元', colLeft, y);
            y += 8;

            pdf.setFontSize(10);
            pdf.setTextColor(55, 65, 81);
            const leftLines = [
                `${formData.companyName}`,
                `${formData.companyAddress}`,
                `TEL: ${formData.companyPhone}`,
                `Email: ${formData.companyEmail}`
            ];
            leftLines.forEach((t, i) => {
                pdf.text(t, colLeft, y + i * 5);
            });

            // 発注先
            pdf.setFillColor(248, 250, 252);
            pdf.rect(colRight - 5, y - 8, pageWidth / 2 - 10, 45, 'F');
            pdf.setDrawColor(226, 232, 240);
            pdf.rect(colRight - 5, y - 8, pageWidth / 2 - 10, 45);

            pdf.setFontSize(12);
            pdf.setTextColor(37, 99, 235);
            pdf.text('発注先', colRight, y - 8);

            pdf.setFontSize(10);
            pdf.setTextColor(55, 65, 81);
            const rightLines = [
                `${formData.supplierName || ''}`,
                `${formData.supplierAddress || ''}`,
                formData.contactPerson ? `担当者: ${formData.contactPerson}` : '',
                // formData.supplierPhone ? `TEL: ${formData.supplierPhone}` : ''
            ].filter(Boolean);

            rightLines.forEach((t, i) => {
                pdf.text(t, colRight, y + i * 5);
            });

            y += 15;

            // 発注詳細
            pdf.setFillColor(37, 99, 235);
            pdf.rect(margin, y - 5, pageWidth - margin * 2, 15, 'F');

            pdf.setFontSize(10);
            pdf.setTextColor(255, 255, 255);
            const detailText = [
                `発注日: ${formData.orderDate}`,
                formData.completionMonth ? `工事完了月: ${formData.completionMonth}` : '',
                `支払条件: ${formData.paymentTerms}`
            ].filter(Boolean).join('  |  ');

            pdf.text(detailText, margin + 5, y + 2);
            y += 20;

            // テーブル
            const innerWidth = pageWidth - margin * 2;
            const cols = [
                { title: '工事件名', ratio: 0.35 },
                { title: '商品名', ratio: 0.30 },
                { title: '数量', ratio: 0.15 },
                { title: '単価', ratio: 0.10 },
                { title: '小計', ratio: 0.10 }
            ].map(c => ({ title: c.title, width: innerWidth * c.ratio }));

            const drawTableHeader = () => {
                pdf.setFillColor(37, 99, 235);
                pdf.rect(margin, y - 5, innerWidth, 8, 'F');

                let x = margin;
                pdf.setFontSize(9);
                pdf.setTextColor(255, 255, 255);
                cols.forEach(c => {
                    pdf.text(c.title, x + 2, y);
                    x += c.width;
                });
                y += 6;
            };

            drawTableHeader();

            let subtotal = 0;
            for (let i = 0; i < items.length; i++) {
                const { projectName, name, quantity, unit, price, subtotal: rowSubtotal } = items[i];

                // 空行スキップ
                if (!projectName && !name) continue;

                subtotal += rowSubtotal;

                const cells = [
                    { text: projectName || '', align: 'left' },
                    { text: name, align: 'left' },
                    { text: `${quantity} ${unit}`, align: 'left' },
                    { text: `¥${price.toLocaleString()}`, align: 'right' },
                    { text: `¥${rowSubtotal.toLocaleString()}`, align: 'right' }
                ];

                const rowHeight = 8;

                if (y + rowHeight > pageHeight - margin - 40) {
                    pdf.addPage();
                    y = margin + 10;
                    drawTableHeader();
                }

                if (i % 2 === 0) {
                    pdf.setFillColor(248, 250, 252);
                    pdf.rect(margin, y - 4, innerWidth, rowHeight, 'F');
                }

                pdf.setDrawColor(226, 232, 240);
                pdf.line(margin, y + rowHeight - 4, margin + innerWidth, y + rowHeight - 4);

                let cx = margin;
                pdf.setFontSize(9);
                pdf.setTextColor(55, 65, 81);

                for (let idx = 0; idx < cells.length; idx++) {
                    const width = cols[idx].width;
                    const cell = cells[idx];
                    if (cell.align === 'right') {
                        pdf.text(cell.text, cx + width - 2, y + 1, { align: 'right' });
                    } else {
                        // 簡易的な切り詰め
                        let text = cell.text;
                        if (text.length > 20 && idx < 2) text = text.substring(0, 18) + '...';
                        pdf.text(text, cx + 2, y + 1);
                    }
                    cx += width;
                }

                y += rowHeight;
            }

            y += 5;

            // 合計
            const tax = Math.ceil(subtotal * 0.1);
            const total = subtotal + tax;

            pdf.setFillColor(37, 99, 235);
            pdf.rect(pageWidth - margin - 80, y, 80, 25, 'F');

            pdf.setFontSize(10);
            pdf.setTextColor(255, 255, 255);
            y += 6;
            pdf.text(`小計: ¥${subtotal.toLocaleString()}`, pageWidth - margin - 5, y, { align: 'right' });
            y += 6;
            pdf.text(`消費税(10%): ¥${tax.toLocaleString()}`, pageWidth - margin - 5, y, { align: 'right' });
            y += 7;
            pdf.setFontSize(12);
            pdf.setFont('NotoSansJP', 'bold');
            pdf.text(`合計金額: ¥${total.toLocaleString()}`, pageWidth - margin - 5, y, { align: 'right' });
            pdf.setFont('NotoSansJP', 'normal');

            // 備考
            if (formData.remarks) {
                y += 15;
                pdf.setFontSize(10);
                pdf.setTextColor(37, 99, 235);
                pdf.text('備考:', margin, y);
                y += 5;
                pdf.setTextColor(55, 65, 81);
                const remarksLines = pdf.splitTextToSize(formData.remarks, pageWidth - margin * 2);
                pdf.text(remarksLines, margin, y);
            }

            // フッター
            y = pageHeight - 30;
            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139);
            pdf.text('この度はお取引いただき、誠にありがとうございます。', pageWidth - margin, y, { align: 'right' });

            // ハンコ
            const staffMember = formData.staffMember ? formData.staffMember.trim() : '';
            if (staffMember === '諸鹿大介' || staffMember === '奥山竜矢') {
                const stampY = y + 10;
                pdf.setFillColor(220, 38, 38);
                pdf.circle(pageWidth - 20, stampY, 7, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(7);
                const nameParts = staffMember === '諸鹿大介' ? ['諸鹿', '大介'] : ['奥山', '竜矢'];
                pdf.text(nameParts[0], pageWidth - 20, stampY - 1, { align: 'center' });
                pdf.text(nameParts[1], pageWidth - 20, stampY + 3, { align: 'center' });
            }

            const fileName = `発注書_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
        } catch (e) {
            console.error(e);
            alert('PDF生成エラー: ' + e.message);
        }
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('orderDate');
        if (dateInput) dateInput.value = today;
    }

    addItemRow() {
        const tbody = document.getElementById('itemsTableBody');
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" name="itemProjectName[]" placeholder="工事件名"></td>
            <td><input type="text" name="itemName[]" placeholder="商品名"></td>
            <td><input type="number" name="itemQuantity[]" min="1" placeholder="0"></td>
            <td><input type="text" name="itemUnit[]" placeholder="単位"></td>
            <td><input type="number" name="itemPrice[]" min="0" step="0.01" placeholder="0"></td>
            <td><input type="number" name="itemSubtotal[]" readonly placeholder="0"></td><td><input type="text" name="itemRemarks[]" placeholder="備考"></td>
            <td><button type="button" class="remove-item-btn" title="削除">×</button></td>
        `;
        tbody.appendChild(newRow);
    }

    removeItemRow(button) {
        const tbody = document.getElementById('itemsTableBody');
        if (tbody.children.length > 1) {
            button.closest('tr').remove();
            this.calculateTotals();
        } else {
            // 最後の1行は削除せずクリアする
            const row = button.closest('tr');
            row.querySelectorAll('input').forEach(input => input.value = '');
            this.calculateTotals();
        }
    }

    calculateItemSubtotal(input) {
        const row = input.closest('tr');
        const quantity = parseFloat(row.querySelector('input[name="itemQuantity[]"]').value) || 0;
        const price = parseFloat(row.querySelector('input[name="itemPrice[]"]').value) || 0;
        const subtotal = quantity * price;

        row.querySelector('input[name="itemSubtotal[]"]').value = subtotal > 0 ? subtotal : '';
    }

    calculateTotals() {
        const subtotalInputs = document.querySelectorAll('input[name="itemSubtotal[]"]');
        let subtotal = 0;

        subtotalInputs.forEach(input => {
            subtotal += parseFloat(input.value) || 0;
        });

        const tax = Math.ceil(subtotal * 0.1);
        const total = subtotal + tax;

        document.getElementById('subtotal').textContent = `¥${subtotal.toLocaleString()}`;
        document.getElementById('tax').textContent = `¥${tax.toLocaleString()}`;
        document.getElementById('total').textContent = `¥${total.toLocaleString()}`;

        // Update items table total
        const itemsTotalElement = document.getElementById('itemsTotal');
        if (itemsTotalElement) {
            itemsTotalElement.textContent = `¥${subtotal.toLocaleString()}`;
        }
    }

    showPreview() {
        const formData = this.getFormData();
        const items = this.getItemsFromDOM(); // テーブルから直接アイテムを取得

        // フォームデータとアイテムを結合
        const previewData = { ...formData, items };

        this.saveOrderToStorage(previewData);

        const previewContent = this.generatePreviewHTML(previewData);
        document.getElementById('previewContent').innerHTML = previewContent;
        document.getElementById('previewArea').style.display = 'flex';
    }

    hidePreview() {
        document.getElementById('previewArea').style.display = 'none';
    }

    getFormData() {
        const form = document.getElementById('orderForm');
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (!key.endsWith('[]')) {
                data[key] = value;
            }
        }
        return data;
    }

    generatePreviewHTML(data) {
        const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

        let itemsHTML = '';
        let subtotal = 0;

        if (data.items) {
            data.items.forEach(item => {
                if (!item.name.trim() && !item.projectName.trim()) return;

                subtotal += item.subtotal;

                itemsHTML += `
                    <tr>
                        <td>${item.projectName}</td>
                        <td>${item.name}</td>
                        <td class="center">${item.quantity} ${item.unit}</td>
                        <td class="right">¥${item.price.toLocaleString()}</td>
                        <td class="right">¥${item.subtotal.toLocaleString()}</td>
                    </tr>
                `;
            });
        }

        const tax = Math.ceil(subtotal * 0.1);
        const total = subtotal + tax;

        // 担当者ごとのハンコ表示
        let stampHTML = '';
        if (data.staffMember === '諸鹿大介') {
            stampHTML = `
                <div class="preview-stamp active">
                    <div class="preview-stamp-inner">
                        <div>諸鹿</div>
                        <div>大介</div>
                    </div>
                </div>
            `;
        } else if (data.staffMember === '奥山竜矢') {
            stampHTML = `
                <div class="preview-stamp active">
                    <div class="preview-stamp-inner">
                        <div>奥山</div>
                        <div>竜矢</div>
                    </div>
                </div>
            `;
        } else {
            stampHTML = `
                <div class="preview-stamp">
                    <div class="preview-stamp-inner">
                        <div>印</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="preview-paper">
                <div class="preview-header">
                    <div class="preview-logo-area">
                        <img src="logo.png" alt="株式会社諸鹿彩色" style="max-width: 250px; height: auto;">
                    </div>
                    <div class="preview-title-area">
                        <div class="preview-title">発注書</div>
                        <div class="preview-order-number">No. ${orderNumber}</div>
                    </div>
                </div>
                
                <div class="preview-meta-grid">
                    <div class="preview-box">
                        <div class="preview-box-title">発注先</div>
                        <span class="preview-recipient-name">${data.supplierName} 御中</span>
                        <div class="preview-info-row">
                            <span class="preview-info-label">住所:</span>
                            <span>${data.supplierAddress}</span>
                        </div>
                        ${data.contactPerson ? `
                        <div class="preview-info-row">
                            <span class="preview-info-label">担当者:</span>
                            <span>${data.contactPerson} 様</span>
                        </div>` : ''}
                    </div>
                    
                    <div class="preview-box">
                        <div class="preview-box-title">発注元</div>
                        <span class="preview-recipient-name">${data.companyName}</span>
                        <div class="preview-info-row">
                            <span class="preview-info-label">住所:</span>
                            <span>${data.companyAddress}</span>
                        </div>
                        <div class="preview-info-row">
                            <span class="preview-info-label">TEL:</span>
                            <span>${data.companyPhone}</span>
                        </div>
                        <div class="preview-info-row">
                            <span class="preview-info-label">Email:</span>
                            <span>${data.companyEmail}</span>
                        </div>
                        <div class="preview-info-row">
                            <span class="preview-info-label">担当:</span>
                            <span>${data.staffMember}</span>
                        </div>
                    </div>
                </div>
                
                <div class="preview-details-bar">
                    <span>発注日: ${data.orderDate}</span>
                    <span>工事完了予定: ${data.completionMonth || '未定'}</span>
                    <span>支払条件: ${data.paymentTerms}</span>
                </div>
                
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th style="width: 30%">工事件名</th>
                            <th style="width: 30%">商品名</th>
                            <th style="width: 15%">数量</th>
                            <th style="width: 10%">単価</th>
                            <th style="width: 15%">金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML || '<tr><td colspan="5" class="center">商品が入力されていません</td></tr>'}
                    </tbody>
                </table>
                
                <div class="preview-summary">
                    <div class="preview-summary-box">
                        <div class="preview-summary-row">
                            <span>小計</span>
                            <span>¥${subtotal.toLocaleString()}</span>
                        </div>
                        <div class="preview-summary-row">
                            <span>消費税 (10%)</span>
                            <span>¥${tax.toLocaleString()}</span>
                        </div>
                        <div class="preview-summary-row">
                            <span>合計金額</span>
                            <span>¥${total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="preview-remarks">
                    <h4>備考</h4>
                    <p>${data.remarks ? data.remarks.replace(/\n/g, '<br>') : 'なし'}</p>
                </div>
                
                <div class="preview-footer">
                    <div>
                        いつも大変お世話になっております。<br>
                        上記内容にて発注いたしますので、手配のほどよろしくお願い申し上げます。
                    </div>
                    <div class="preview-stamp-box">
                        ${stampHTML}
                    </div>
                </div>
            </div>
        `;
    }

    saveOrderToStorage(data) {
        try {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const newOrder = {
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                ...data
            };
            orders.push(newOrder);
            localStorage.setItem('orders', JSON.stringify(orders));
            return newOrder.id;
        } catch (e) {
            console.error('保存エラー:', e);
            return null;
        }
    }

    registerToManagement() {
        const formData = this.getFormData();
        const items = this.getItemsFromDOM();
        const fullData = { ...formData, items };

        const orderId = this.saveOrderToStorage(fullData);
        if (orderId) {
            alert('発注書を管理システムに登録しました。');
            window.location.href = 'management.html';
        } else {
            alert('登録に失敗しました。');
        }
    }

    resetForm() {
        if (confirm('入力内容をリセットしますか？')) {
            document.getElementById('orderForm').reset();
            this.setDefaultDate();
            // 商品行をリセット（5行に戻す）
            const tbody = document.getElementById('itemsTableBody');
            tbody.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                this.addItemRow();
            }
            this.calculateTotals();
        }
    }

    checkForEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        if (editId) {
            this.loadOrderForEdit(editId);
        }
    }

    loadOrderForEdit(id) {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const order = orders.find(o => o.id === id);
        if (order) {
            // 基本情報のセット
            Object.keys(order).forEach(key => {
                const el = document.getElementById(key);
                if (el && !key.endsWith('[]')) {
                    el.value = order[key];
                }
            });

            // 商品行のセット
            if (order.items && Array.isArray(order.items)) {
                const tbody = document.getElementById('itemsTableBody');
                tbody.innerHTML = ''; // 既存行クリア

                order.items.forEach(item => {
                    this.addItemRow();
                    const rows = tbody.querySelectorAll('tr');
                    const row = rows[rows.length - 1];

                    row.querySelector('input[name="itemProjectName[]"]').value = item.projectName || '';
                    row.querySelector('input[name="itemName[]"]').value = item.name || '';
                    row.querySelector('input[name="itemQuantity[]"]').value = item.quantity || '';
                    row.querySelector('input[name="itemUnit[]"]').value = item.unit || '';
                    row.querySelector('input[name="itemPrice[]"]').value = item.price || '';row.querySelector('input[name="itemRemarks[]"]').value = item.remarks || '';
                });
                this.calculateTotals();
            }
        }
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    window.app = new OrderFormManager();
});
