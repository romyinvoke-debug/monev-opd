// ============================================
// SIMONEV - Dashboard Logic
// ============================================

// Chart instances
let chartCapaianFisik = null;
let chartAnggaran = null;
let chartTriwulan = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Auth check
    const profile = await checkAuth();
    if (!profile) return;

    renderSidebar('dashboard');
    initSidebarEvents();
    setCurrentDate();

    // Setup Chart.js defaults
    Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Populate filters
    document.getElementById('filterTahun').innerHTML = getTahunOptions(new Date().getFullYear());
    document.getElementById('filterBidang').innerHTML = getBidangOptions();

    // Load data
    await loadDashboardData();

    // Filter button
    document.getElementById('btnFilter').addEventListener('click', () => loadDashboardData());
});

/**
 * Load semua data dashboard
 */
async function loadDashboardData() {
    const tahun = document.getElementById('filterTahun').value;
    const bidang = document.getElementById('filterBidang').value;

    try {
        // Fetch dari v_capaian_summary
        let query = window.supabaseClient.from('v_capaian_summary').select('*');
        if (tahun) query = query.eq('tahun', parseInt(tahun));
        if (bidang) query = query.eq('bidang', bidang);

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching data:', error);
            showToast('Gagal memuat data dashboard', 'error');
            return;
        }

        const summaryData = data || [];

        // Update stats
        updateStats(summaryData);

        // Render charts
        await renderCharts(summaryData, tahun, bidang);

        // Render table
        renderTable(summaryData);

    } catch (err) {
        console.error('Dashboard error:', err);
        showToast('Terjadi kesalahan saat memuat dashboard', 'error');
    }
}

/**
 * Update stat cards
 */
function updateStats(data) {
    // Total Program
    document.getElementById('statTotalProgram').textContent = data.length;

    // Rata-rata Capaian Fisik
    const avgCapaian = data.length > 0
        ? data.reduce((sum, d) => sum + (Number(d.persen_capaian_fisik) || 0), 0) / data.length
        : 0;
    document.getElementById('statCapaianFisik').textContent = formatPersen(avgCapaian);

    // Total Pagu Anggaran
    const totalPagu = data.reduce((sum, d) => sum + (Number(d.pagu_anggaran) || 0), 0);
    document.getElementById('statTotalPagu').textContent = formatRupiah(totalPagu);

    // Total Realisasi Keuangan
    const totalRealisasi = data.reduce((sum, d) => sum + (Number(d.total_realisasi_keuangan) || 0), 0);
    document.getElementById('statRealisasiKeuangan').textContent = formatRupiah(totalRealisasi);
}

/**
 * Render semua charts
 */
async function renderCharts(data, tahun, bidang) {
    renderCapaianFisikChart(data);
    renderAnggaranChart(data);
    await renderTriwulanChart(tahun, bidang);
}

/**
 * Chart 1: Horizontal Bar - Capaian Fisik per Program (Top 10)
 */
function renderCapaianFisikChart(data) {
    const canvas = document.getElementById('chartCapaianFisik');
    if (chartCapaianFisik) chartCapaianFisik.destroy();

    // Sort dan ambil top 10
    const sorted = [...data]
        .filter(d => d.persen_capaian_fisik !== null)
        .sort((a, b) => (Number(b.persen_capaian_fisik) || 0) - (Number(a.persen_capaian_fisik) || 0))
        .slice(0, 10);

    const labels = sorted.map(d => {
        const name = d.nama_program || '';
        return name.length > 35 ? name.substring(0, 35) + '...' : name;
    });
    const values = sorted.map(d => Number(d.persen_capaian_fisik) || 0);
    const colors = values.map(v => {
        if (v >= 80) return 'rgba(0, 230, 118, 0.8)';
        if (v >= 50) return 'rgba(255, 179, 0, 0.8)';
        return 'rgba(255, 82, 82, 0.8)';
    });

    chartCapaianFisik = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Capaian Fisik (%)',
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.8', '1')),
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ' ' + formatPersen(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { callback: v => v + '%' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                }
            }
        }
    });
}

/**
 * Chart 2: Doughnut - Realisasi vs Sisa Anggaran
 */
