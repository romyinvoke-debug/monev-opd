// ============================================
// SIMONEV - Input Realisasi Logic
// ============================================

let existingRealisasi = null;
let selectedProgramId = null;
let selectedTriwulan = null;

document.addEventListener('DOMContentLoaded', async () => {
    const profile = await checkAuth(true);
    if (!profile) return;

    renderSidebar('realisasi');
    initSidebarEvents();
    setCurrentDate();

    // Populate triwulan dropdown
    document.getElementById('selectTriwulan').innerHTML = getTriwulanOptions();

    // Load program list
    await loadProgramList();

    // Event listeners
    document.getElementById('btnLoadRealisasi').addEventListener('click', loadRealisasiData);
    document.getElementById('btnSimpanRealisasi').addEventListener('click', saveRealisasi);

    // Real-time progress bar updates
    ['targetFisik', 'realisasiFisik'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateProgressBars);
    });
    ['targetKeuangan', 'realisasiKeuangan'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateProgressBars);
    });
});

/**
 * Load daftar program untuk dropdown
 */
async function loadProgramList() {
    try {
        const { data, error } = await window.supabaseClient
            .from('program')
            .select('id, kode_program, nama_program, tahun')
            .order('kode_program');

        if (error) throw error;

        const select = document.getElementById('selectProgram');
        let html = '<option value="">Pilih Program...</option>';
        (data || []).forEach(p => {
            html += `<option value="${p.id}">[${escapeHtml(p.kode_program)}] ${escapeHtml(p.nama_program)} (${p.tahun})</option>`;
        });
        select.innerHTML = html;
    } catch (err) {
        console.error(err);
        showToast('Gagal memuat daftar program', 'error');
    }
}

/**
 * Muat data realisasi berdasarkan program & triwulan terpilih
 */
async function loadRealisasiData() {
    const programId = document.getElementById('selectProgram').value;
    const triwulan = document.getElementById('selectTriwulan').value;

    if (!programId) {
        showToast('Silakan pilih program terlebih dahulu', 'warning');
        return;
    }
    if (!triwulan) {
        showToast('Silakan pilih triwulan', 'warning');
        return;
    }

    selectedProgramId = parseInt(programId);
    selectedTriwulan = triwulan;

    try {
        // Cek apakah data realisasi sudah ada
        const { data, error } = await window.supabaseClient
            .from('realisasi')
            .select('*')
            .eq('program_id', selectedProgramId)
            .eq('triwulan', selectedTriwulan)
            .maybeSingle();

        if (error) throw error;

        const formContainer = document.getElementById('realisasiFormContainer');
        const formBadge = document.getElementById('formBadge');

        if (data) {
            // Data sudah ada - mode edit
            existingRealisasi = data;
            formBadge.innerHTML = '<span class="badge badge-warning">EDIT</span>';
            
            document.getElementById('targetFisik').value = data.target_fisik || '';
            document.getElementById('realisasiFisik').value = data.realisasi_fisik || '';
            document.getElementById('targetKeuangan').value = data.target_keuangan || '';
            document.getElementById('realisasiKeuangan').value = data.realisasi_keuangan || '';
            document.getElementById('permasalahan').value = data.permasalahan || '';
            document.getElementById('tindakLanjut').value = data.tindak_lanjut || '';
            document.getElementById('keterangan').value = data.keterangan || '';
        } else {
            // Data baru
            existingRealisasi = null;
            formBadge.innerHTML = '<span class="badge badge-info">BARU</span>';
            document.getElementById('formRealisasi').reset();
        }

        formContainer.classList.remove('hidden');
        updateProgressBars();

        // Load riwayat
        await loadRealisasiHistory(selectedProgramId);

    } catch (err) {
        console.error(err);
        showToast('Gagal memuat data realisasi', 'error');
    }
}

/**
 * Load riwayat realisasi untuk program terpilih
 */
