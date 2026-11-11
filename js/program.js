// ============================================
// SIMONEV - Program CRUD Logic
// ============================================

let programCurrentPage = 1;
const programPerPage = 15;
let deleteId = null;
let editMode = false;

document.addEventListener('DOMContentLoaded', async () => {
    const profile = await checkAuth(true);
    if (!profile) return;

    renderSidebar('program');
    initSidebarEvents();
    setCurrentDate();

    // Populate filters
    document.getElementById('filterTahun').innerHTML = getTahunOptions();
    document.getElementById('filterBidang').innerHTML = getBidangOptions();
    document.getElementById('fTahun').innerHTML = getTahunOptions(new Date().getFullYear(), false);
    document.getElementById('fBidang').innerHTML = getBidangOptions(null, false);

    // Load data
    await loadPrograms();

    // Event listeners
    document.getElementById('btnTambahProgram').addEventListener('click', openAddModal);
    document.getElementById('btnSimpanProgram').addEventListener('click', saveProgram);
    document.getElementById('btnKonfirmasiHapus').addEventListener('click', confirmDelete);

    document.getElementById('filterTahun').addEventListener('change', () => { programCurrentPage = 1; loadPrograms(); });
    document.getElementById('filterBidang').addEventListener('change', () => { programCurrentPage = 1; loadPrograms(); });

    document.getElementById('searchProgram').addEventListener('input', debounce(() => {
        programCurrentPage = 1;
        loadPrograms();
    }, 400));

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
});

/**
 * Load daftar program
 */
