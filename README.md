# Credos (CampusChain)

Credos is a **campus digital-currency + lending network simulator** with a real-time shared ledger and role-based nodes.
It’s designed to demonstrate how restricted campus funds (grants, credits, subsidies) can be **spent only at authorized recipients**, while every action is recorded in a transparent audit trail.

## What it demonstrates

- **Role-based nodes**: Admin (treasury + approvals), Node (borrow/lend/repay), Merchant (receive payments)
- **Request/approval flow**: create node → pending → admin approves
- **Shared real-time state** across devices (laptop + phone) using a local relay
- **Auditability**: global ledger view of transactions (success + failure)

## Screenshots

### Onboarding & Login

**main login page**

![main login page](docs/screenshots/main%20login%20page.png)

**borrower lender login**

![borrower lender login](docs/screenshots/borrower%20lender%20login.png)

**register new node**

![register new node](docs/screenshots/register%20new%20node.png)

**safe keypad**

![safe keypad](docs/screenshots/safe%20keypad.png)

### Admin: Approvals

**new node request at admin**

![new node request at admin](docs/screenshots/new%20node%20request%20at%20admin.png)

**admin panel**

![admin panel](docs/screenshots/admin%20panel.png)

### Lending Flow

**loan request**

![loan request](docs/screenshots/loan%20request.png)

**lending pool**

![lending pool](docs/screenshots/lending%20pool.png)

**lend pool contribution**

![lend pool contribution](docs/screenshots/lend%20pool%20contribution.png)

**loan pool full choose guarantor**

![loan pool full choose guarantor](docs/screenshots/loan%20pool%20full%20choose%20guarantor.png)

**select guarantor**

![select guarantor](docs/screenshots/select%20guarantor.png)

**guarantor gets request**

![guarantor gets request](docs/screenshots/guarantor%20gets%20request.png)

**loan disbursed**

![loan disbursed](docs/screenshots/loan%20disbursed.png)

**flexible repayments**

![flexible repayments](docs/screenshots/flexible%20repayments.png)

### Merchant

**amount recieved**

![amount recieved](docs/screenshots/amount%20recieved.png)

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

### Optional: Tailscale steps (recommended for cross-network demos)

If your phone and laptop are not on the same Wi‑Fi, you can still access the laptop-hosted demo using a private mesh VPN.

1. Install Tailscale on **laptop** and **phone** and sign in.
2. Turn Tailscale **ON** on both devices.
3. Start the demo on the laptop:

```bash
npm run dev:net
```

4. In the terminal output, Vite prints a **Network** URL. Open that URL on your phone.

Notes:

- Do not hard-code IPs into the repo. The URL will be different for every network/device.
- If the phone can’t load the page, check Windows Firewall allows inbound TCP `5173` (Vite) and `8765` (Gun relay) on private networks.

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

## Hosting & persistence (Vercel note)

- You *can* deploy the **frontend** to Vercel.
- The **Gun relay** in this repo is a stateful server that writes to disk; serverless platforms like Vercel do not provide reliable long-lived disk/network state for this kind of peer.
- For true cross-device persistence without relying on browser storage, you need a **persistent always-on peer/relay** somewhere (a VPS, Fly.io/Railway/Render, or similar). The frontend can then point to that relay.