async function loadRealisasiHistory(programId) {
    const container = document.getElementById('realisasiHistoryContainer');
    const tbody = document.getElementById('realisasiHistoryBody');

    try {
        const { data, error } = await window.supabaseClient
            .from('realisasi')
            .select('*')
            .eq('program_id', programId)
            .order('triwulan');

        if (error) throw error;

        if (!data || data.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');

        const triwulanLabels = { Q1: 'Triwulan 1', Q2: 'Triwulan 2', Q3: 'Triwulan 3', Q4: 'Triwulan 4' };

        tbody.innerHTML = data.map(d => {
            const capaianFisik = d.target_fisik > 0 ? (d.realisasi_fisik / d.target_fisik) * 100 : 0;
            const capaianKeuangan = d.target_keuangan > 0 ? (d.realisasi_keuangan / d.target_keuangan) * 100 : 0;

            return `
                <tr>
                    <td><span class="badge badge-cyan">${triwulanLabels[d.triwulan] || d.triwulan}</span></td>
                    <td>${formatAngka(d.target_fisik)}</td>
                    <td>${formatAngka(d.realisasi_fisik)}</td>
                    <td>${getStatusBadge(capaianFisik)}</td>
                    <td>${formatRupiah(d.target_keuangan)}</td>
                    <td>${formatRupiah(d.realisasi_keuangan)}</td>
                    <td>${getStatusBadge(capaianKeuangan)}</td>
                </tr>`;
        }).join('');

    } catch (err) {
        console.error(err);
    }
}

/**
 * Update progress bars secara real-time
 */
function updateProgressBars() {
    const targetFisik = parseFloat(document.getElementById('targetFisik').value) || 0;
    const realisasiFisik = parseFloat(document.getElementById('realisasiFisik').value) || 0;
    const targetKeuangan = parseFloat(document.getElementById('targetKeuangan').value) || 0;
    const realisasiKeuangan = parseFloat(document.getElementById('realisasiKeuangan').value) || 0;

    // Capaian Fisik
    const capaianFisik = targetFisik > 0 ? (realisasiFisik / targetFisik) * 100 : 0;
    const cappedFisik = Math.min(capaianFisik, 100);
    document.getElementById('previewCapaianFisik').textContent = formatPersen(capaianFisik);
    const progressFisik = document.getElementById('progressFisik');
    progressFisik.style.width = cappedFisik + '%';
    progressFisik.className = 'progress-fill ' + getProgressColor(capaianFisik);

    // Capaian Keuangan
    const capaianKeuangan = targetKeuangan > 0 ? (realisasiKeuangan / targetKeuangan) * 100 : 0;
    const cappedKeuangan = Math.min(capaianKeuangan, 100);
    document.getElementById('previewCapaianKeuangan').textContent = formatPersen(capaianKeuangan);
    const progressKeuangan = document.getElementById('progressKeuangan');
    progressKeuangan.style.width = cappedKeuangan + '%';
    progressKeuangan.className = 'progress-fill ' + getProgressColor(capaianKeuangan);
}

/**
 * Dapatkan class warna progress bar berdasarkan nilai
 */
function getProgressColor(value) {
    if (value >= 80) return 'emerald';
    if (value >= 50) return 'amber';
    return 'red';
}

/**
 * Simpan realisasi (UPSERT)
 */
async function saveRealisasi() {
    if (!selectedProgramId || !selectedTriwulan) {
        showToast('Silakan pilih program dan triwulan terlebih dahulu', 'warning');
        return;
    }

    const targetFisik = parseFloat(document.getElementById('targetFisik').value) || 0;
    const realisasiFisik = parseFloat(document.getElementById('realisasiFisik').value) || 0;
    const targetKeuangan = parseFloat(document.getElementById('targetKeuangan').value) || 0;
    const realisasiKeuangan = parseFloat(document.getElementById('realisasiKeuangan').value) || 0;

    const formData = {
        program_id: selectedProgramId,
        triwulan: selectedTriwulan,
        target_fisik: targetFisik,
        realisasi_fisik: realisasiFisik,
        target_keuangan: targetKeuangan,
        realisasi_keuangan: realisasiKeuangan,
        permasalahan: document.getElementById('permasalahan').value.trim(),
        tindak_lanjut: document.getElementById('tindakLanjut').value.trim(),
        keterangan: document.getElementById('keterangan').value.trim(),
        updated_by: window.currentUser.id,
        updated_at: new Date().toISOString()
    };

    const btn = document.getElementById('btnSimpanRealisasi');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    try {
        const { data, error } = await window.supabaseClient
            .from('realisasi')
            .upsert(formData, { onConflict: 'program_id,triwulan' })
            .select()
            .single();

        if (error) throw error;

        const aksi = existingRealisasi ? 'UPDATE' : 'INSERT';
        const desc = `${aksi === 'UPDATE' ? 'Mengubah' : 'Menambahkan'} realisasi ${selectedTriwulan} untuk program ID ${selectedProgramId}`;
        await logActivity(aksi, desc, 'realisasi', data?.id);

        showToast('Realisasi berhasil disimpan!', 'success');
        existingRealisasi = data;
        document.getElementById('formBadge').innerHTML = '<span class="badge badge-warning">EDIT</span>';

        // Reload history
        await loadRealisasiHistory(selectedProgramId);

    } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan realisasi: ' + (err.message || ''), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Realisasi';
    }
}
