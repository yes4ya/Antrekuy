import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { queueService, SERVICES, STATUS, SERVICE_PREFIXES } from './services/queueService';
import { 
  Users, Ticket, Monitor, Shield, LogOut, RefreshCw, Download, 
  ArrowRight, CheckCircle, AlertCircle, Clock, Volume2, UserCheck, 
  FileText, Database, Radio
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('kiosk');
  const [queueData, setQueueData] = useState(queueService.getQueue());
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('antrekuy_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [ticketForm, setTicketForm] = useState({ nama: '', layanan: 'Umum', prioritas: 'Normal' });
  const [lastTicket, setLastTicket] = useState(null);

  const [trackNo, setTrackNo] = useState('');
  const [trackResult, setTrackResult] = useState(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '', role: 'petugas', loket: 'Loket 1' });

  const [activeCounter, setActiveCounter] = useState('Loket 1');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeService, setActiveService] = useState('Umum');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      setQueueData(queueService.getQueue());
    };
    window.addEventListener('storage', handleStorage);

    let channel = null;
    try {
      channel = new BroadcastChannel('antrekuy_sync_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'UPDATE') {
          setQueueData(event.data.payload);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported');
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  const playChimeAndSpeak = (ticketNumber, counterName) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text = `Nomor antrian, ${ticketNumber.replace('-', ' ')}, silakan menuju ke, ${counterName}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 0.9;
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 300);
      }
    } catch (e) {
      console.warn('Audio announcement failed', e);
    }
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!ticketForm.nama.trim()) return;
    const newT = queueService.createTicket(ticketForm.nama, ticketForm.layanan, ticketForm.prioritas);
    setLastTicket(newT);
    setQueueData(queueService.getQueue());
    setTicketForm({ nama: '', layanan: 'Umum', prioritas: 'Normal' });
  };

  const handleTrack = (e) => {
    e.preventDefault();
    const query = trackNo.trim().toUpperCase();
    const found = queueData.tickets.find(t => t.nomor.toUpperCase() === query || t.id === query);
    setTrackResult(found || 'not_found');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const { username, password, role, loket } = loginForm;
    let isValid = false;

    if (role === 'admin' && username === 'admin' && password === 'admin123') {
      isValid = true;
    } else if (role === 'petugas') {
      if (username === 'loket1' && password === 'loket123') isValid = true;
      if (username === 'loket2' && password === 'loket234') isValid = true;
      if (username === 'loket3' && password === 'loket345') isValid = true;
    }

    if (isValid) {
      const authObj = { username, role, loket: role === 'petugas' ? loket : 'Admin Panel' };
      setAuth(authObj);
      localStorage.setItem('antrekuy_auth', JSON.stringify(authObj));
      if (role === 'admin') setView('admin');
      else {
        setActiveCounter(loket);
        if (loket === 'Loket 1') setActiveService('Umum');
        else if (loket === 'Loket 2') setActiveService('Administrasi');
        else setActiveService('Keuangan');
        setView('staff');
      }
    } else {
      alert('Autentikasi Gagal: Username atau Password salah.');
    }
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem('antrekuy_auth');
    setView('kiosk');
  };

  const handleCallNext = () => {
    const res = queueService.callNext(activeCounter, activeService);
    if (res.success) {
      setQueueData(queueService.getQueue());
      playChimeAndSpeak(res.ticket.nomor, activeCounter);
    } else {
      alert(res.message);
    }
  };

  const handleRecall = () => {
    const res = queueService.recallTicket(activeCounter);
    if (res.success) {
      playChimeAndSpeak(res.ticket.nomor, activeCounter);
    } else {
      alert(res.message);
    }
  };

  const handleComplete = () => {
    queueService.completeTicket(activeCounter);
    setQueueData(queueService.getQueue());
  };

  const handleForward = (targetSvc) => {
    const res = queueService.forwardTicket(activeCounter, targetSvc);
    if (res.success) {
      setQueueData(queueService.getQueue());
      alert(`Tiket berhasil diteruskan ke layanan ${targetSvc}`);
    } else {
      alert(res.message);
    }
  };

  const handleMiss = () => {
    queueService.missTicket(activeCounter);
    setQueueData(queueService.getQueue());
  };

  const waitingList = queueData.tickets.filter(t => t.status === STATUS.MENUNGGU);

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="nav-brand" onClick={() => setView('kiosk')} style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, letterSpacing: '-0.5px'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--primary)'}}>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M16 2v3M8 2v3M2 10h20" />
          </svg>
          Antrekuy
        </div>
        <nav className="nav-tabs">
          <button className={`tab-btn ${view === 'kiosk' ? 'active' : ''}`} onClick={() => setView('kiosk')}>
            <Ticket size={16} /> Ambil Tiket
          </button>
          <button className={`tab-btn ${view === 'tracking' ? 'active' : ''}`} onClick={() => setView('tracking')}>
            <Clock size={16} /> Cek Status
          </button>
          <button className={`tab-btn ${view === 'tv' ? 'active' : ''}`} onClick={() => setView('tv')}>
            <Monitor size={16} /> Layar TV
          </button>
          {auth ? (
            <button className={`tab-btn active`} onClick={() => setView(auth.role === 'admin' ? 'admin' : 'staff')}>
              <Shield size={16} /> {auth.loket || 'Admin'}
            </button>
          ) : (
            <button className={`tab-btn ${view === 'login' ? 'active' : ''}`} onClick={() => setView('login')}>
              <UserCheck size={16} /> Login Petugas
            </button>
          )}
        </nav>
      </header>

      <main className="main-content">
        {view === 'kiosk' && (
          <div className="view-grid" style={{maxWidth: 600, margin: '0 auto'}}>
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Pendaftaran Nomor Antrian</h2>
                <span className="badge badge-neutral">Sistem Mandiri</span>
              </div>

              {!lastTicket ? (
                <form onSubmit={handleCreateTicket}>
                  <div className="form-group">
                    <label htmlFor="nama">Nama Lengkap</label>
                    <input 
                      id="nama" 
                      type="text" 
                      placeholder="Masukkan nama Anda..." 
                      value={ticketForm.nama} 
                      onChange={e => setTicketForm({...ticketForm, nama: e.target.value})} 
                      required 
                      autoComplete="name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="layanan">Pilih Jenis Layanan</label>
                    <select 
                      id="layanan" 
                      value={ticketForm.layanan} 
                      onChange={e => setTicketForm({...ticketForm, layanan: e.target.value})}
                    >
                      {SERVICES.map(s => (
                        <option key={s} value={s}>Layanan {s} ({SERVICE_PREFIXES[s]})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="prioritas">Kategori Antrian</label>
                    <select 
                      id="prioritas" 
                      value={ticketForm.prioritas} 
                      onChange={e => setTicketForm({...ticketForm, prioritas: e.target.value})}
                    >
                      <option value="Normal">Normal (Umum)</option>
                      <option value="Prioritas">Prioritas (Lansia / Disabilitas / Ibu Hamil)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary btn-block btn-lg" style={{marginTop: 24}}>
                    Cetak Nomor Antrian
                  </button>
                </form>
              ) : (
                <div className="ticket-card" style={{textAlign: 'center', padding: '32px 16px'}}>
                  <div style={{fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase'}}>
                    Tiket Berhasil Dibuat
                  </div>
                  <div className="ticket-number" style={{fontSize: '48px', fontWeight: 800, margin: '12px 0', fontFamily: 'var(--font-mono)'}}>
                    #{lastTicket.nomor}
                  </div>
                  <div style={{fontSize: 16, fontWeight: 500, marginBottom: 4}}>{lastTicket.nama}</div>
                  <div style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 24}}>
                    Layanan: {lastTicket.layanan} | Kategori: {lastTicket.prioritas}
                  </div>

                  <div style={{background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: 24, textAlign: 'left'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13}}>
                      <span style={{color: 'var(--text-muted)'}}>Antrian di depan Anda:</span>
                      <strong style={{fontFamily: 'var(--font-mono)'}}>
                        {Math.max(0, queueData.tickets.filter(t => t.layanan === lastTicket.layanan && t.status === STATUS.MENUNGGU && t.seq < lastTicket.seq).length)} orang
                      </strong>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13}}>
                      <span style={{color: 'var(--text-muted)'}}>Estimasi waktu tunggu:</span>
                      <strong style={{fontFamily: 'var(--font-mono)'}}>
                        ~{Math.max(2, queueData.tickets.filter(t => t.layanan === lastTicket.layanan && t.status === STATUS.MENUNGGU && t.seq < lastTicket.seq).length * 4)} menit
                      </strong>
                    </div>
                  </div>

                  <div style={{margin: '0 auto 20px'}}>
                    <QRCodeSVG value={lastTicket.nomor} size={128} level="H" />
                  </div>
                  <div style={{display: 'flex', gap: 12}}>
                    <button className="btn btn-outline btn-block" onClick={() => setLastTicket(null)}>
                      Ambil Tiket Baru
                    </button>
                    <button className="btn btn-primary btn-block" onClick={() => { setTrackNo(lastTicket.nomor); setView('tracking'); }}>
                      Cek Status Live
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'tracking' && (
          <div className="view-grid" style={{maxWidth: 600, margin: '0 auto'}}>
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Cek Status Tiket Antrian</h2>
                <span className="badge badge-neutral">Real-Time</span>
              </div>

              <form onSubmit={handleTrack} style={{display: 'flex', gap: 8, marginBottom: 24}}>
                <input 
                  type="text" 
                  placeholder="Masukkan Nomor Antrian (cth: A-001)" 
                  value={trackNo}
                  onChange={e => setTrackNo(e.target.value)}
                  style={{flex: 1}}
                  required
                />
                <button type="submit" className="btn btn-primary">Cari</button>
              </form>

              {trackResult === 'not_found' && (
                <div style={{padding: '24px', textAlign: 'center', color: 'var(--text-muted)'}}>
                  Nomor antrian tidak ditemukan. Pastikan format nomor benar.
                </div>
              )}

              {trackResult && trackResult !== 'not_found' && (
                <div style={{background: 'var(--bg-subtle)', padding: 20, borderRadius: 'var(--radius-md)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <div>
                      <div style={{fontSize: 12, color: 'var(--text-muted)'}}>NOMOR ANTRIAN</div>
                      <div style={{fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)'}}>#{trackResult.nomor}</div>
                    </div>
                    <span className={`badge ${
                      trackResult.status === STATUS.MENUNGGU ? 'badge-neutral' :
                      trackResult.status === STATUS.DILAYANI ? 'badge-primary' :
                      trackResult.status === STATUS.SELESAI ? 'badge-success' : 'badge-warning'
                    }`}>
                      {trackResult.status}
                    </span>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 12}}>
                    <div>
                      <span style={{color: 'var(--text-muted)'}}>Nama:</span>
                      <div><strong>{trackResult.nama}</strong></div>
                    </div>
                    <div>
                      <span style={{color: 'var(--text-muted)'}}>Layanan:</span>
                      <div><strong>{trackResult.layanan}</strong></div>
                    </div>
                    <div>
                      <span style={{color: 'var(--text-muted)'}}>Kategori:</span>
                      <div><strong>{trackResult.prioritas}</strong></div>
                    </div>
                    <div>
                      <span style={{color: 'var(--text-muted)'}}>Loket Tujuan:</span>
                      <div><strong>{trackResult.loket || 'Belum ditentukan'}</strong></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="view-grid" style={{maxWidth: 420, margin: '0 auto'}}>
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Login Petugas & Admin</h2>
              </div>
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="role">Peran (Role)</label>
                  <select 
                    id="role"
                    value={loginForm.role}
                    onChange={e => setLoginForm({...loginForm, role: e.target.value})}
                  >
                    <option value="petugas">Petugas Loket</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {loginForm.role === 'petugas' && (
                  <div className="form-group">
                    <label htmlFor="loket">Pilih Loket</label>
                    <select 
                      id="loket"
                      value={loginForm.loket}
                      onChange={e => setLoginForm({...loginForm, loket: e.target.value})}
                    >
                      <option value="Loket 1">Loket 1 (Layanan Umum)</option>
                      <option value="Loket 2">Loket 2 (Layanan Administrasi)</option>
                      <option value="Loket 3">Loket 3 (Layanan Keuangan)</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input 
                    id="username"
                    type="text"
                    value={loginForm.username}
                    onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                    placeholder="Masukkan username..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input 
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="Masukkan password..."
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-block" style={{marginTop: 16}}>
                  Masuk Sistem
                </button>
              </form>

              <div style={{marginTop: 16, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 12}}>
                <strong>Kredensial Demo:</strong><br />
                Admin: <code>admin</code> / <code>admin123</code><br />
                Loket 1: <code>loket1</code> / <code>loket123</code><br />
                Loket 2: <code>loket2</code> / <code>loket234</code><br />
                Loket 3: <code>loket3</code> / <code>loket345</code>
              </div>
            </div>
          </div>
        )}

        {view === 'staff' && auth && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <div>
                <h2>Panel Kontrol {auth.loket}</h2>
                <div style={{fontSize: 13, color: 'var(--text-muted)'}}>Menangani Layanan: <strong>{activeService}</strong></div>
              </div>
              <div style={{display: 'flex', gap: 8}}>
                <select 
                  value={activeService} 
                  onChange={e => setActiveService(e.target.value)}
                  style={{padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card)'}}
                >
                  {SERVICES.map(s => <option key={s} value={s}>Fokus: {s}</option>)}
                </select>
                <button className="btn btn-outline" onClick={handleLogout}><LogOut size={16} /> Keluar</button>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
              <div className="panel">
                <h3 className="panel-title" style={{marginBottom: 16}}>Status Loket Saat Ini</h3>
                {(() => {
                  const counterState = queueData.counterStatus[auth.loket];
                  const currentTicket = counterState && counterState.current 
                    ? queueData.tickets.find(t => t.id === counterState.current) 
                    : null;

                  return currentTicket ? (
                    <div style={{textAlign: 'center', padding: '24px 0'}}>
                      <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>SEDANG MELAYANI</div>
                      <div style={{fontSize: 56, fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '8px 0'}}>
                        #{currentTicket.nomor}
                      </div>
                      <div style={{fontSize: 16, fontWeight: 600, marginBottom: 4}}>{currentTicket.nama}</div>
                      <div style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 24}}>
                        {currentTicket.layanan} ({currentTicket.prioritas})
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12}}>
                        <button className="btn btn-outline" onClick={handleRecall}>
                          <Volume2 size={16} /> Panggil Ulang
                        </button>
                        <button className="btn btn-primary" onClick={handleComplete}>
                          <CheckCircle size={16} /> Selesai
                        </button>
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
                        <button className="btn btn-outline" onClick={handleMiss} style={{color: 'var(--warning)', borderColor: 'var(--warning)'}}>
                          Terlewat (Absen)
                        </button>
                        <select 
                          onChange={e => { if (e.target.value) handleForward(e.target.value); e.target.value = ''; }}
                          defaultValue=""
                          style={{padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 13}}
                        >
                          <option value="" disabled>Teruskan ke Layanan...</option>
                          {SERVICES.filter(s => s !== currentTicket.layanan).map(s => (
                            <option key={s} value={s}>Teruskan ke {s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div style={{textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)'}}>
                      <div>Loket sedang kosong / siap memanggil antrian.</div>
                    </div>
                  );
                })()}

                <button className="btn btn-primary btn-block btn-lg" onClick={handleCallNext} style={{marginTop: 16}}>
                  Panggil Antrian Berikutnya (Algoritma 2:1)
                </button>
              </div>

              <div className="panel">
                <h3 className="panel-title" style={{marginBottom: 16}}>Antrian Menunggu ({activeService})</h3>
                <div style={{maxHeight: 320, overflowY: 'auto'}}>
                  {queueData.tickets.filter(t => t.layanan === activeService && t.status === STATUS.MENUNGGU).length === 0 ? (
                    <div style={{color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0'}}>Tidak ada antrian menunggu.</div>
                  ) : (
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                      <thead>
                        <tr style={{borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)'}}>
                          <th style={{padding: '8px'}}>No</th>
                          <th style={{padding: '8px'}}>Nama</th>
                          <th style={{padding: '8px'}}>Kategori</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queueData.tickets
                          .filter(t => t.layanan === activeService && t.status === STATUS.MENUNGGU)
                          .map(t => (
                            <tr key={t.id} style={{borderBottom: '1px solid var(--border)'}}>
                              <td style={{padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600}}>#{t.nomor}</td>
                              <td style={{padding: '8px'}}>{t.nama}</td>
                              <td style={{padding: '8px'}}>
                                <span className={`badge ${t.prioritas === 'Prioritas' ? 'badge-warning' : 'badge-neutral'}`}>
                                  {t.prioritas}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'tv' && (
          <div style={{background: '#090a0f', color: '#f8fafc', padding: 24, borderRadius: 'var(--radius-lg)', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: 16}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#38bdf8'}}>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M16 2v3M8 2v3M2 10h20" />
                </svg>
                <h1 style={{fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', margin: 0}}>Antrekuy — Ruang Informasi TV</h1>
              </div>
              <div style={{fontFamily: 'var(--font-mono)', fontSize: 16, color: '#94a3b8'}}>
                {currentTime.toLocaleTimeString('id-ID')}
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, margin: '24px 0'}}>
              {Object.entries(queueData.counterStatus).map(([counterName, state]) => {
                const currentTicket = state.current ? queueData.tickets.find(t => t.id === state.current) : null;
                return (
                  <div key={counterName} style={{background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: 24, textAlign: 'center'}}>
                    <div style={{fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8}}>{counterName}</div>
                    <div style={{fontSize: 12, color: '#38bdf8', marginBottom: 16}}>({state.service})</div>
                    <div style={{fontSize: 64, fontWeight: 800, fontFamily: 'var(--font-mono)', color: currentTicket ? '#38bdf8' : '#4b5563', margin: '12px 0'}}>
                      {currentTicket ? `#${currentTicket.nomor}` : '---'}
                    </div>
                    <div style={{fontSize: 16, fontWeight: 600, color: '#e2e8f0', minHeight: 24}}>
                      {currentTicket ? currentTicket.nama : 'Kosong'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: '#94a3b8'}}>
              <div>Total Antrian Menunggu: <strong style={{color: '#f8fafc', fontFamily: 'var(--font-mono)'}}>{waitingList.length} orang</strong></div>
              <div>Silakan menunggu panggilan petugas sesuai nomor tiket Anda.</div>
            </div>
          </div>
        )}

        {view === 'admin' && auth && auth.role === 'admin' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h2>Dashboard Administrator</h2>
              <div style={{display: 'flex', gap: 8}}>
                <button className="btn btn-outline" onClick={() => { queueService.exportCSV(); }}><Download size={16} /> Export CSV</button>
                <button className="btn btn-outline" onClick={() => { if (confirm('Reset seluruh data antrian?')) { setQueueData(queueService.resetAll()); } }} style={{color: 'var(--warning)', borderColor: 'var(--warning)'}}>
                  <RefreshCw size={16} /> Reset Sistem
                </button>
                <button className="btn btn-outline" onClick={handleLogout}><LogOut size={16} /> Keluar</button>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24}}>
              <div className="panel" style={{padding: 16}}>
                <div style={{fontSize: 13, color: 'var(--text-muted)'}}>Total Tiket</div>
                <div style={{fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4}}>{queueData.tickets.length}</div>
              </div>
              <div className="panel" style={{padding: 16}}>
                <div style={{fontSize: 13, color: 'var(--text-muted)'}}>Menunggu</div>
                <div style={{fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4, color: 'var(--primary)'}}>
                  {queueData.tickets.filter(t => t.status === STATUS.MENUNGGU).length}
                </div>
              </div>
              <div className="panel" style={{padding: 16}}>
                <div style={{fontSize: 13, color: 'var(--text-muted)'}}>Sedang Dilayani</div>
                <div style={{fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4, color: '#2563eb'}}>
                  {queueData.tickets.filter(t => t.status === STATUS.DILAYANI).length}
                </div>
              </div>
              <div className="panel" style={{padding: 16}}>
                <div style={{fontSize: 13, color: 'var(--text-muted)'}}>Selesai</div>
                <div style={{fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4, color: '#16a34a'}}>
                  {queueData.tickets.filter(t => t.status === STATUS.SELESAI).length}
                </div>
              </div>
            </div>

            <div className="panel">
              <h3 className="panel-title" style={{marginBottom: 16}}>Seluruh Riwayat Tiket</h3>
              <div style={{maxHeight: 400, overflowY: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                  <thead>
                    <tr style={{borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)'}}>
                      <th style={{padding: '8px'}}>Nomor</th>
                      <th style={{padding: '8px'}}>Nama</th>
                      <th style={{padding: '8px'}}>Layanan</th>
                      <th style={{padding: '8px'}}>Kategori</th>
                      <th style={{padding: '8px'}}>Status</th>
                      <th style={{padding: '8px'}}>Loket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueData.tickets.map(t => (
                      <tr key={t.id} style={{borderBottom: '1px solid var(--border)'}}>
                        <td style={{padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600}}>#{t.nomor}</td>
                        <td style={{padding: '8px'}}>{t.nama}</td>
                        <td style={{padding: '8px'}}>{t.layanan}</td>
                        <td style={{padding: '8px'}}>{t.prioritas}</td>
                        <td style={{padding: '8px'}}>
                          <span className={`badge ${
                            t.status === STATUS.MENUNGGU ? 'badge-neutral' :
                            t.status === STATUS.DILAYANI ? 'badge-primary' :
                            t.status === STATUS.SELESAI ? 'badge-success' : 'badge-warning'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{padding: '8px'}}>{t.loket || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
