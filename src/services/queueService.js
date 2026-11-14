// Queue Service Layer - Anti-Slop Utilitarian Architecture
// Handles localStorage persistence, BroadcastChannel real-time sync, 2:1 priority scheduling, and queue operations.

const STORAGE_KEY = 'antrekuy_queue_data_v2';
const CHANNEL_NAME = 'antrekuy_sync_channel';

export const SERVICES = ['Umum', 'Administrasi', 'Keuangan', 'Akademik'];

export const SERVICE_PREFIXES = {
  Umum: 'A',
  Administrasi: 'B',
  Keuangan: 'C',
  Akademik: 'D'
};

export const STATUS = {
  MENUNGGU: 'Menunggu',
  DILAYANI: 'Dilayani',
  SELESAI: 'Selesai',
  TERLEWAT: 'Terlewat'
};

let broadcastChannel = null;
try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
} catch (e) {
  console.warn('BroadcastChannel not supported, falling back to storage events');
}

export const queueService = {
  getSubscribers() {
    return [];
  },

  getQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return this.getInitialData();
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read queue from localStorage', e);
      return this.getInitialData();
    }
  },

  saveQueue(queueData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queueData));
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'UPDATE', payload: queueData });
      }
    } catch (e) {
      console.error('Failed to save queue to localStorage', e);
    }
  },

  getInitialData() {
    const initial = {
      tickets: [],
      counterStatus: {
        'Loket 1': { current: null, service: 'Umum', status: 'idle' },
        'Loket 2': { current: null, service: 'Administrasi', status: 'idle' },
        'Loket 3': { current: null, service: 'Keuangan', status: 'idle' }
      },
      stats: {
        lastReset: new Date().toISOString()
      }
    };
    this.saveQueue(initial);
    return initial;
  },

  // Add new ticket
  createTicket(nama, layanan, prioritas) {
    const data = this.getQueue();
    const prefix = SERVICE_PREFIXES[layanan] || 'A';
    
    // Find highest sequence for this service today
    const serviceTickets = data.tickets.filter(t => t.layanan === layanan);
    const nextSeq = serviceTickets.length + 1;
    const nomorStr = `${prefix}-${String(nextSeq).padStart(3, '0')}`;

    const newTicket = {
      id: 'TICKET-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      nomor: nomorStr,
      seq: nextSeq,
      prefix,
      nama: nama.trim() || 'Tanpa Nama',
      layanan,
      prioritas, // 'Normal' or 'Prioritas'
      status: STATUS.MENUNGGU,
      loket: null,
      createdAt: new Date().toISOString(),
      calledAt: null,
      completedAt: null
    };

    data.tickets.push(newTicket);
    this.saveQueue(data);
    return newTicket;
  },

  // 2:1 Priority Scheduler Algorithm:
  // Calls max 2 Priority tickets, then 1 Normal ticket if available, preventing starvation.
  callNext(counterName, serviceType) {
    const data = this.getQueue();
    const waitingTickets = data.tickets.filter(
      t => t.status === STATUS.MENUNGGU && t.layanan === serviceType
    );

    if (waitingTickets.length === 0) {
      return { success: false, message: 'Tidak ada antrian menunggu untuk layanan ini.' };
    }

    // Check recent call history for this service to enforce 2:1 ratio
    const serviceHistory = data.tickets
      .filter(t => t.layanan === serviceType && (t.status === STATUS.DILAYANI || t.status === STATUS.SELESAI))
      .sort((a, b) => new Date(b.calledAt || 0) - new Date(a.calledAt || 0));

    let recentCalls = serviceHistory.slice(0, 3);
    let priorityCountInRecent = recentCalls.filter(t => t.prioritas === 'Prioritas').length;

    let selectedTicket = null;

    // If last 2 calls were Priority, force pick Normal if available
    if (priorityCountInRecent >= 2) {
      selectedTicket = waitingTickets.find(t => t.prioritas === 'Normal') || waitingTickets[0];
    } else {
      // Prioritize Priority tickets first
      selectedTicket = waitingTickets.find(t => t.prioritas === 'Prioritas') || waitingTickets[0];
    }

    // Update old ticket on this counter if still active
    const currentCounterState = data.counterStatus[counterName];
    if (currentCounterState && currentCounterState.current) {
      const prevTicket = data.tickets.find(t => t.id === currentCounterState.current);
      if (prevTicket && prevTicket.status === STATUS.DILAYANI) {
        prevTicket.status = STATUS.SELESAI;
        prevTicket.completedAt = new Date().toISOString();
      }
    }

    // Assign new ticket
    selectedTicket.status = STATUS.DILAYANI;
    selectedTicket.loket = counterName;
    selectedTicket.calledAt = new Date().toISOString();

    data.counterStatus[counterName] = {
      current: selectedTicket.id,
      service: serviceType,
      status: 'active',
      lastCalledTicket: selectedTicket.nomor
    };

    this.saveQueue(data);
    return { success: true, ticket: selectedTicket };
  },

  // Recall current ticket
  recallTicket(counterName) {
    const data = this.getQueue();
    const counterState = data.counterStatus[counterName];
    if (!counterState || !counterState.current) {
      return { success: false, message: 'Tidak ada tiket aktif di loket ini.' };
    }
    const ticket = data.tickets.find(t => t.id === counterState.current);
    if (!ticket) return { success: false, message: 'Tiket tidak ditemukan.' };

    this.saveQueue(data);
    return { success: true, ticket };
  },

  // Complete ticket
  completeTicket(counterName) {
    const data = this.getQueue();
    const counterState = data.counterStatus[counterName];
    if (!counterState || !counterState.current) {
      return { success: false, message: 'Tidak ada tiket aktif.' };
    }
    const ticket = data.tickets.find(t => t.id === counterState.current);
    if (ticket) {
      ticket.status = STATUS.SELESAI;
      ticket.completedAt = new Date().toISOString();
    }
    counterState.current = null;
    counterState.status = 'idle';

    this.saveQueue(data);
    return { success: true };
  },

  // Transfer / Forward ticket to another service without re-registering
  forwardTicket(counterName, targetService) {
    const data = this.getQueue();
    const counterState = data.counterStatus[counterName];
    if (!counterState || !counterState.current) {
      return { success: false, message: 'Tidak ada tiket aktif untuk diteruskan.' };
    }
    const ticket = data.tickets.find(t => t.id === counterState.current);
    if (!ticket) return { success: false, message: 'Tiket tidak ditemukan.' };

    // Mark current as completed
    ticket.status = STATUS.SELESAI;
    ticket.completedAt = new Date().toISOString();

    // Create forwarded ticket for target service
    const prefix = SERVICE_PREFIXES[targetService] || 'A';
    const serviceTickets = data.tickets.filter(t => t.layanan === targetService);
    const nextSeq = serviceTickets.length + 1;
    const nomorStr = `${prefix}-${String(nextSeq).padStart(3, '0')}`;

    const forwardedTicket = {
      id: 'TICKET-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      nomor: nomorStr,
      seq: nextSeq,
      prefix,
      nama: `${ticket.nama} (Lanjutan)`,
      layanan: targetService,
      prioritas: ticket.prioritas,
      status: STATUS.MENUNGGU,
      loket: null,
      createdAt: new Date().toISOString(),
      calledAt: null,
      completedAt: null
    };

    data.tickets.push(forwardedTicket);
    counterState.current = null;
    counterState.status = 'idle';

    this.saveQueue(data);
    return { success: true, forwardedTicket };
  },

  // Mark as missed (terlewat)
  missTicket(counterName) {
    const data = this.getQueue();
    const counterState = data.counterStatus[counterName];
    if (!counterState || !counterState.current) return { success: false };

    const ticket = data.tickets.find(t => t.id === counterState.current);
    if (ticket) {
      ticket.status = STATUS.TERLEWAT;
    }
    counterState.current = null;
    counterState.status = 'idle';

    this.saveQueue(data);
    return { success: true };
  },

  resetAll() {
    const fresh = this.getInitialData();
    return fresh;
  },

  exportCSV() {
    const data = this.getQueue();
    const headers = ['ID', 'Nomor', 'Nama', 'Layanan', 'Prioritas', 'Status', 'Loket', 'Waktu Dibuat', 'Waktu Dipanggil'];
    const rows = data.tickets.map(t => [
      t.id,
      t.nomor,
      `"${t.nama.replace(/"/g, '""')}"`,
      t.layanan,
      t.prioritas,
      t.status,
      t.loket || '-',
      t.createdAt,
      t.calledAt || '-'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan-antrian-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