function renderAnggaranChart(data) {
    const canvas = document.getElementById('chartAnggaran');
    if (chartAnggaran) chartAnggaran.destroy();

    const totalPagu = data.reduce((sum, d) => sum + (Number(d.pagu_anggaran) || 0), 0);
    const totalRealisasi = data.reduce((sum, d) => sum + (Number(d.total_realisasi_keuangan) || 0), 0);
    const sisa = Math.max(0, totalPagu - totalRealisasi);
    const persen = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : 0;

    chartAnggaran = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Realisasi', 'Sisa Anggaran'],
            datasets: [{
                data: [totalRealisasi, sisa],
                backgroundColor: ['rgba(0, 212, 255, 0.8)', 'rgba(255, 255, 255, 0.08)'],
                borderColor: ['rgba(0, 212, 255, 1)', 'rgba(255, 255, 255, 0.15)'],
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ' ' + ctx.label + ': ' + formatRupiah(ctx.raw)
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function(chart) {
                const { width, height, ctx: context } = chart;
                context.save();
                const fontSize = Math.min(width, height) / 8;
                context.font = `800 ${fontSize}px Inter`;
                context.fillStyle = '#ffffff';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                context.fillText(persen + '%', centerX, centerY);
                context.restore();
            }
        }]
    });
}

/**
 * Chart 3: Grouped Bar - Target vs Realisasi per Triwulan
 */
async function renderTriwulanChart(tahun, bidang) {
    const canvas = document.getElementById('chartTriwulan');
    if (chartTriwulan) chartTriwulan.destroy();

    try {
        // Fetch realisasi data
        let query = window.supabaseClient
            .from('realisasi')
            .select('triwulan, target_fisik, realisasi_fisik, program:program_id(tahun, bidang)');

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching triwulan data:', error);
            return;
        }

        // Filter by tahun and bidang
        let filtered = data || [];
        if (tahun) filtered = filtered.filter(d => d.program?.tahun == tahun);
        if (bidang) filtered = filtered.filter(d => d.program?.bidang === bidang);

        // Aggregate by triwulan
        const triwulanData = { Q1: { target: 0, realisasi: 0 }, Q2: { target: 0, realisasi: 0 }, Q3: { target: 0, realisasi: 0 }, Q4: { target: 0, realisasi: 0 } };
        filtered.forEach(d => {
            if (triwulanData[d.triwulan]) {
                triwulanData[d.triwulan].target += Number(d.target_fisik) || 0;
                triwulanData[d.triwulan].realisasi += Number(d.realisasi_fisik) || 0;
            }
        });

        chartTriwulan = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['Triwulan 1', 'Triwulan 2', 'Triwulan 3', 'Triwulan 4'],
                datasets: [
                    {
                        label: 'Target',
                        data: [triwulanData.Q1.target, triwulanData.Q2.target, triwulanData.Q3.target, triwulanData.Q4.target],
                        backgroundColor: 'rgba(255, 179, 0, 0.7)',
                        borderColor: 'rgba(255, 179, 0, 1)',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Realisasi',
                        data: [triwulanData.Q1.realisasi, triwulanData.Q2.realisasi, triwulanData.Q3.realisasi, triwulanData.Q4.realisasi],
                        backgroundColor: 'rgba(0, 212, 255, 0.7)',
                        borderColor: 'rgba(0, 212, 255, 1)',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });

    } catch (err) {
        console.error('Triwulan chart error:', err);
    }
}

/**
 * Render tabel ringkasan program
 */
function renderTable(data) {
    const tbody = document.getElementById('ringkasanBody');

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7">
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Belum ada data program</p>
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = data.map((d, i) => {
        const capaian = Number(d.persen_capaian_fisik) || 0;
        return `
            <tr class="fade-in">
                <td>${i + 1}</td>
                <td><span class="badge badge-cyan">${escapeHtml(d.kode_program || '-')}</span></td>
                <td>${escapeHtml(d.nama_program || '-')}</td>
                <td>${formatAngka(d.target_tahunan)} ${escapeHtml(d.satuan || '')}</td>
                <td>${formatAngka(d.total_realisasi_fisik)}</td>
                <td>${formatPersen(capaian)}</td>
                <td>${getStatusBadge(capaian)}</td>
            </tr>`;
    }).join('');
}
