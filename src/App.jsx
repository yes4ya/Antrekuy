import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';

const STORAGE_KEY = "antrian:system:v8";
const AUTH_KEY = "antrian:auth:v4";

const VALID_CREDENTIALS = {
  "Admin": { username: "admin", password: "admin123", name: "Administrator" },
  "Petugas Loket 1": { username: "loket1", password: "loket123", name: "Loket 1" },
  "Petugas Loket 2": { username: "loket2", password: "loket234", name: "Loket 2" },
  "Petugas Loket 3": { username: "loket3", password: "loket345", name: "Loket 3" }
};

const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = (username, password, role) => {
    const target = VALID_CREDENTIALS[role];
    if (target && username === target.username && password === target.password) {
      const userData = { username, role, name: target.name };
      localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
      setUser(userData);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() { return useContext(AuthContext); }

function loadStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveStorage(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

const STATUS = {
  MENUNGGU: "Menunggu",
  DILAYANI: "Dilayani",
  SELESAI: "Selesai",
  BATAL: "Batal"
};

const SERVICES = ["Umum", "Administrasi", "Keuangan", "Akademik"];
const COUNTERS = ["Loket 1", "Loket 2", "Loket 3"];

export default function App() {
  return (
    <AuthProvider>
      <div className="app-wrapper">
        <AuthRouter />
      </div>
    </AuthProvider>
  );
}

function AuthRouter() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>Memuat...</div>;
  return user ? <DashboardApp user={user} /> : <PublicApp />;
}

function PublicApp() {
  const { login } = useAuth();
  const [view, setView] = useState("kiosk");
  const [loginForm, setLoginForm] = useState({ username: "", password: "", role: "Petugas Loket 1" });
  const [ticketForm, setTicketForm] = useState({ nama: "", layanan: "Umum", prioritas: "Normal" });
  const [lastTicket, setLastTicket] = useState(null);
  const [trackNo, setTrackNo] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [list, setList] = useState(loadStorage());

  useEffect(() => {
    const handleStorage = (e) => { if (e.key === STORAGE_KEY && e.newValue) setList(JSON.parse(e.newValue)); };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!ticketForm.nama.trim()) return;
    const items = loadStorage();
    const maxNum = items.reduce((m, i) => Math.max(m, i.nomor || 0), 0);
    const newItem = {
      id: Math.random().toString(36).slice(2, 9),
      nomor: maxNum + 1,
      nama: ticketForm.nama.trim(),
      layanan: ticketForm.layanan,
      prioritas: ticketForm.prioritas,
      status: STATUS.MENUNGGU,
      counter: null,
      createdAt: Date.now()
    };
    const updated = [...items, newItem];
    saveStorage(updated);
    setList(updated);
    setLastTicket(newItem);
    setTicketForm({ nama: "", layanan: "Umum", prioritas: "Normal" });
  };

  const handleTrack = (e) => {
    e.preventDefault();
    const num = parseInt(trackNo);
    const found = list.find(i => i.nomor === num);
    setTrackResult(found || "not_found");
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!login(loginForm.username, loginForm.password, loginForm.role)) {
      alert("Login Gagal: Username atau Password salah untuk peran tersebut.");
    }
  };

  return (
    <div>
      <header className="navbar">
        <div className="nav-brand">Sistem Antrian</div>
        <nav className="nav-tabs">
          <button className={`tab-btn ${view === 'kiosk' ? 'active' : ''}`} onClick={() => setView('kiosk')}>Ambil Tiket</button>
          <button className={`tab-btn ${view === 'tracking' ? 'active' : ''}`} onClick={() => setView('tracking')}>Cek Status</button>
          <button className={`tab-btn ${view === 'login' ? 'active' : ''}`} onClick={() => setView('login')}>Login Petugas</button>
        </nav>
      </header>

      {view === 'kiosk' && (
        <section className="panel" style={{maxWidth: 500, margin: '0 auto'}}>
          <h2 className="panel-title">{lastTicket ? "Tiket Anda" : "Ambil Nomor Antrian"}</h2>
          {!lastTicket ? (
            <form onSubmit={handleCreateTicket}>
              <div className="form-group">
                <label htmlFor="nama">Nama Lengkap</label>
                <input id="nama" type="text" placeholder="Masukkan nama Anda" value={ticketForm.nama} onChange={e => setTicketForm({...ticketForm, nama: e.target.value})} required autoComplete="name" />
              </div>
              <div className="form-group">
                <label htmlFor="layanan">Jenis Layanan</label>
                <select id="layanan" value={ticketForm.layanan} onChange={e => setTicketForm({...ticketForm, layanan: e.target.value})}>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="prioritas">Kategori Antrian</label>
                <select id="prioritas" value={ticketForm.prioritas} onChange={e => setTicketForm({...ticketForm, prioritas: e.target.value})}>
                  <option value="Normal">Normal (Umum)</option>
                  <option value="Prioritas">Prioritas (Lansia / Disabilitas / Ibu Hamil)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg">Ambil Tiket</button>
            </form>
          ) : (
            <div className="ticket-card">
              <div style={{fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8}}>NOMOR ANTRIAN ANDA</div>
              <div className="ticket-number">#{lastTicket.nomor}</div>
              <div className="ticket-name">{lastTicket.nama}</div>
              <div className="ticket-meta">
                <span className="badge {lastTicket.prioritas === 'Prioritas' ? 'badge-warning' : 'badge-wait'}">{lastTicket.prioritas}</span>
                <span className="badge badge-wait">{lastTicket.layanan}</span>
              </div>
              <div style={{fontSize: 14, color: 'var(--text-muted)', marginTop: 16}}>
                Antrian di depan: <strong>{Math.max(0, list.filter(i => i.status === STATUS.MENUNGGU).length - 1)} orang</strong>
              </div>
              <button className="btn btn-secondary btn-block mt-16" onClick={() => setLastTicket(null)}>Ambil Tiket Baru</button>
            </div>
          )}
        </section>
      )}

      {view === 'tracking' && (
        <section className="panel" style={{maxWidth: 500, margin: '0 auto'}}>
          <h2 className="panel-title">Cek Status Tiket</h2>
          <form onSubmit={handleTrack}>
            <div className="form-group">
              <label htmlFor="track">Nomor Tiket</label>
              <input id="track" type="number" placeholder="Contoh: 1" value={trackNo} onChange={e => setTrackNo(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg">Cek Status</button>
          </form>

          {trackResult === "not_found" && (
            <div className="mt-16" style={{padding: 16, background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)'}}>
              Tiket tidak ditemukan dalam sistem.
            </div>
          )}

          {trackResult && trackResult !== "not_found" && (
            <div className="mt-16 panel" style={{borderColor: 'var(--border-strong)'}}>
              <div style={{display: 'grid', gap: 10}}>
                <div><strong>Nomor:</strong> #{trackResult.nomor}</div>
                <div><strong>Nama:</strong> {trackResult.nama}</div>
                <div><strong>Layanan:</strong> {trackResult.layanan} ({trackResult.prioritas})</div>
                <div><strong>Status:</strong> <span className="badge badge-{trackResult.status === 'Menunggu' ? 'wait' : trackResult.status === 'Dilayani' ? 'serving' : trackResult.status === 'Selesai' ? 'done' : 'cancel'}">{trackResult.status}</span></div>
                <div><strong>Loket:</strong> {trackResult.counter || '—'}</div>
              </div>
            </div>
          )}
        </section>
      )}

      {view === 'login' && (
        <section className="panel" style={{maxWidth: 420, margin: '0 auto'}}>
          <h2 className="panel-title">Login Petugas / Administrator</h2>
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="role">Peran</label>
              <select id="role" value={loginForm.role} onChange={e => setLoginForm({...loginForm, role: e.target.value})}>
                <option value="Admin">Administrator</option>
                <option value="Petugas Loket 1">Petugas Loket 1</option>
                <option value="Petugas Loket 2">Petugas Loket 2</option>
                <option value="Petugas Loket 3">Petugas Loket 3</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input id="username" type="text" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required autoComplete="username" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg">Masuk</button>
          </form>

          <div className="cred-box">
            <strong>Kredensial Login:</strong>
            Admin: <code>admin</code> / <code>admin123</code><br/>
            Loket 1: <code>loket1</code> / <code>loket123</code><br/>
            Loket 2: <code>loket2</code> / <code>loket234</code><br/>
            Loket 3: <code>loket3</code> / <code>loket345</code>
          </div>
        </section>
      )}
    </div>
  );
}

function DashboardApp({ user }) {
  const { logout } = useAuth();
  const [tab, setTab] = useState("control");
  const [list, setList] = useState(loadStorage());
  const [activeCounter, setActiveCounter] = useState(user.role === "Admin" ? "Loket 1" : user.role.replace("Petugas ", "Loket "));

  useEffect(() => {
    const handleStorage = (e) => { if (e.key === STORAGE_KEY && e.newValue) setList(JSON.parse(e.newValue)); };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const saveAndUpdate = (updated) => {
    saveStorage(updated);
    setList(updated);
  };

  const callNext = () => {
    const waiting = list.filter(i => i.status === STATUS.MENUNGGU);
    if (waiting.length === 0) return alert("Tidak ada antrian menunggu.");
    const target = waiting[0];
    const updated = list.map(i => i.id === target.id ? {...i, status: STATUS.DILAYANI, counter: activeCounter} : i);
    saveAndUpdate(updated);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `Nomor antrian, ${target.nomor}, silakan menuju ke ${activeCounter}`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'id-ID';
      window.speechSynthesis.speak(utter);
    }
  };

  const updateStatus = (id, status) => {
    const updated = list.map(i => i.id === id ? {...i, status} : i);
    saveAndUpdate(updated);
  };

  const deleteItem = (id) => {
    if (!confirm("Hapus tiket ini?")) return;
    const updated = list.filter(i => i.id !== id);
    saveAndUpdate(updated);
  };

  const resetAll = () => {
    if (!confirm("Yakin ingin mereset seluruh data antrian?")) return;
    saveAndUpdate([]);
  };

  const waitingList = list.filter(i => i.status === STATUS.MENUNGGU);
  const servingList = list.filter(i => i.status === STATUS.DILAYANI);
  const currentServing = servingList[0];

  const badgeClassForStatus = (status) => {
    if (status === STATUS.MENUNGGU) return 'badge-wait';
    if (status === STATUS.DILAYANI) return 'badge-serving';
    if (status === STATUS.SELESAI) return 'badge-done';
    return 'badge-cancel';
  };

  return (
    <div>
      <header className="navbar">
        <div className="nav-brand">Panel {user.name}</div>
        <nav className="nav-tabs">
          <button className={`tab-btn ${tab === 'control' ? 'active' : ''}`} onClick={() => setTab('control')}>Kontrol Loket</button>
          <button className={`tab-btn ${tab === 'display' ? 'active' : ''}`} onClick={() => setTab('display')}>Layar TV</button>
          {user.role === "Admin" && <button className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Statistik</button>}
        </nav>
        <div className="nav-user">
          <span className="user-badge">{user.role}</span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>Keluar</button>
        </div>
      </header>

      {tab === 'control' && (
        <div>
          <div className="grid-2">
            <section className="panel">
              <h3 className="panel-title">Kontrol Panggilan</h3>
              {user.role === "Admin" && (
                <div className="form-group">
                  <label>Loket Anda</label>
                  <select value={activeCounter} onChange={e => setActiveCounter(e.target.value)} className="w-full">
                    {COUNTERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <button className="btn btn-success btn-block btn-lg mt-8" onClick={callNext} disabled={waitingList.length === 0}>
                Panggil Berikutnya ({activeCounter})
              </button>
              {user.role === "Admin" && (
                <button className="btn btn-danger btn-block mt-8" onClick={resetAll}>
                  Reset Semua Data
                </button>
              )}
            </section>

            <section className="panel">
              <h3 className="panel-title">Sedang Dilayani</h3>
              <div className={`current-serving ${!currentServing ? 'empty' : ''}`}>
                {currentServing ? (
                  <>
                    <div className="current-number">#{currentServing.nomor}</div>
                    <div className="current-name">{currentServing.nama}</div>
                    <div className="current-info">{currentServing.counter} • {currentServing.layanan}</div>
                  </>
                ) : (
                  <div>
                    <div style={{fontSize: 48, marginBottom: 8}}>—</div>
                    <div>Belum ada panggilan</div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="panel">
            <h3 className="panel-title">Daftar Antrian ({list.length})</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>Layanan</th>
                    <th>Kategori</th>
                    <th>Status</th>
                    <th>Loket</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr><td colSpan={7} className="text-center" style={{padding: 40, color: 'var(--text-muted)'}}>Belum ada data antrian</td></tr>
                  ) : (
                    list.map(item => (
                      <tr key={item.id}>
                        <td>#{item.nomor}</td>
                        <td>{item.nama}</td>
                        <td>{item.layanan}</td>
                        <td>{item.prioritas}</td>
                        <td><span className={`badge ${badgeClassForStatus(item.status)}`}>{item.status}</span></td>
                        <td>{item.counter || '—'}</td>
                        <td>
                          <div className="flex gap-8 flex-wrap">
                            {item.status === STATUS.MENUNGGU && (
                              <button className="btn btn-primary btn-sm" onClick={() => updateStatus(item.id, STATUS.DILAYANI)}>Layani</button>
                            )}
                            {item.status === STATUS.DILAYANI && (
                              <button className="btn btn-success btn-sm" onClick={() => updateStatus(item.id, STATUS.SELESAI)}>Selesai</button>
                            )}
                            <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)}>Hapus</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === 'display' && (
        <section className="tv-screen">
          <header className="tv-header">
            <h2 className="tv-title">Layar Informasi Antrian</h2>
            <div className="tv-counters flex gap-8 flex-wrap">
              {COUNTERS.map(c => (
                <span key={c} className="tv-counter-badge">
                  {c}
                </span>
              ))}
            </div>
          </header>

          <main className="tv-main">
            <div className="tv-number-box">
              <div className="tv-label">Nomor Antrian Dipanggil</div>
              <div className="tv-number">{currentServing ? `#${currentServing.nomor}` : '—'}</div>
              <div className="tv-current-info">
                {currentServing ? `${currentServing.nama} — ${currentServing.counter}` : 'Menunggu Panggilan'}
              </div>
            </div>

            <div className="tv-next-section">
              <h3 className="tv-next-title">Antrian Berikutnya</h3>
              <div className="tv-next-list">
                {waitingList.length === 0 ? (
                  <div style={{textAlign: 'center', color: '#64748b', padding: 20, background: '#1e293b', border: '1px solid #334155', borderRadius: 'var(--radius)'}}>
                    Tidak ada antrian menunggu
                  </div>
                ) : (
                  waitingList.slice(0, 5).map(item => (
                    <div key={item.id} className="tv-next-item">
                      <div>
                        <div className="tv-next-num">#{item.nomor}</div>
                        <div className="tv-next-name">{item.nama}</div>
                      </div>
                      <span className="tv-next-service">{item.layanan}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        </section>
      )}

      {tab === 'stats' && user.role === "Admin" && (
        <section className="panel">
          <h3 className="panel-title">Statistik & Laporan</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Tiket</div>
              <div className="stat-value">{list.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Menunggu</div>
              <div className="stat-value warning">{waitingList.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Dilayani</div>
              <div className="stat-value primary">{servingList.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Selesai</div>
              <div className="stat-value success">{list.filter(i => i.status === STATUS.SELESAI).length}</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => {
            const headers = "No,Nama,Layanan,Kategori,Status,Loket\\n";
            const rows = list.map(i => `${i.nomor},"${i.nama}",${i.layanan},${i.prioritas},${i.status},${i.counter || '-'}\\n`).join('');
            const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `laporan_antrian_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
          }}>Export Laporan CSV</button>
        </section>
      )}
    </div>
  );
}