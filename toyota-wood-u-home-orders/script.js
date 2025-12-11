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
                subtotal: quantity * price
            };
        });
    }

    // ブラウザの印刷機能を使用してPDF化（高画質ベクター）
    generateHighQualityPDFFromPreview() {
        window.print();
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
            <td><input type="number" name="itemSubtotal[]" readonly placeholder="0"></td>
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
                        <td class="pl-col-center">${item.quantity} ${item.unit}</td>
                        <td class="pl-col-right">¥${item.price.toLocaleString()}</td>
                        <td class="pl-col-right">¥${item.subtotal.toLocaleString()}</td>
                    </tr>
                `;
            });
        }

        // 空行を埋めて見た目を整える（最低3行確保など - 1ページに収めるため厳しく調整）
        const minRows = 3;
        const currentRows = data.items ? data.items.filter(i => i.name.trim() || i.projectName.trim()).length : 0;
        const rowsToAdd = Math.max(0, minRows - currentRows);

        for (let i = 0; i < rowsToAdd; i++) {
            itemsHTML += `
                <tr>
                    <td>&nbsp;</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
        }

        const tax = Math.ceil(subtotal * 0.1);
        const total = subtotal + tax;

        // 担当者ごとのハンコ表示
        let stampHTML = '';
        if (data.staffMember === '諸鹿大介') {
            stampHTML = `
                <div class="pl-stamp-box">
                    <div class="pl-stamp-circle">
                        <div>諸鹿</div>
                        <div>大介</div>
                    </div>
                </div>
            `;
        } else if (data.staffMember === '奥山竜矢') {
            stampHTML = `
                <div class="pl-stamp-box">
                    <div class="pl-stamp-circle">
                        <div>奥山</div>
                        <div>竜矢</div>
                    </div>
                </div>
            `;
        } else {
            stampHTML = `
                <div class="pl-stamp-box">
                    <div class="pl-stamp-circle" style="color:#ccc; border-color:#ccc;">
                        <div>印</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="preview-paper">
                <div class="print-layout">
                    <!-- Logo (floats freely) -->
                    <img src="logo.png" class="pl-logo-img" alt="MOROGA">

                    <!-- Header -->
                    <div class="pl-header">
                        <div class="pl-title">発注書</div>
                        <div class="pl-order-number">No. ${orderNumber}</div>
                    </div>

                    <!-- Info Grid -->
                    <div class="pl-info-grid">
                        <div class="pl-info-box">
                            <div class="pl-info-label">発注先 (Supplier)</div>
                            <span class="pl-recipient">${data.supplierName} 御中</span>
                            <div class="pl-info-row">
                                <span class="label">担当者:</span>
                                <span>${data.contactPerson ? data.contactPerson + ' 様' : ''}</span>
                            </div>
                        </div>

                        <div class="pl-info-box">
                            <div class="pl-info-label">発注元 (Client)</div>
                            <span class="pl-recipient">${data.companyName}</span>
                            <div class="pl-info-row">
                                <span class="label">住所:</span>
                                <span>${data.companyAddress}</span>
                            </div>
                            <div class="pl-info-row">
                                <span class="label">TEL:</span>
                                <span>${data.companyPhone}</span>
                            </div>
                            <div class="pl-info-row">
                                <span class="label">Email:</span>
                                <span>${data.companyEmail}</span>
                            </div>
                             <div class="pl-info-row">
                                <span class="label">担当:</span>
                                <span>${data.staffMember}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Details Bar -->
                    <div class="pl-details-bar">
                        <span>発注日: ${data.orderDate}</span>
                        <span>工事完了予定: ${data.completionMonth || '未定'}</span>
                        <span>支払条件: ${data.paymentTerms}</span>
                    </div>

                    <!-- Table -->
                    <div class="pl-table-container">
                        <table class="pl-table">
                            <thead>
                                <tr>
                                    <th style="width: 30%">工事件名</th>
                                    <th style="width: 30%">工事内容・商品名</th>
                                    <th style="width: 10%" class="pl-col-center">数量</th>
                                    <th style="width: 15%" class="pl-col-right">単価</th>
                                    <th style="width: 15%" class="pl-col-right">金額</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHTML}
                            </tbody>
                        </table>
                    </div>

                    <!-- Summary -->
                    <div class="pl-summary">
                        <div class="pl-summary-box">
                            <div class="pl-summary-row">
                                <span>小計</span>
                                <span>¥${subtotal.toLocaleString()}</span>
                            </div>
                            <div class="pl-summary-row">
                                <span>消費税 (10%)</span>
                                <span>¥${tax.toLocaleString()}</span>
                            </div>
                            <div class="pl-summary-row total">
                                <span>合計金額</span>
                                <span>¥${total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="pl-footer-area">
                        <div class="pl-remarks">
                            <h4>【備考】</h4>
                            <p>${data.remarks ? data.remarks.replace(/\n/g, '<br>') : 'なし'}</p>
                        </div>
                        <div class="pl-stamps">
                            ${stampHTML}
                        </div>
                    </div>

                    <div class="pl-bottom-msg">
                        いつも大変お世話になっております。<br>
                        上記内容にて発注いたしますので、手配のほどよろしくお願い申し上げます。
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
                    row.querySelector('input[name="itemPrice[]"]').value = item.price || '';
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
