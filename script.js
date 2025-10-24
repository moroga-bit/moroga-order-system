class OrderFormApp {
    constructor() {
        this.form = document.getElementById('orderForm');
        this.itemsContainer = document.getElementById('itemsContainer');
        this.previewModal = document.getElementById('previewModal');
        this.previewContent = document.getElementById('previewContent');
        this.downloadButton = document.getElementById('downloadPdfBtn');
        this.printButton = document.getElementById('printBtn');
        this.previewButton = document.getElementById('previewBtn');
        this.resetButton = document.getElementById('resetBtn');
        this.addItemButton = document.getElementById('addItemBtn');
        this.closePreviewButton = document.getElementById('closePreviewBtn');
        this.modalCloseButton = document.querySelector('.modal-close');
        this.itemsTotalEl = document.getElementById('itemsTotal');
        this.itemsCountEl = document.getElementById('itemsCount');
        this.subtotalEl = document.getElementById('subtotal');
        this.taxEl = document.getElementById('tax');
        this.totalEl = document.getElementById('total');

        this.currencyFormatter = new Intl.NumberFormat('ja-JP');
        this.numberFormatter = new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        this.initialize();
    }

    initialize() {
        this.setupInitialRows();
        this.attachEventListeners();
        this.setDefaultDates();
        this.autoPopulateOrderNumber();
        this.updateTotals();
    }

    setupInitialRows() {
        this.itemsContainer.innerHTML = '';
        for (let i = 0; i < 3; i += 1) {
            this.addItemRow();
        }
    }

    attachEventListeners() {
        this.addItemButton?.addEventListener('click', () => this.addItemRow());

        this.itemsContainer.addEventListener('input', (event) => {
            const target = event.target;
            if (!target.closest('.item-row')) {
                return;
            }

            if (target.matches('input[name="itemQuantity[]"], input[name="itemPrice[]"]')) {
                this.updateRowSubtotal(target.closest('.item-row'));
                this.updateTotals();
            }
        });

        this.itemsContainer.addEventListener('blur', (event) => {
            const target = event.target;
            if (target.matches('input[name="itemQuantity[]"], input[name="itemPrice[]"]')) {
                this.updateRowSubtotal(target.closest('.item-row'));
                this.updateTotals();
            }
        }, true);

        this.itemsContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.remove-item');
            if (!button) {
                return;
            }

            const row = button.closest('.item-row');
            if (row) {
                this.itemsContainer.removeChild(row);
                this.updateTotals();
                this.updateItemCount();
                if (!this.itemsContainer.querySelector('.item-row')) {
                    this.addItemRow();
                }
            }
        });

        this.form.addEventListener('input', (event) => {
            const target = event.target;
            if (target.id === 'taxRate') {
                this.updateTotals();
            }
        });

        this.previewButton?.addEventListener('click', () => {
            if (this.ensureMandatoryFields()) {
                this.showPreview();
            }
        });

        this.downloadButton?.addEventListener('click', () => this.generatePDF());
        this.printButton?.addEventListener('click', () => this.printPreview());

        this.resetButton?.addEventListener('click', () => this.resetForm());

        [this.closePreviewButton, this.modalCloseButton].forEach((button) => {
            button?.addEventListener('click', () => this.hidePreview());
        });

        this.previewModal?.addEventListener('click', (event) => {
            if (event.target === this.previewModal) {
                this.hidePreview();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hidePreview();
            }
        });
    }

    setDefaultDates() {
        const orderDate = document.getElementById('orderDate');
        if (orderDate && !orderDate.value) {
            orderDate.valueAsDate = new Date();
        }
    }

    autoPopulateOrderNumber() {
        const orderNumberInput = document.getElementById('orderNumber');
        if (!orderNumberInput || orderNumberInput.value) {
            return;
        }

        const now = new Date();
        const sequence = String(now.getHours()) + String(now.getMinutes()).padStart(2, '0');
        const generated = `MOR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${sequence}`;
        orderNumberInput.value = generated;
    }

    createItemRow() {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="form-group">
                <label>工事名</label>
                <input type="text" name="itemProjectName[]" placeholder="工事件名">
            </div>
            <div class="form-group">
                <label>商品名</label>
                <input type="text" name="itemName[]" placeholder="商品名">
            </div>
            <div class="form-group">
                <label>数量</label>
                <input type="number" name="itemQuantity[]" min="0" step="0.01" inputmode="decimal">
            </div>
            <div class="form-group">
                <label>単位</label>
                <input type="text" name="itemUnit[]" placeholder="個、台 など">
            </div>
            <div class="form-group">
                <label>単価</label>
                <input type="number" name="itemPrice[]" min="0" step="0.01" inputmode="decimal">
            </div>
            <div class="form-group">
                <label>小計</label>
                <input type="text" name="itemSubtotal[]" readonly>
            </div>
            <button type="button" class="remove-item" aria-label="この行を削除">削除</button>
        `;
        return row;
    }

    addItemRow() {
        const newRow = this.createItemRow();
        this.itemsContainer.appendChild(newRow);
        this.updateItemCount();
        this.updateTotals();
    }

    updateItemCount() {
        const count = this.itemsContainer.querySelectorAll('.item-row').length;
        if (this.itemsCountEl) {
            this.itemsCountEl.textContent = count;
        }
    }

    updateRowSubtotal(row) {
        if (!row) {
            return;
        }
        const quantity = parseFloat(row.querySelector('input[name="itemQuantity[]"]').value) || 0;
        const price = parseFloat(row.querySelector('input[name="itemPrice[]"]').value) || 0;
        const subtotalField = row.querySelector('input[name="itemSubtotal[]"]');
        const subtotal = quantity * price;
        if (!quantity && !price) {
            subtotalField.value = '';
            return;
        }
        subtotalField.value = this.numberFormatter.format(subtotal);
    }

    collectFormData() {
        const formData = new FormData(this.form);
        const data = {};

        formData.forEach((value, key) => {
            if (key.endsWith('[]')) {
                if (!Array.isArray(data[key])) {
                    data[key] = [];
                }
                data[key].push(value.trim());
            } else {
                data[key] = typeof value === 'string' ? value.trim() : value;
            }
        });

        const items = [];
        const projectNames = data['itemProjectName[]'] || [];
        const names = data['itemName[]'] || [];
        const quantities = data['itemQuantity[]'] || [];
        const units = data['itemUnit[]'] || [];
        const prices = data['itemPrice[]'] || [];

        const longest = Math.max(projectNames.length, names.length, quantities.length, units.length, prices.length);
        for (let i = 0; i < longest; i += 1) {
            const hasValue = [projectNames[i], names[i], quantities[i], units[i], prices[i]].some((field) => field && field.trim());
            if (!hasValue) {
                continue;
            }
            const quantity = parseFloat(quantities[i]) || 0;
            const price = parseFloat(prices[i]) || 0;
            items.push({
                projectName: projectNames[i] || '',
                name: names[i] || '',
                quantity,
                unit: units[i] || '',
                price,
                subtotal: quantity * price,
            });
        }

        delete data['itemProjectName[]'];
        delete data['itemName[]'];
        delete data['itemQuantity[]'];
        delete data['itemUnit[]'];
        delete data['itemPrice[]'];

        const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
        const taxRate = parseFloat(data.taxRate ?? '0.1') || 0;
        const tax = Math.round(subtotal * taxRate);
        const total = subtotal + tax;

        return {
            ...data,
            items,
            subtotal,
            tax,
            total,
            taxRate,
        };
    }

    updateTotals() {
        const { items, subtotal, tax, total } = this.collectFormData();
        const itemSubtotal = items.reduce((acc, item) => acc + item.subtotal, 0);

        if (this.itemsTotalEl) {
            this.itemsTotalEl.textContent = this.currencyFormatter.format(itemSubtotal);
        }

        if (this.subtotalEl) {
            this.subtotalEl.textContent = this.currencyFormatter.format(subtotal);
        }

        if (this.taxEl) {
            this.taxEl.textContent = this.currencyFormatter.format(tax);
        }

        if (this.totalEl) {
            this.totalEl.textContent = this.currencyFormatter.format(total);
        }
    }

    ensureMandatoryFields() {
        const requiredFields = [
            { id: 'supplierName', label: '発注先会社名' },
            { id: 'supplierAddress', label: '発注先住所' },
        ];

        const missing = requiredFields.filter(({ id }) => {
            const input = document.getElementById(id);
            return input && !input.value.trim();
        });

        if (missing.length > 0) {
            const message = missing.map((field) => `・${field.label}`).join('\n');
            alert(`以下の項目を入力してください。\n${message}`);
            return false;
        }
        return true;
    }

    showPreview() {
        const data = this.collectFormData();
        const previewHTML = this.buildPreviewHTML(data);
        this.previewContent.innerHTML = `<div class="order-preview-wrapper">${previewHTML}</div>`;
        this.previewModal?.classList.add('is-visible');
        this.previewModal?.setAttribute('aria-hidden', 'false');
    }

    hidePreview() {
        this.previewModal?.classList.remove('is-visible');
        this.previewModal?.setAttribute('aria-hidden', 'true');
    }

    buildPreviewHTML(data) {
        const formatDate = (value, fallback = '—') => {
            if (!value) {
                return fallback;
            }
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) {
                return value;
            }
            return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日`;
        };

        const formatMonth = (value) => {
            if (!value) {
                return '—';
            }
            const [year, month] = value.split('-');
            if (!year || !month) {
                return value;
            }
            return `${year}年${parseInt(month, 10)}月`;
        };

        const rows = data.items.length > 0
            ? data.items.map((item) => `
                <tr>
                    <td>${this.escapeHTML(item.projectName)}</td>
                    <td>${this.escapeHTML(item.name)}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${this.escapeHTML(item.unit)}</td>
                    <td>¥${this.currencyFormatter.format(item.price)}</td>
                    <td>¥${this.currencyFormatter.format(item.subtotal)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="6" style="text-align:center; color:#9ca3af; padding:16px;">商品が入力されていません</td></tr>';

        const stampSrc = this.getStampForStaff(data.staffMember);

        return `
            <article class="order-preview">
                <header class="preview-header">
                    <div class="preview-brand">
                        <img src="logo.png" alt="株式会社諸鹿彩色のロゴ" onerror="this.style.display='none'">
                        <div class="preview-title">
                            <small>ORDER FORM</small>
                            <h1>発注書</h1>
                            <span>${this.escapeHTML(data.orderNumber || '')}</span>
                        </div>
                    </div>
                    <dl class="preview-meta">
                        <dt>発注日</dt><dd>${formatDate(data.orderDate)}</dd>
                        <dt>納期</dt><dd>${formatDate(data.deliveryDate, '別途ご連絡')}</dd>
                        <dt>支払期日</dt><dd>${formatDate(data.paymentDueDate, '支払条件参照')}</dd>
                        <dt>支払条件</dt><dd>${this.escapeHTML(data.paymentTerms || '—')}</dd>
                    </dl>
                </header>

                <section class="preview-section">
                    <h3>発注元</h3>
                    <div class="preview-box">
                        <strong>${this.escapeHTML(data.companyName || '')}</strong><br>
                        ${this.escapeHTML(data.companyAddress || '')}<br>
                        ${this.escapeHTML(data.companyPhone || '')}<br>
                        ${this.escapeHTML(data.companyEmail || '')}<br>
                        登録番号: ${this.escapeHTML(data.companyCode || '')}
                    </div>
                </section>

                <section class="preview-section">
                    <h3>発注先</h3>
                    <div class="preview-box">
                        <strong>${this.escapeHTML(data.supplierName || '')}</strong><br>
                        ${this.escapeHTML(data.supplierAddress || '')}<br>
                        ${data.contactPerson ? `担当: ${this.escapeHTML(data.contactPerson)}` : ''}<br>
                        ${data.deliveryLocation ? `納入場所: ${this.escapeHTML(data.deliveryLocation)}` : ''}
                    </div>
                </section>

                <section class="preview-section">
                    <h3>工事 / スケジュール</h3>
                    <div class="preview-box">
                        工事完了予定: ${formatMonth(data.completionMonth)}<br>
                        担当者: ${this.escapeHTML(data.staffMember || '—')}
                    </div>
                </section>

                <section class="preview-section">
                    <h3>商品情報</h3>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>工事名</th>
                                <th>商品名</th>
                                <th>数量</th>
                                <th>単位</th>
                                <th>単価</th>
                                <th>小計</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </section>

                <section class="preview-totals">
                    <div><span>小計</span><span>¥${this.currencyFormatter.format(data.subtotal)}</span></div>
                    <div><span>消費税 (${Math.round(data.taxRate * 100)}%)</span><span>¥${this.currencyFormatter.format(data.tax)}</span></div>
                    <div class="grand"><span>合計</span><span>¥${this.currencyFormatter.format(data.total)}</span></div>
                </section>

                ${data.bankDetails ? `
                    <section class="preview-section">
                        <h3>振込先</h3>
                        <div class="preview-box">${this.escapeHTML(data.bankDetails)}</div>
                    </section>
                ` : ''}

                ${data.notes ? `
                    <section class="preview-section">
                        <h3>備考</h3>
                        <div class="preview-box notes-box">${this.escapeHTML(data.notes)}</div>
                    </section>
                ` : ''}

                <footer class="preview-footer">
                    <div>
                        <strong>株式会社 諸鹿彩色</strong><br>
                        〒321-0111 栃木県宇都宮市川田町1048-5
                    </div>
                    ${stampSrc ? `
                        <div class="signature-block">
                            <img src="${stampSrc}" alt="担当印">
                            <div>
                                担当者: ${this.escapeHTML(data.staffMember)}<br>
                                ${formatMonth(data.completionMonth)}
                            </div>
                        </div>
                    ` : ''}
                </footer>
            </article>
        `;
    }

    getStampForStaff(staff) {
        if (!staff) {
            return '';
        }
        if (staff.includes('諸鹿')) {
            return 'stamp_moroga.png';
        }
        if (staff.includes('奥山')) {
            return 'stamp_okuyama.png';
        }
        return '';
    }

    escapeHTML(value) {
        if (value == null) {
            return '';
        }
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');
    }

    async ensureFontsReady() {
        if (document.fonts && document.fonts.ready) {
            try {
                await document.fonts.ready;
            } catch (error) {
                console.warn('フォントの読み込み待機中にエラーが発生しました', error);
            }
        }
    }

    async generatePDF() {
        const preview = this.previewContent.querySelector('.order-preview');
        if (!preview) {
            return;
        }

        const filename = this.createFileName();
        await this.ensureFontsReady();

        const options = {
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollY: -window.scrollY,
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };

        await html2pdf().set(options).from(preview).save();
    }

    createFileName() {
        const orderNumber = (document.getElementById('orderNumber')?.value || '').trim();
        if (orderNumber) {
            return `${orderNumber}.pdf`;
        }
        const date = new Date().toISOString().split('T')[0];
        return `発注書_${date}.pdf`;
    }

    printPreview() {
        const preview = this.previewContent.querySelector('.order-preview');
        if (!preview) {
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1024,height=768');
        if (!printWindow) {
            alert('ポップアップがブロックされました。印刷を許可してください。');
            return;
        }

        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map((node) => node.outerHTML)
            .join('\n');

        printWindow.document.open();
        printWindow.document.write(`
            <html lang="ja">
                <head>
                    <meta charset="utf-8">
                    <title>発注書プレビュー</title>
                    ${stylesheets}
                </head>
                <body>
                    <div class="order-preview-wrapper">${preview.outerHTML}</div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    resetForm() {
        if (!window.confirm('入力内容をすべてリセットしますか？')) {
            return;
        }
        this.form.reset();
        this.setupInitialRows();
        this.setDefaultDates();
        this.autoPopulateOrderNumber();
        this.updateTotals();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.orderFormApp = new OrderFormApp();
});
