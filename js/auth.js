// ============================================
// SIMONEV - Authentication & Authorization
// ============================================

window.currentUser = null;
window.currentProfile = null;

/**
 * Cek sesi autentikasi dan muat profil pengguna
 * @param {boolean} requireAdmin - Jika true, redirect viewer ke dashboard
 * @returns {Object|null} Profil pengguna atau null
 */
window.checkAuth = async function(requireAdmin = false) {
    try {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = 'index.html';
            return null;
        }
        
        window.currentUser = session.user;
        
        // Ambil profil dari tabel profiles
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
        
        if (profileError || !profile) {
            console.error('Profil tidak ditemukan:', profileError);
            // Buat profil dasar jika belum ada
            const { data: newProfile } = await window.supabaseClient
                .from('profiles')
                .upsert({
                    id: session.user.id,
                    nama_lengkap: session.user.user_metadata?.nama_lengkap || 'User Baru',
                    role: 'viewer'
                })
                .select()
                .single();
            window.currentProfile = newProfile || {
                id: session.user.id,
                nama_lengkap: 'User Baru',
                role: 'viewer'
            };
        } else {
            window.currentProfile = profile;
        }
        
        // Guard admin-only pages
        if (requireAdmin && window.currentProfile.role !== 'admin') {
            showToast('Anda tidak memiliki akses ke halaman ini', 'error');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
            return null;
        }
        
        return window.currentProfile;
    } catch (err) {
        console.error('Gagal memeriksa autentikasi:', err);
        window.location.href = 'index.html';
        return null;
    }
};

/**
 * Cek sesi yang sudah ada (untuk halaman login)
 * Redirect ke dashboard jika sudah login
 * @returns {boolean}
 */
window.checkExistingSession = async function() {
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            window.location.href = 'dashboard.html';
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
};

/**
 * Login dengan email dan password
 * @param {string} email
 * @param {string} password
 * @returns {Object} { user, error }
 */
window.login = async function(email, password) {
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        if (error) return { user: null, error: error.message };
        return { user: data.user, error: null };
    } catch (err) {
        return { user: null, error: err.message };
    }
};

/**
 * Register pengguna baru
 * @param {Object} data - { email, password, nama_lengkap, nip, jabatan, bidang }
 * @returns {Object} { user, error }
 */
window.register = async function({ email, password, nama_lengkap, nip, jabatan, bidang }) {
    try {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { nama_lengkap }
            }
        });
        
        if (error) return { user: null, error: error.message };
        
        // Update profil dengan field tambahan
        // Trigger handle_new_user akan membuat profil dasar, kita update sisanya
        if (data.user) {
            // Tunggu trigger membuat profil
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const { error: updateError } = await window.supabaseClient
                .from('profiles')
                .update({ nip, jabatan, bidang })
                .eq('id', data.user.id);
            
            if (updateError) {
                console.error('Gagal update profil:', updateError);
            }
        }
        
        return { user: data.user, error: null };
    } catch (err) {
        return { user: null, error: err.message };
    }
};

/**
 * Logout pengguna
 */
window.logout = async function() {
    try {
        await window.supabaseClient.auth.signOut();
    } catch (err) {
        console.error('Logout error:', err);
    }
    window.currentUser = null;
    window.currentProfile = null;
    window.location.href = 'index.html';
};

/**
 * Cek apakah pengguna saat ini adalah admin
 * @returns {boolean}
 */
window.isAdmin = function() {
    return window.currentProfile?.role === 'admin';
};

/**
 * Dapatkan profil pengguna saat ini
 * @returns {Object}
 */
window.getCurrentProfile = function() {
    return window.currentProfile;
};

/**
 * Render sidebar - atur menu aktif, sembunyikan menu admin untuk viewer
 * @param {string} activePage - 'dashboard', 'program', 'realisasi', 'laporan', 'log'
 */
window.renderSidebar = function(activePage) {
    // Set menu aktif
    const navMap = {
        dashboard: 'navDashboard',
        program: 'navProgram',
        realisasi: 'navRealisasi',
        laporan: 'navLaporan',
        log: 'navLog'
    };
    
    Object.values(navMap).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    
    const activeEl = document.getElementById(navMap[activePage]);
    if (activeEl) activeEl.classList.add('active');
    
    // Sembunyikan menu admin-only untuk viewer
    if (!isAdmin()) {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.add('hidden');
        });
    }
    
    // Set info pengguna
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = window.currentProfile?.nama_lengkap || 'User';
    
    if (userRole) {
        const role = window.currentProfile?.role;
        userRole.textContent = role === 'admin' ? 'Administrator' : 'Viewer';
        userRole.style.color = role === 'admin' ? 'var(--accent-amber)' : 'var(--accent-cyan)';
    }
    
    if (userAvatar) {
        const name = window.currentProfile?.nama_lengkap || 'U';
        const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        userAvatar.textContent = initials;
    }
};

/**
 * Inisialisasi event sidebar (hamburger toggle, close, logout)
 */
window.initSidebarEvents = function() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebarClose = document.getElementById('sidebarClose');
    
    // Buat overlay jika belum ada
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebarOverlay';
        document.body.appendChild(overlay);
    }
    
    // Toggle sidebar pada mobile
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });
    }
    
    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    };
    
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    
    // Tombol logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await logout();
        });
    }
};

/**
 * Catat aktivitas ke tabel log_aktivitas
 * @param {string} aksi - Jenis aksi (INSERT, UPDATE, DELETE, EXPORT, LOGIN)
 * @param {string} deskripsi - Deskripsi aktivitas
 * @param {string} tabelTerkait - Nama tabel yang terkait
 * @param {number} recordId - ID record terkait
 */
window.logActivity = async function(aksi, deskripsi, tabelTerkait = null, recordId = null) {
    try {
        await window.supabaseClient.from('log_aktivitas').insert({
            user_id: window.currentUser?.id,
            aksi,
            deskripsi,
            tabel_terkait: tabelTerkait,
            record_id: recordId
        });
    } catch (err) {
        console.error('Gagal mencatat aktivitas:', err);
    }
};
