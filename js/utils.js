// ============================================
// SIMONEV - Utility Functions
// ============================================

/**
 * Format angka ke format Rupiah Indonesia
 * @param {number} number - Angka yang akan diformat
 * @returns {string} Format Rupiah: "Rp 1.234.567.890"
 */
window.formatRupiah = function(number) {
    if (number === null || number === undefined || isNaN(number)) return 'Rp 0';
    return 'Rp ' + Number(number).toLocaleString('id-ID');
};

/**
 * Format angka ke format persen Indonesia
 * @param {number} number - Angka persen
 * @returns {string} Format persen: "85,50%"
 */
window.formatPersen = function(number) {
    if (number === null || number === undefined || isNaN(number)) return '0,00%';
    return Number(number).toLocaleString('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + '%';
};

/**
 * Format tanggal ke format Indonesia
 * @param {string} dateStr - String tanggal ISO
 * @returns {string} Format: "11 November 2026"
 */
window.formatTanggal = function(dateStr) {
    if (!dateStr) return '-';
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(dateStr);
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
};

/**
 * Format waktu ke format Indonesia lengkap
 * @param {string} dateStr - String tanggal ISO
 * @returns {string} Format: "11 November 2026, 10:30"
 */
window.formatWaktu = function(dateStr) {
    if (!dateStr) return '-';
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(dateStr);
    const time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + time;
};

/**
 * Format angka desimal biasa
 * @param {number} number
 * @returns {string}
 */
window.formatAngka = function(number) {
    if (number === null || number === undefined || isNaN(number)) return '0';
    return Number(number).toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
};

/**
 * Tampilkan toast notification
 * @param {string} message - Pesan notifikasi
 * @param {string} type - Tipe: 'success', 'error', 'warning', 'info'
 */
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
};

/**
 * Generate badge HTML berdasarkan persentase capaian
 * @param {number} persen - Nilai persentase
 * @returns {string} HTML badge
 */
window.getStatusBadge = function(persen) {
    if (persen === null || persen === undefined) {
        return '<span class="badge badge-info">Belum Ada</span>';
    }
    persen = Number(persen);
    if (persen >= 80) return '<span class="badge badge-success">' + formatPersen(persen) + '</span>';
    if (persen >= 50) return '<span class="badge badge-warning">' + formatPersen(persen) + '</span>';
    return '<span class="badge badge-danger">' + formatPersen(persen) + '</span>';
};

/**
 * Generate badge aksi untuk log aktivitas
 * @param {string} aksi - Jenis aksi
 * @returns {string} HTML badge
 */
window.getAksiBadge = function(aksi) {
    const map = {
        'INSERT': 'badge-success',
        'UPDATE': 'badge-info',
        'DELETE': 'badge-danger',
        'EXPORT': 'badge-cyan',
        'LOGIN': 'badge-warning'
    };
    const cls = map[aksi] || 'badge-info';
    return '<span class="badge ' + cls + '">' + escapeHtml(aksi) + '</span>';
};

/**
 * Debounce function
 * @param {Function} fn - Fungsi yang akan di-debounce
 * @param {number} delay - Delay dalam ms
 * @returns {Function} Debounced function
 */
window.debounce = function(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
};

/**
 * Escape HTML entities
 * @param {string} str - String yang akan di-escape
 * @returns {string} Escaped string
 */
window.escapeHtml = function(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

/**
 * Truncate text dengan ellipsis
 * @param {string} str - String yang akan dipotong
 * @param {number} maxLength - Panjang maksimal
 * @returns {string}
 */
window.truncateText = function(str, maxLength = 50) {
    if (!str) return '-';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
};

/**
 * Tampilkan loading spinner di container
 * @param {string|HTMLElement} container - ID atau element
 */
window.showLoading = function(container) {
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
};

/**
 * Set tanggal saat ini di header
 */
window.setCurrentDate = function() {
    const el = document.getElementById('currentDate');
    if (el) el.textContent = formatTanggal(new Date().toISOString());
};

/**
 * Generate HTML options untuk dropdown Bidang
 * @param {string} selected - Nilai yang dipilih
 * @param {boolean} includeAll - Tambahkan opsi "Semua Bidang"
 * @returns {string} HTML options
 */
window.getBidangOptions = function(selected, includeAll = true) {
    let html = includeAll ? '<option value="">Semua Bidang</option>' : '<option value="">Pilih Bidang</option>';
    window.BIDANG_LIST.forEach(b => {
        html += '<option value="' + b + '"' + (b === selected ? ' selected' : '') + '>' + b + '</option>';
    });
    return html;
};

/**
 * Generate HTML options untuk dropdown Tahun
 * @param {string|number} selected - Nilai yang dipilih
 * @param {boolean} includeAll - Tambahkan opsi "Semua Tahun"
 * @returns {string} HTML options
 */
window.getTahunOptions = function(selected, includeAll = true) {
    let html = includeAll ? '<option value="">Semua Tahun</option>' : '<option value="">Pilih Tahun</option>';
    window.TAHUN_LIST.forEach(t => {
        html += '<option value="' + t + '"' + (t == selected ? ' selected' : '') + '>' + t + '</option>';
    });
    return html;
};

/**
 * Generate HTML options untuk dropdown Triwulan
 * @param {string} selected - Nilai yang dipilih
 * @param {boolean} includeAll - Tambahkan opsi "Semua Triwulan"
 * @returns {string} HTML options
 */
window.getTriwulanOptions = function(selected, includeAll = false) {
    let html = includeAll 
        ? '<option value="">Semua Triwulan</option>' 
        : '<option value="">Pilih Triwulan</option>';
    const labels = {
        Q1: 'Triwulan 1 (Jan - Mar)',
        Q2: 'Triwulan 2 (Apr - Jun)',
        Q3: 'Triwulan 3 (Jul - Sep)',
        Q4: 'Triwulan 4 (Okt - Des)'
    };
    window.TRIWULAN_LIST.forEach(q => {
        html += '<option value="' + q + '"' + (q === selected ? ' selected' : '') + '>' + labels[q] + '</option>';
    });
    return html;
};

/**
 * Generate pagination HTML dan setup event handlers
 * @param {string} containerId - ID container pagination
 * @param {number} totalItems - Total item
 * @param {number} currentPage - Halaman saat ini
 * @param {number} perPage - Item per halaman
 * @param {Function} onPageChange - Callback saat halaman berubah
 */
window.renderPagination = function(containerId, totalItems, currentPage, perPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.ceil(totalItems / perPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += '<button class="page-btn" ' + (currentPage <= 1 ? 'disabled' : '') + 
            ' data-page="' + (currentPage - 1) + '"><i class="fas fa-chevron-left"></i></button>';
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += '<button class="page-btn" data-page="1">1</button>';
        if (startPage > 2) html += '<span class="page-dots">...</span>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<span class="page-dots">...</span>';
        html += '<button class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
    }
    
    // Next button
    html += '<button class="page-btn" ' + (currentPage >= totalPages ? 'disabled' : '') + 
            ' data-page="' + (currentPage + 1) + '"><i class="fas fa-chevron-right"></i></button>';
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page && page !== currentPage) onPageChange(page);
        });
    });
};

/**
 * Buka modal
 * @param {string} modalId - ID modal overlay
 */
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

/**
 * Tutup modal
 * @param {string} modalId - ID modal overlay
 */
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};