async function loadPrograms() {
    const tahun = document.getElementById('filterTahun').value;
    const bidang = document.getElementById('filterBidang').value;
    const search = document.getElementById('searchProgram').value.trim();
    const tbody = document.getElementById('programBody');

    showLoading('programBody');

    try {
        let query = window.supabaseClient
            .from('program')
            .select('*', { count: 'exact' });

        if (tahun) query = query.eq('tahun', parseInt(tahun));
        if (bidang) query = query.eq('bidang', bidang);
        if (search) {
            query = query.or(`nama_program.ilike.%${search}%,nama_kegiatan.ilike.%${search}%,kode_program.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false });
        query = query.range(
            (programCurrentPage - 1) * programPerPage,
            programCurrentPage * programPerPage - 1
        );

        const { data, error, count } = await query;

        if (error) {
            showToast('Gagal memuat data program', 'error');
            console.error(error);
            return;
        }

        renderProgramTable(data || [], count || 0);
    } catch (err) {
        console.error(err);
        showToast('Terjadi kesalahan', 'error');
    }
}

/**
 * Render tabel program
 */
function renderProgramTable(data, totalCount) {
    const tbody = document.getElementById('programBody');

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="9">
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>Belum ada data program</p>
                </div>
            </td></tr>`;
        document.getElementById('programPagination').innerHTML = '';
        return;
    }

    const offset = (programCurrentPage - 1) * programPerPage;

    tbody.innerHTML = data.map((d, i) => `
        <tr class="fade-in">
            <td>${offset + i + 1}</td>
            <td><span class="badge badge-cyan">${escapeHtml(d.kode_program || '-')}</span></td>
            <td>${escapeHtml(d.nama_program || '-')}</td>
            <td>${escapeHtml(truncateText(d.nama_kegiatan, 40))}</td>
            <td>${escapeHtml(truncateText(d.indikator_kinerja, 40))}</td>
            <td>${formatAngka(d.target_tahunan)} ${escapeHtml(d.satuan || '')}</td>
            <td>${formatRupiah(d.pagu_anggaran)}</td>
            <td><span class="badge badge-info">${escapeHtml(d.bidang || '-')}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-warning btn-sm" onclick="openEditModal(${d.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${d.id})" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    renderPagination('programPagination', totalCount, programCurrentPage, programPerPage, (page) => {
        programCurrentPage = page;
        loadPrograms();
    });
}

/**
 * Buka modal tambah program
 */
function openAddModal() {
    editMode = false;
    document.getElementById('modalProgramTitle').textContent = 'Tambah Program/Kegiatan';
    document.getElementById('formProgram').reset();
    document.getElementById('programId').value = '';
    document.getElementById('fTahun').innerHTML = getTahunOptions(new Date().getFullYear(), false);
    document.getElementById('fBidang').innerHTML = getBidangOptions(null, false);
    openModal('modalProgram');
}

/**
 * Buka modal edit program
 */
async function openEditModal(id) {
    editMode = true;
    document.getElementById('modalProgramTitle').textContent = 'Edit Program/Kegiatan';

    try {
        const { data, error } = await window.supabaseClient
            .from('program')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            showToast('Gagal memuat data program', 'error');
            return;
        }

        document.getElementById('programId').value = data.id;
        document.getElementById('fKodeProgram').value = data.kode_program || '';
        document.getElementById('fNamaProgram').value = data.nama_program || '';
        document.getElementById('fKodeKegiatan').value = data.kode_kegiatan || '';
        document.getElementById('fNamaKegiatan').value = data.nama_kegiatan || '';
        document.getElementById('fKodeSubKegiatan').value = data.kode_sub_kegiatan || '';
        document.getElementById('fNamaSubKegiatan').value = data.nama_sub_kegiatan || '';
        document.getElementById('fIndikator').value = data.indikator_kinerja || '';
        document.getElementById('fSatuan').value = data.satuan || '';
        document.getElementById('fTargetTahunan').value = data.target_tahunan || '';
        document.getElementById('fPaguAnggaran').value = data.pagu_anggaran || '';
        document.getElementById('fTahun').innerHTML = getTahunOptions(data.tahun, false);
        document.getElementById('fBidang').innerHTML = getBidangOptions(data.bidang, false);

        openModal('modalProgram');
    } catch (err) {
        console.error(err);
        showToast('Terjadi kesalahan', 'error');
    }
}

/**
 * Simpan program (insert atau update)
 */
async function saveProgram() {
    const id = document.getElementById('programId').value;
    const formData = {
        kode_program: document.getElementById('fKodeProgram').value.trim(),
        nama_program: document.getElementById('fNamaProgram').value.trim(),
        kode_kegiatan: document.getElementById('fKodeKegiatan').value.trim(),
        nama_kegiatan: document.getElementById('fNamaKegiatan').value.trim(),
        kode_sub_kegiatan: document.getElementById('fKodeSubKegiatan').value.trim(),
        nama_sub_kegiatan: document.getElementById('fNamaSubKegiatan').value.trim(),
        indikator_kinerja: document.getElementById('fIndikator').value.trim(),
        satuan: document.getElementById('fSatuan').value.trim(),
        target_tahunan: parseFloat(document.getElementById('fTargetTahunan').value) || 0,
        pagu_anggaran: parseFloat(document.getElementById('fPaguAnggaran').value) || 0,
        tahun: parseInt(document.getElementById('fTahun').value),
        bidang: document.getElementById('fBidang').value
    };

    // Validasi
    if (!formData.kode_program || !formData.nama_program || !formData.indikator_kinerja || !formData.tahun || !formData.bidang) {
        showToast('Harap lengkapi semua field yang wajib diisi', 'warning');
        return;
    }

    const btn = document.getElementById('btnSimpanProgram');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    try {
        if (editMode && id) {
            // Update
            const { error } = await window.supabaseClient
                .from('program')
                .update(formData)
                .eq('id', parseInt(id));

            if (error) throw error;

            await logActivity('UPDATE', `Mengubah program: ${formData.nama_program}`, 'program', parseInt(id));
            showToast('Program berhasil diperbarui', 'success');
        } else {
            // Insert
            formData.created_by = window.currentUser.id;
            const { data, error } = await window.supabaseClient
                .from('program')
                .insert(formData)
                .select()
                .single();

            if (error) throw error;

            await logActivity('INSERT', `Menambahkan program: ${formData.nama_program}`, 'program', data?.id);
            showToast('Program berhasil ditambahkan', 'success');
        }

        closeModal('modalProgram');
        await loadPrograms();
    } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan program: ' + (err.message || ''), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan';
    }
}

/**
 * Buka modal konfirmasi hapus
 */
function openDeleteModal(id) {
    deleteId = id;
    openModal('modalHapus');
}

/**
 * Konfirmasi hapus program
 */
async function confirmDelete() {
    if (!deleteId) return;

    const btn = document.getElementById('btnKonfirmasiHapus');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghapus...';

    try {
        // Get program name for log
        const { data: prog } = await window.supabaseClient
            .from('program')
            .select('nama_program')
            .eq('id', deleteId)
            .single();

        const { error } = await window.supabaseClient
            .from('program')
            .delete()
            .eq('id', deleteId);

        if (error) throw error;

        await logActivity('DELETE', `Menghapus program: ${prog?.nama_program || 'ID ' + deleteId}`, 'program', deleteId);
        showToast('Program berhasil dihapus', 'success');

        closeModal('modalHapus');
        deleteId = null;
        await loadPrograms();
    } catch (err) {
        console.error(err);
        showToast('Gagal menghapus program: ' + (err.message || ''), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i> Hapus';
    }
}
