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
            let orders = saved ? JSON.parse(saved) : [];

            // 重複IDのクリーニング（古いデータに重複がある場合の対策）
            const uniqueOrders = [];
            const ids = new Set();
            orders.forEach(order => {
                if (!ids.has(String(order.id))) {
                    ids.add(String(order.id));
                    uniqueOrders.push(order);
                }
            });

            if (uniqueOrders.length !== orders.length) {
                console.log('重複データを削除しました');
                localStorage.setItem('purchaseOrders', JSON.stringify(uniqueOrders));
            }

            return uniqueOrders;
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

        // テーブル内のアクションボタン（イベント委譲）
        const tableBody = document.getElementById('ordersTableBody');
        if (tableBody) {
            console.log('テーブルイベントリスナー初期化完了');
            tableBody.addEventListener('click', (e) => {
                console.log('テーブルクリック:', e.target);

                // 編集
                const editBtn = e.target.closest('.edit-btn');
                if (editBtn) {
                    const orderId = editBtn.getAttribute('data-order-id');
                    console.log('編集ボタンクリック ID:', orderId);
                    if (orderId) this.editOrder(orderId);
                    return;
                }

                // 削除
                const deleteBtn = e.target.closest('.delete-btn');
                if (deleteBtn) {
                    const orderId = deleteBtn.getAttribute('data-order-id');
                    console.log('削除ボタンクリック ID:', orderId);
                    if (orderId) this.deleteOrder(orderId);
                    return;
                }
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
        const ordersTableBody = document.getElementById('ordersTableBody');
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.querySelector('.table-container');

        if (!ordersTableBody) return;

        if (this.filteredOrders.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (tableContainer) tableContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        ordersTableBody.innerHTML = this.filteredOrders.map(order => this.createOrderRow(order)).join('');
    }

    // 発注書テーブル行を作成
    createOrderRow(order) {
        const totalAmount = this.calculateTotal(order.items);
        const orderDate = new Date(order.orderDate).toLocaleDateString('ja-JP');

        return `
            <tr data-order-id="${order.id}">
                <td><span class="order-number">${order.orderNumber}</span></td>
                <td>${orderDate}</td>
                <td>${order.supplierName}</td>
                <td>${order.staffMember || '-'}</td>
                <td><span class="amount">¥${totalAmount.toLocaleString()}</span></td>
                <td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-success edit-btn" onclick="window.managementSystem.editOrder('${order.id}')">編集</button>
                        <button class="btn btn-sm btn-danger delete-btn" onclick="window.managementSystem.deleteOrder('${order.id}')">削除</button>
                    </div>
                </td>
            </tr>
        `;
    }

    // 旧カード関数（互換性のため残す）
    createOrderCard(order) {
        return this.createOrderRow(order);
    }



    // 合計金額を計算
    calculateTotal(items) {
        if (!items || !Array.isArray(items)) return 0;
        return items.reduce((total, item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price || item.unitPrice) || 0;
            return total + (quantity * price);
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

    // 発注書の詳細表示（PDFプレビューとして開く）
    viewOrder(orderId) {
        if (!orderId) return;
        // index.htmlにリダイレクトしてプレビューモードで開く（IDのみ渡す）
        window.location.href = `index.html?preview=${orderId}`;
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
        if (!orderId) return;
        // メインページに移動して編集モードで開く
        window.location.href = `index.html?edit=${orderId}`;
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

        console.log('削除実行開始 ID:', orderId);

        // IDを文字列として比較してフィルタリング
        const originalCount = this.orders.length;
        this.orders = this.orders.filter(o => String(o.id) !== String(orderId));

        console.log(`削除前: ${originalCount}件, 削除後: ${this.orders.length}件`);

        this.saveOrders();

        // 確実に画面を更新するためにリロードする
        location.reload();
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
    window.managementSystem = new OrderManagementSystem();
});
