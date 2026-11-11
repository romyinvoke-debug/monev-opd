// ============================================
// SIMONEV - Laporan & Export Excel Logic
// ============================================

let laporanCurrentPage = 1;
const laporanPerPage = 20;
let laporanData = [];       // Data untuk tabel
let laporanAllData = [];    // Data lengkap untuk export

document.addEventListener('DOMContentLoaded', async () => {
    // Semua role bisa akses (viewer + admin)
    const profile = await checkAuth();
    if (!profile) return;

    renderSidebar('laporan');
    initSidebarEvents();
    setCurrentDate();

    // Populate filters
    document.getElementById('filterTahun').innerHTML = getTahunOptions(new Date().getFullYear());
    document.getElementById('filterTriwulan').innerHTML = getTriwulanOptions(null, true);
    document.getElementById('filterBidang').innerHTML = getBidangOptions();

    // Sembunyikan tombol export untuk viewer
    if (!isAdmin()) {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }

    // Load data
    await loadLaporan();

    // Event listeners
    document.getElementById('btnFilter').addEventListener('click', () => {
        laporanCurrentPage = 1;
        loadLaporan();
    });

    document.getElementById('btnExportExcel').addEventListener('click', exportExcel);
});

/**
 * Load data laporan
 */
async function loadLaporan() {
    const tahun = document.getElementById('filterTahun').value;
    const triwulan = document.getElementById('filterTriwulan').value;
    const bidang = document.getElementById('filterBidang').value;

    showLoading('laporanBody');

    try {
        // Fetch program beserta realisasi
        let query = window.supabaseClient
            .from('program')
            .select(`
                id, kode_program, nama_program, kode_kegiatan, nama_kegiatan,
                indikator_kinerja, satuan, target_tahunan, pagu_anggaran, tahun, bidang,
                realisasi (
                    id, triwulan, target_fisik, realisasi_fisik,
                    target_keuangan, realisasi_keuangan,
                    permasalahan, tindak_lanjut, keterangan
                )
            `);

        if (tahun) query = query.eq('tahun', parseInt(tahun));
        if (bidang) query = query.eq('bidang', bidang);
        query = query.order('kode_program');

        const { data, error } = await query;

        if (error) throw error;

        // Proses data: aggregate realisasi per program
        laporanAllData = (data || []).map(program => {
            let realisasiList = program.realisasi || [];

            // Filter triwulan jika dipilih
            if (triwulan) {
                realisasiList = realisasiList.filter(r => r.triwulan === triwulan);
            }

            const totalTargetFisik = realisasiList.reduce((s, r) => s + (Number(r.target_fisik) || 0), 0);
            const totalRealisasiFisik = realisasiList.reduce((s, r) => s + (Number(r.realisasi_fisik) || 0), 0);
            const totalTargetKeuangan = realisasiList.reduce((s, r) => s + (Number(r.target_keuangan) || 0), 0);
            const totalRealisasiKeuangan = realisasiList.reduce((s, r) => s + (Number(r.realisasi_keuangan) || 0), 0);
            const capaianFisik = totalTargetFisik > 0 ? (totalRealisasiFisik / totalTargetFisik) * 100 : 0;
            const capaianKeuangan = totalTargetKeuangan > 0 ? (totalRealisasiKeuangan / totalTargetKeuangan) * 100 : 0;

            // Kumpulkan permasalahan & tindak lanjut
            const permasalahan = realisasiList
                .filter(r => r.permasalahan)
                .map(r => `[${r.triwulan}] ${r.permasalahan}`)
                .join('\n');
            const tindakLanjut = realisasiList
                .filter(r => r.tindak_lanjut)
                .map(r => `[${r.triwulan}] ${r.tindak_lanjut}`)
                .join('\n');

            return {
                ...program,
                totalTargetFisik,
                totalRealisasiFisik,
                totalTargetKeuangan,
                totalRealisasiKeuangan,
                capaianFisik,
                capaianKeuangan,
                permasalahanGabungan: permasalahan,
                tindakLanjutGabungan: tindakLanjut,
                realisasiDetail: program.realisasi || []
            };
        });

        // Info total
        document.getElementById('totalDataInfo').textContent = `${laporanAllData.length} program ditemukan`;

        // Paginate
        const start = (laporanCurrentPage - 1) * laporanPerPage;
        const end = start + laporanPerPage;
        laporanData = laporanAllData.slice(start, end);

        renderLaporanTable(laporanData, laporanAllData.length);

    } catch (err) {
        console.error(err);
        showToast('Gagal memuat data laporan', 'error');
    }
}

