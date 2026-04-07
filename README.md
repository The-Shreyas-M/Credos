# Credos (CampusChain)

Credos is a **campus digital-currency + lending network simulator** with a real-time shared ledger and role-based nodes.
It’s designed to demonstrate how restricted campus funds (grants, credits, subsidies) can be **spent only at authorized recipients**, while every action is recorded in a transparent audit trail.

## What it demonstrates

- **Role-based nodes**: Admin (treasury + approvals), Node (borrow/lend/repay), Merchant (receive payments)
- **Request/approval flow**: create node → pending → admin approves
- **Shared real-time state** across devices (laptop + phone) using a local relay
- **Auditability**: global ledger view of transactions (success + failure)

## Screenshots

<!-- Add screenshots here later -->

- Admin dashboard (treasury + approvals)
- Node dashboard (borrow/lend + repay)
- Merchant dashboard (payments)
- Global ledger view

## Tech stack

- React + Vite
- Tailwind CSS
- Gun (real-time graph DB) with a **local relay** for cross-device sync

## Quick start (recommended)

### Prerequisites

- Node.js (LTS recommended)

### Install

Clone and enter the project:

```bash
git clone https://github.com/The-Shreyas-M/Credos.git
cd Credos
```

Install dependencies:

```bash
npm install
```

### Run (app + shared relay)

```bash
npm run dev:net
```

This starts:

- Web app (Vite) at `http://localhost:5173/`
- Gun relay at `http://localhost:8765/gun`

## Open on your phone (same build, same shared state)

1. Ensure your phone can reach your laptop over the network (same Wi‑Fi, or any VPN/LAN setup).
2. On your laptop terminal, Vite prints a **Network** URL.
3. Open that URL on your phone browser.

The app points the phone to the same Gun relay automatically (it uses the hostname of the URL you opened).

## Demo accounts

These exist only for demonstration:

- Admin: ID `admin` / PIN `1234`
- Node: ID `CRED-101` / PIN `1234`
- Merchant: ID `M-999` / PIN `1234`

## Demo treasury

On a fresh database, the relay seeds the treasury with a demo balance so the UI is immediately usable.

If you want to reset the demo state:

1. Stop the server (`Ctrl + C`)
2. Delete the `data/` folder (local relay database)
3. Start again: `npm run dev:net`

## Scripts

- `npm run dev` — Vite dev server only
- `npm run relay` — local Gun relay only
- `npm run dev:net` — runs relay + Vite together
- `npm run build` — production build
- `npm run preview` — preview the production build

## “Decentralized” note (for judges)

Gun is **peer-to-peer capable** and can replicate data across multiple peers.
This repo defaults to a **local relay** to make the demo reliable and fully under your control.
To demonstrate stronger decentralization, run **2+ relays** on different machines and configure clients to use multiple peers.
