// ============================================
// SIMONEV - Konfigurasi Supabase
// ============================================

const SUPABASE_URL = 'https://yqtxbsskvjkaqqpmlzsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdHhic3NrdmprYXFxcG1senN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNDY0MDMsImV4cCI6MjEwOTkyMjQwM30.qCogxFsxXzEYP4xYgH59wQcXm1K5s4b8QfE_zZJUeyA';

// Inisialisasi Supabase Client
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Daftar Bidang - Dinas Koperasi, UKM, Perindustrian dan Perdagangan
window.BIDANG_LIST = [
    'Sekretariat',
    'Koperasi',
    'Usaha Kecil dan Menengah (UKM)',
    'Perindustrian',
    'Perdagangan',
    'Metrologi'
];

// Daftar Tahun
window.TAHUN_LIST = [2024, 2025, 2026, 2027, 2028];

// Daftar Triwulan
window.TRIWULAN_LIST = ['Q1', 'Q2', 'Q3', 'Q4'];

// Nama Dinas
window.NAMA_DINAS = 'Dinas Koperasi, Usaha Kecil dan Menengah, Perindustrian dan Perdagangan';
