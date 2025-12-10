// 発注書管理システム
class OrderManagementSystem {
    constructor() {
        this.orders = this.loadOrders();
        this.filteredOrders = [...this.orders];
        this.currentMonth = new Date();
        this.selectedMonth = new Date();
        this.initializeEventListeners();
        this.updateStats();
        this.updateMonthDisplay();
        this.renderOrders();
    }

    // LocalStorageから発注書データを読み込み
    loadOrders() {
        try {
            const saved = localStorage.getItem('purchaseOrders');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('発注書データの読み込みエラー:', error);
            return [];
        }
    }

    // LocalStorageに発注書データを保存
    saveOrders() {
        try {
            localStorage.setItem('purchaseOrders', JSON.stringify(this.orders));
        } catch (error) {
            console.error('発注書データの保存エラー:', error);
            alert('データの保存に失敗しました。');
        }
    }

    // イベントリスナーを初期化
    initializeEventListeners() {
        // 検索機能
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterOrders();
            });
        }

        // フィルタ機能
        const filterSelect = document.getElementById('filterSelect');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterOrders();
            });
        }

        // 更新ボタン
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // エクスポートボタン
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // 全削除ボタン
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllOrders();
            });
        }

        // 月別ナビゲーション
        const prevMonthBtn = document.getElementById('prevMonthBtn');
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.navigateMonth(-1);
            });
        }

        const nextMonthBtn = document.getElementById('nextMonthBtn');
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.navigateMonth(1);
            });
        }
    }

    // 発注書をフィルタリング
    filterOrders() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filterValue = document.getElementById('filterSelect').value;

        this.filteredOrders = this.orders.filter(order => {
            // 検索条件
            const matchesSearch = !searchTerm || 
                order.supplierName.toLowerCase().includes(searchTerm) ||
                order.orderNumber.toLowerCase().includes(searchTerm) ||
                order.companyName.toLowerCase().includes(searchTerm);

            // フィルタ条件
            let matchesFilter = true;
            if (filterValue !== 'all') {
                const orderDate = new Date(order.orderDate);
                const now = new Date();
                
                switch (filterValue) {
                    case 'thisMonth':
                        matchesFilter = orderDate.getMonth() === now.getMonth() && 
                                       orderDate.getFullYear() === now.getFullYear();
                        break;
                    case 'lastMonth':
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
                        matchesFilter = orderDate.getMonth() === lastMonth.getMonth() && 
                                       orderDate.getFullYear() === lastMonth.getFullYear();
                        break;
                    case 'thisYear':
                        matchesFilter = orderDate.getFullYear() === now.getFullYear();
                        break;
                    case 'selectedMonth':
                        matchesFilter = orderDate.getMonth() === this.selectedMonth.getMonth() && 
                                       orderDate.getFullYear() === this.selectedMonth.getFullYear();
                        break;
                }
            } else {
                // デフォルトで選択月のデータを表示
                const orderDate = new Date(order.orderDate);
                matchesFilter = orderDate.getMonth() === this.selectedMonth.getMonth() && 
                               orderDate.getFullYear() === this.selectedMonth.getFullYear();
            }

            return matchesSearch && matchesFilter;
        });

        this.renderOrders();
    }

    // 発注書一覧をレンダリング
    renderOrders() {
        const ordersGrid = document.getElementById('ordersGrid');
        const emptyState = document.getElementById('emptyState');

        if (!ordersGrid) return;

        if (this.filteredOrders.length === 0) {
            ordersGrid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        ordersGrid.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        ordersGrid.innerHTML = this.filteredOrders.map(order => this.createOrderCard(order)).join('');
        
        // 各カードのイベントリスナーを設定
        this.attachCardEventListeners();
    }

    // 発注書カードを作成
    createOrderCard(order) {
        const totalAmount = this.calculateTotal(order.items);
        const orderDate = new Date(order.orderDate).toLocaleDateString('ja-JP');
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-card-header">
                    <div class="order-number">${order.orderNumber}</div>
                    <div class="order-date">${orderDate}</div>
                </div>
                
                <div class="order-info">
                    <div class="info-row">
                        <span class="info-label">発注先:</span>
                        <span class="info-value">${order.supplierName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">担当:</span>
                        <span class="info-value">${order.staffMember || '未設定'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">工事完了月:</span>
                        <span class="info-value">${order.completionMonth || '未設定'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">支払条件:</span>
                        <span class="info-value">${order.paymentTerms}</span>
                    </div>
                </div>

                <div class="order-total">
                    <div class="total-amount">¥${totalAmount.toLocaleString()}</div>
                </div>

                <div class="order-actions">
                    <button class="btn btn-primary view-btn" data-order-id="${order.id}">
                        👁️ 詳細表示
                    </button>
                    <button class="btn btn-success edit-btn" data-order-id="${order.id}">
                        ✏️ 編集
                    </button>
                    <button class="btn btn-warning pdf-btn" data-order-id="${order.id}">
                        📄 PDF
                    </button>
                    <button class="btn btn-danger delete-btn" data-order-id="${order.id}">
                        🗑️ 削除
                    </button>
                </div>
            </div>
        `;
    }

    // カードのイベントリスナーを設定
    attachCardEventListeners() {
        // 詳細表示
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                this.viewOrder(orderId);
            });
        });

        // 編集
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                this.editOrder(orderId);
            });
        });

        // PDF生成
        document.querySelectorAll('.pdf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                this.generatePDF(orderId);
            });
        });

        // 削除
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                this.deleteOrder(orderId);
            });
        });
    }

    // 合計金額を計算
    calculateTotal(items) {
        return items.reduce((total, item) => {
            const subtotal = item.quantity * item.unitPrice;
            return total + subtotal;
        }, 0);
    }

    // 統計情報を更新
    updateStats() {
        const totalOrders = this.orders.length;
        const totalAmount = this.orders.reduce((sum, order) => sum + this.calculateTotal(order.items), 0);
        
        const now = new Date();
        const thisMonthOrders = this.orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate.getMonth() === now.getMonth() && 
                   orderDate.getFullYear() === now.getFullYear();
        }).length;

        // 選択月の統計
        const selectedMonthOrders = this.orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate.getMonth() === this.selectedMonth.getMonth() && 
                   orderDate.getFullYear() === this.selectedMonth.getFullYear();
        }).length;

        // 統計カードを更新
        const totalOrdersEl = document.getElementById('totalOrders');
        const totalAmountEl = document.getElementById('totalAmount');
        const thisMonthOrdersEl = document.getElementById('thisMonthOrders');
        const selectedMonthOrdersEl = document.getElementById('selectedMonthOrders');

        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (totalAmountEl) totalAmountEl.textContent = `¥${totalAmount.toLocaleString()}`;
        if (thisMonthOrdersEl) thisMonthOrdersEl.textContent = thisMonthOrders;
        if (selectedMonthOrdersEl) selectedMonthOrdersEl.textContent = selectedMonthOrders;
    }

    // 月別ナビゲーション
    navigateMonth(direction) {
        this.selectedMonth.setMonth(this.selectedMonth.getMonth() + direction);
        this.updateMonthDisplay();
        this.filterOrders();
    }

    // 月表示を更新
    updateMonthDisplay() {
        const monthNames = [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ];

        const year = this.selectedMonth.getFullYear();
        const month = monthNames[this.selectedMonth.getMonth()];
        
        // 月表示を更新
        const monthDisplay = document.getElementById('currentMonthDisplay');
        if (monthDisplay) {
            monthDisplay.textContent = `${year}年${month}`;
        }

        // 選択月の統計を更新
        this.updateMonthStats();
    }

    // 選択月の統計を更新
    updateMonthStats() {
        const selectedMonthOrders = this.orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate.getMonth() === this.selectedMonth.getMonth() && 
                   orderDate.getFullYear() === this.selectedMonth.getFullYear();
        });

        const selectedMonthAmount = selectedMonthOrders.reduce((sum, order) => sum + this.calculateTotal(order.items), 0);
        const orderCount = selectedMonthOrders.length;

        // 月統計表示を更新
        const monthStats = document.getElementById('monthStats');
        if (monthStats) {
            monthStats.textContent = `発注書: ${orderCount}件 | 金額: ¥${selectedMonthAmount.toLocaleString()}`;
        }
    }

    // 発注書の詳細表示
    viewOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        // 詳細表示用のモーダルまたはページを作成
        const orderDetails = this.createOrderDetailsHTML(order);
        
        // 新しいウィンドウで詳細を表示
        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>発注書詳細 - ${order.orderNumber}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; }
                    .info-section { margin-bottom: 25px; }
                    .info-section h3 { color: #333; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #ddd; }
                    .info-row { display: flex; margin-bottom: 8px; }
                    .info-label { font-weight: bold; width: 120px; color: #666; }
                    .info-value { flex: 1; color: #333; }
                    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    .items-table th { background: #f8f9fa; font-weight: bold; }
                    .total-section { text-align: right; margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 5px; }
                    .total-row { display: flex; justify-content: flex-end; margin-bottom: 5px; }
                    .total-label { width: 150px; text-align: right; margin-right: 20px; }
                    .total-amount { font-size: 1.2em; font-weight: bold; color: #2c3e50; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${orderDetails}
                </div>
            </body>
            </html>
        `);
        newWindow.document.close();
    }

    // 発注書詳細HTMLを作成
    createOrderDetailsHTML(order) {
        const totalAmount = this.calculateTotal(order.items);
        const tax = Math.floor(totalAmount * 0.1);
        const subtotal = totalAmount - tax;

        const itemsHTML = order.items.map(item => `
            <tr>
                <td>${item.projectName || ''}</td>
                <td>${item.name}</td>
                <td>${item.quantity} ${item.unit || ''}</td>
                <td>¥${item.unitPrice.toLocaleString()}</td>
                <td>¥${(item.quantity * item.unitPrice).toLocaleString()}</td>
            </tr>
        `).join('');

        return `
            <div class="header">
                <h1>発注書詳細</h1>
                <h2>${order.orderNumber}</h2>
                <p>発注日: ${new Date(order.orderDate).toLocaleDateString('ja-JP')}</p>
            </div>

            <div class="info-section">
                <h3>発注元情報</h3>
                <div class="info-row"><span class="info-label">会社名:</span><span class="info-value">${order.companyName}</span></div>
                <div class="info-row"><span class="info-label">住所:</span><span class="info-value">${order.companyAddress}</span></div>
                <div class="info-row"><span class="info-label">電話:</span><span class="info-value">${order.companyPhone}</span></div>
                <div class="info-row"><span class="info-label">メール:</span><span class="info-value">${order.companyEmail}</span></div>
                <div class="info-row"><span class="info-label">担当:</span><span class="info-value">${order.staffMember || '未設定'}</span></div>
            </div>

            <div class="info-section">
                <h3>発注先情報</h3>
                <div class="info-row"><span class="info-label">会社名:</span><span class="info-value">${order.supplierName}</span></div>
                <div class="info-row"><span class="info-label">住所:</span><span class="info-value">${order.supplierAddress}</span></div>
                ${order.contactPerson ? `<div class="info-row"><span class="info-label">担当者:</span><span class="info-value">${order.contactPerson}</span></div>` : ''}
            </div>

            <div class="info-section">
                <h3>その他情報</h3>
                <div class="info-row"><span class="info-label">工事完了月:</span><span class="info-value">${order.completionMonth || '未設定'}</span></div>
                <div class="info-row"><span class="info-label">支払条件:</span><span class="info-value">${order.paymentTerms}</span></div>
                ${order.remarks ? `<div class="info-row"><span class="info-label">備考:</span><span class="info-value">${order.remarks}</span></div>` : ''}
            </div>

            <div class="info-section">
                <h3>商品・サービス一覧</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>工事件名</th>
                            <th>商品名</th>
                            <th>数量</th>
                            <th>単価</th>
                            <th>小計</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>

            <div class="total-section">
                <div class="total-row">
                    <span class="total-label">小計:</span>
                    <span class="total-amount">¥${subtotal.toLocaleString()}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">消費税 (10%):</span>
                    <span class="total-amount">¥${tax.toLocaleString()}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">合計金額:</span>
                    <span class="total-amount">¥${totalAmount.toLocaleString()}</span>
                </div>
            </div>
        `;
    }

    // 発注書の編集
    editOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        // メインページに移動して編集モードで開く
        const orderData = encodeURIComponent(JSON.stringify(order));
        window.location.href = `index.html?edit=${orderId}&data=${orderData}`;
    }

    // PDF生成
    async generatePDF(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        try {
            // 既存のPDF生成機能を使用
            if (typeof window.PurchaseOrderForm !== 'undefined') {
                const form = new window.PurchaseOrderForm();
                // フォームにデータを設定
                this.populateFormWithOrderData(order);
                // PDF生成
                await form.generateHighQualityPDFFromPreview();
            } else {
                alert('PDF生成機能が利用できません。メインページからPDFを生成してください。');
            }
        } catch (error) {
            console.error('PDF生成エラー:', error);
            alert('PDF生成に失敗しました。');
        }
    }

    // フォームに発注書データを設定
    populateFormWithOrderData(order) {
        // この関数はメインページのフォームにデータを設定するために使用
        // 実際の実装では、メインページのフォーム要素に値を設定
        console.log('発注書データをフォームに設定:', order);
    }

    // 発注書の削除
    deleteOrder(orderId) {
        if (!confirm('この発注書を削除してもよろしいですか？')) return;

        this.orders = this.orders.filter(o => o.id !== orderId);
        this.saveOrders();
        this.refreshData();
    }

    // データを更新
    refreshData() {
        this.orders = this.loadOrders();
        this.filteredOrders = [...this.orders];
        this.updateStats();
        this.renderOrders();
    }

    // データをエクスポート
    exportData() {
        try {
            const exportData = this.filteredOrders.length > 0 ? this.filteredOrders : this.orders;
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            
            // ファイル名に月情報を含める
            const year = this.selectedMonth.getFullYear();
            const month = String(this.selectedMonth.getMonth() + 1).padStart(2, '0');
            const filterValue = document.getElementById('filterSelect').value;
            
            let fileName = `発注書データ_${year}年${month}月`;
            if (filterValue === 'all') {
                fileName = `発注書データ_全期間`;
            } else if (filterValue === 'thisMonth') {
                fileName = `発注書データ_今月`;
            } else if (filterValue === 'lastMonth') {
                fileName = `発注書データ_先月`;
            } else if (filterValue === 'thisYear') {
                fileName = `発注書データ_${year}年`;
            }
            
            link.href = url;
            link.download = `${fileName}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('エクスポートエラー:', error);
            alert('データのエクスポートに失敗しました。');
        }
    }

    // 全発注書を削除
    clearAllOrders() {
        if (!confirm('すべての発注書を削除してもよろしいですか？この操作は元に戻せません。')) return;

        this.orders = [];
        this.saveOrders();
        this.refreshData();
        alert('すべての発注書が削除されました。');
    }
}

// ページ読み込み時に管理システムを初期化
document.addEventListener('DOMContentLoaded', () => {
    new OrderManagementSystem();
});
