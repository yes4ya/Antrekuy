# Antrekuy — Digital Queue Management System

Antrekuy is a modern, production-ready, client-side digital queue management system built with **React 18**, **Vite**, **Tailwind-inspired clean CSS**, and **Lucide React**. It features multi-view architecture, real-time synchronization across browser tabs using `BroadcastChannel` and `localStorage`, text-to-speech audio announcements, 2:1 priority queue scheduling, and instant scan-to-track QR codes.

---

## Key Features

1. **Multi-View Architecture**:
   - **Public Kiosk**: Issue queue tickets with custom names and service types. Includes instant QR code generation for ticket tracking.
   - **Ticket Status Check**: Real-time position checker for customers using ticket ID or scanning the QR code.
   - **Staff Dashboard / Counters**: Manage queues (Call, Recall, Skip, Complete, Transfer) with role-based access control (Loket 1, 2, 3).
   - **TV Display**: Large-format real-time display showing currently called ticket numbers, active counters, live clock, and upcoming queue summary.
   - **Admin Dashboard**: Analytics, queue reset, and CSV export capabilities.

2. **Real-Time Synchronization**:
   - Zero backend required: uses browser `BroadcastChannel` API and `localStorage` events to synchronize state instantly across multiple browser windows/tabs.

3. **Audio Announcements**:
   - Integrated Web Speech API (`speechSynthesis`) for automatic audio announcements when calling queue numbers.

4. **Priority Queue Scheduling**:
   - Advanced 2:1 scheduling algorithm ensuring priority and VIP tickets are serviced efficiently alongside regular tickets.

---

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite v5
- **Styling**: Pure modern CSS with CSS variables (utilitarian, clean slate/gray palette)
- **Icons**: Lucide React
- **QR Code**: `qrcode.react`
- **State & Sync**: React Context, LocalStorage, BroadcastChannel API

---

## Demo Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Loket 1** | `loket1` | `loket123` |
| **Loket 2** | `loket2` | `loket234` |
| **Loket 3** | `loket3` | `loket345` |

---

## Installation & Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yes4ya/Antrekuy.git
   cd AntrianOnline
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## License

MIT License — Created by Yesaya Roy Nugraha.
