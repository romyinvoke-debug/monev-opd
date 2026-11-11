// ============================================
// SIMONEV - Log Aktivitas Logic
// ============================================

let logCurrentPage = 1;
const logPerPage = 20;

document.addEventListener('DOMContentLoaded', async () => {
    // Admin only
    const profile = await checkAuth(true);
    if (!profile) return;

    renderSidebar('log');
    initSidebarEvents();
    setCurrentDate();

    // Load data
    await loadLogs();

    // Event listeners
    document.getElementById('btnFilterLog').addEventListener('click', () => {
        logCurrentPage = 1;
        loadLogs();
    });
});

/**
 * Load log aktivitas dengan filter dan pagination
 */
async function loadLogs() {
    const dari = document.getElementById('filterDari').value;
    const sampai = document.getElementById('filterSampai').value;
    const aksi = document.getElementById('filterAksi').value;

    showLoading('logBody');

    try {
        let query = window.supabaseClient
            .from('log_aktivitas')
            .select('*, profiles:user_id(nama_lengkap)', { count: 'exact' });

        // Apply filters
        if (dari) {
            query = query.gte('created_at', dari + 'T00:00:00');
        }
        if (sampai) {
            query = query.lte('created_at', sampai + 'T23:59:59');
        }
        if (aksi) {
            query = query.eq('aksi', aksi);
        }

        // Order & paginate
        query = query.order('created_at', { ascending: false });
        query = query.range(
            (logCurrentPage - 1) * logPerPage,
            logCurrentPage * logPerPage - 1
        );

        const { data, error, count } = await query;

        if (error) throw error;

        // Update total info
        document.getElementById('logTotalInfo').textContent = `${count || 0} aktivitas tercatat`;

        renderLogTable(data || [], count || 0);

    } catch (err) {
        console.error(err);
        showToast('Gagal memuat log aktivitas', 'error');
    }
}

/**
 * Render tabel log aktivitas
 */
function renderLogTable(data, totalCount) {
    const tbody = document.getElementById('logBody');

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6">
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>Belum ada log aktivitas</p>
                </div>
            </td></tr>`;
        document.getElementById('logPagination').innerHTML = '';
        return;
    }

    const offset = (logCurrentPage - 1) * logPerPage;

    tbody.innerHTML = data.map((d, i) => {
        const userName = d.profiles?.nama_lengkap || 'Sistem';

        return `
            <tr class="fade-in">
                <td>${offset + i + 1}</td>
                <td>
                    <span style="white-space: nowrap;">${formatWaktu(d.created_at)}</span>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:28px; height:28px; border-radius:50%; background:var(--accent-cyan-dim); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:var(--accent-cyan); flex-shrink:0;">
                            ${userName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <span>${escapeHtml(userName)}</span>
                    </div>
                </td>
                <td>${getAksiBadge(d.aksi)}</td>
                <td>${escapeHtml(truncateText(d.deskripsi, 60))}</td>
                <td>
                    ${d.tabel_terkait 
                        ? '<span class="badge badge-info">' + escapeHtml(d.tabel_terkait) + '</span>' 
                        : '<span class="text-muted">-</span>'
                    }
                    ${d.record_id ? ' <span class="text-muted">#' + d.record_id + '</span>' : ''}
                </td>
            </tr>`;
    }).join('');

    renderPagination('logPagination', totalCount, logCurrentPage, logPerPage, (page) => {
        logCurrentPage = page;
        loadLogs();
    });
}