/**
 * Render tabel laporan
 */
function renderLaporanTable(data, totalCount) {
    const tbody = document.getElementById('laporanBody');

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="12">
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>Belum ada data laporan untuk filter yang dipilih</p>
                </div>
            </td></tr>`;
        document.getElementById('laporanPagination').innerHTML = '';
        return;
    }

    const offset = (laporanCurrentPage - 1) * laporanPerPage;

    tbody.innerHTML = data.map((d, i) => `
        <tr class="fade-in">
            <td>${offset + i + 1}</td>
            <td><span class="badge badge-cyan">${escapeHtml(d.kode_program || '-')}</span></td>
            <td>${escapeHtml(d.nama_program || '-')}</td>
            <td>${escapeHtml(truncateText(d.indikator_kinerja, 50))}</td>
            <td>${formatAngka(d.totalTargetFisik)}</td>
            <td>${formatAngka(d.totalRealisasiFisik)}</td>
            <td>${getStatusBadge(d.capaianFisik)}</td>
            <td>${formatRupiah(d.totalTargetKeuangan)}</td>
            <td>${formatRupiah(d.totalRealisasiKeuangan)}</td>
            <td>${getStatusBadge(d.capaianKeuangan)}</td>
            <td title="${escapeHtml(d.permasalahanGabungan)}">${escapeHtml(truncateText(d.permasalahanGabungan, 40))}</td>
            <td title="${escapeHtml(d.tindakLanjutGabungan)}">${escapeHtml(truncateText(d.tindakLanjutGabungan, 40))}</td>
        </tr>
    `).join('');

    renderPagination('laporanPagination', totalCount, laporanCurrentPage, laporanPerPage, (page) => {
        laporanCurrentPage = page;
        const start = (page - 1) * laporanPerPage;
        const end = start + laporanPerPage;
        laporanData = laporanAllData.slice(start, end);
        renderLaporanTable(laporanData, totalCount);
    });
}

/**
 * Export data ke Excel menggunakan SheetJS
 */
async function exportExcel() {
    if (!isAdmin()) {
        showToast('Hanya admin yang dapat mengexport data', 'error');
        return;
    }

    if (laporanAllData.length === 0) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }

    const btn = document.getElementById('btnExportExcel');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengexport...';

    try {
        const tahun = document.getElementById('filterTahun').value || 'Semua';
        const triwulan = document.getElementById('filterTriwulan').value || 'Semua';
        const bidang = document.getElementById('filterBidang').value || 'Semua';

        const wb = XLSX.utils.book_new();

        // ===== Sheet 1: Rekapitulasi =====
        const sheet1Data = [];

        // Header rows
        sheet1Data.push(['LAPORAN MONITORING DAN EVALUASI KINERJA OPD']);
        sheet1Data.push([window.NAMA_DINAS]);
        sheet1Data.push([`Tahun: ${tahun} | Triwulan: ${triwulan} | Bidang: ${bidang}`]);
        sheet1Data.push([`Dicetak: ${formatTanggal(new Date().toISOString())}`]);
        sheet1Data.push([]); // Empty row

        // Column headers
        sheet1Data.push([
            'No', 'Kode Program', 'Nama Program', 'Indikator Kinerja', 'Satuan',
            'Target Fisik', 'Realisasi Fisik', 'Capaian Fisik (%)',
            'Target Keuangan (Rp)', 'Realisasi Keuangan (Rp)', 'Capaian Keuangan (%)',
            'Permasalahan', 'Tindak Lanjut'
        ]);

        // Data rows
        laporanAllData.forEach((d, i) => {
            sheet1Data.push([
                i + 1,
                d.kode_program || '-',
                d.nama_program || '-',
                d.indikator_kinerja || '-',
                d.satuan || '-',
                d.totalTargetFisik,
                d.totalRealisasiFisik,
                Math.round(d.capaianFisik * 100) / 100,
                d.totalTargetKeuangan,
                d.totalRealisasiKeuangan,
                Math.round(d.capaianKeuangan * 100) / 100,
                d.permasalahanGabungan || '-',
                d.tindakLanjutGabungan || '-'
            ]);
        });

        const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

        // Set column widths
        ws1['!cols'] = [
            { wch: 5 },   // No
            { wch: 15 },  // Kode
            { wch: 35 },  // Nama Program
            { wch: 30 },  // Indikator
            { wch: 10 },  // Satuan
            { wch: 14 },  // Target Fisik
            { wch: 14 },  // Realisasi Fisik
            { wch: 14 },  // Capaian Fisik
            { wch: 20 },  // Target Keuangan
            { wch: 20 },  // Realisasi Keuangan
            { wch: 16 },  // Capaian Keuangan
            { wch: 30 },  // Permasalahan
            { wch: 30 }   // Tindak Lanjut
        ];

        // Merge title cells
        ws1['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 12 } }
        ];

        XLSX.utils.book_append_sheet(wb, ws1, 'Rekapitulasi');

        // ===== Sheet 2: Detail per Triwulan =====
        const sheet2Data = [];

        sheet2Data.push(['DETAIL REALISASI PER TRIWULAN']);
        sheet2Data.push([window.NAMA_DINAS]);
        sheet2Data.push([`Tahun: ${tahun} | Bidang: ${bidang}`]);
        sheet2Data.push([]);

        // Headers
        sheet2Data.push([
            'No', 'Kode Program', 'Nama Program', 'Triwulan',
            'Target Fisik', 'Realisasi Fisik', 'Capaian Fisik (%)',
            'Target Keuangan (Rp)', 'Realisasi Keuangan (Rp)', 'Capaian Keuangan (%)',
            'Permasalahan', 'Tindak Lanjut', 'Keterangan'
        ]);

        let rowNum = 0;
        const triwulanLabels = { Q1: 'Triwulan 1', Q2: 'Triwulan 2', Q3: 'Triwulan 3', Q4: 'Triwulan 4' };

        laporanAllData.forEach(d => {
            const details = d.realisasiDetail || [];
            const sortedDetails = [...details].sort((a, b) => a.triwulan.localeCompare(b.triwulan));

            sortedDetails.forEach(r => {
                rowNum++;
                const cFisik = r.target_fisik > 0 ? (r.realisasi_fisik / r.target_fisik) * 100 : 0;
                const cKeuangan = r.target_keuangan > 0 ? (r.realisasi_keuangan / r.target_keuangan) * 100 : 0;

                sheet2Data.push([
                    rowNum,
                    d.kode_program || '-',
                    d.nama_program || '-',
                    triwulanLabels[r.triwulan] || r.triwulan,
                    Number(r.target_fisik) || 0,
                    Number(r.realisasi_fisik) || 0,
                    Math.round(cFisik * 100) / 100,
                    Number(r.target_keuangan) || 0,
                    Number(r.realisasi_keuangan) || 0,
                    Math.round(cKeuangan * 100) / 100,
                    r.permasalahan || '-',
                    r.tindak_lanjut || '-',
                    r.keterangan || '-'
                ]);
            });
        });

        const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

        ws2['!cols'] = [
            { wch: 5 },   // No
            { wch: 15 },  // Kode
            { wch: 35 },  // Nama Program
            { wch: 14 },  // Triwulan
            { wch: 14 },  // Target Fisik
            { wch: 14 },  // Realisasi Fisik
            { wch: 14 },  // Capaian Fisik
            { wch: 20 },  // Target Keuangan
            { wch: 20 },  // Realisasi Keuangan
            { wch: 16 },  // Capaian Keuangan
            { wch: 30 },  // Permasalahan
            { wch: 30 },  // Tindak Lanjut
            { wch: 25 }   // Keterangan
        ];

        ws2['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } }
        ];

        XLSX.utils.book_append_sheet(wb, ws2, 'Detail per Triwulan');

        // Generate & download
        const fileName = `Laporan_Monev_OPD_${tahun}_${triwulan}.xlsx`;
        XLSX.writeFile(wb, fileName);

        // Log activity
        await logActivity('EXPORT', `Export laporan Excel: ${fileName}`, 'program', null);
        showToast('Laporan berhasil diexport ke Excel!', 'success');

    } catch (err) {
        console.error(err);
        showToast('Gagal mengexport laporan: ' + (err.message || ''), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-file-excel"></i> Export Excel';
    }
}
