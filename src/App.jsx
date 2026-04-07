import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, LogOut, Lock } from 'lucide-react';
import Gun from 'gun';
import AdminPanel from './components/AdminPanel';
import NodePanel from './components/NodePanel';
import MerchantPanel from './components/MerchantPanel';
import Ledger from './components/Ledger';
import PinPad from './components/PinPad';

// --- GUN INITIALIZATION ---
// Use a local relay (running on this same host) to avoid public-relay collisions.
// When opened from another device (LAN/VPN), window.location.hostname will be your laptop's reachable IP/hostname.
const GUN_RELAY_PORT = 8765;
const gunPeer = `${window.location.protocol}//${window.location.hostname}:${GUN_RELAY_PORT}/gun`;
const gun = Gun({ peers: [gunPeer] });
const gunRoot = gun.get('campuschain_v2');

const DEMO_TREASURY_AMOUNT = 1_000_000;

const App = () => {
  const safeJsonParse = (raw, fallback) => {
    try {
      if (raw === null || raw === undefined) return fallback;
      const parsed = JSON.parse(raw);
      return parsed === undefined || parsed === null ? fallback : parsed;
    } catch {
      return fallback;
    }
  };

  const loadNumber = (raw, fallback) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  // --- CORE STATE ---
  const defaultUsers = [
    { id: 'admin', role: 'admin', name: 'Credos Admin', pin: '1234', isApproved: true, balance: 0 },
    { id: 'CRED-101', role: 'other', name: 'Demo Node', balance: 1000, pin: '1234', isApproved: true, repayScore: 520, joinedAt: Date.now() },
    { id: 'M-999', role: 'merchant', name: 'Campus Merchant', balance: 500, pin: '1234', isApproved: true }
  ];

  // --- REPAY SCORE ---
  const DEFAULT_REPAY_SCORE = 500;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const getRepayScore = (u) => (u && Number.isFinite(Number(u.repayScore)) ? Number(u.repayScore) : DEFAULT_REPAY_SCORE);

  const getBorrowTier = (repayScore) => {
    const s = Number(repayScore);
    if (s >= 750) return { name: 'PLATINUM', limit: 5000 };
    if (s >= 650) return { name: 'GOLD', limit: 2500 };
    if (s >= 550) return { name: 'SILVER', limit: 1500 };
    return { name: 'BRONZE', limit: 800 };
  };

  const [users, setUsers] = useState(() => {
    const fromCre = safeJsonParse(localStorage.getItem('cre_v1_users'), null);
    const fromCc = safeJsonParse(localStorage.getItem('cc_users'), null);
    const initial = Array.isArray(fromCre) ? fromCre : Array.isArray(fromCc) ? fromCc : defaultUsers;
    return initial.length > 0 ? initial : defaultUsers;
  });
  const [pendingUsers, setPendingUsers] = useState(() => {
    const fromCre = safeJsonParse(localStorage.getItem('cre_v1_pending'), null);
    const fromCc = safeJsonParse(localStorage.getItem('cc_pending'), null);
    return Array.isArray(fromCre) ? fromCre : Array.isArray(fromCc) ? fromCc : [];
  });
  const [loans, setLoans] = useState(() => {
    const fromCre = safeJsonParse(localStorage.getItem('cre_v1_loans'), null);
    const fromCc = safeJsonParse(localStorage.getItem('cc_loans'), null);
    return Array.isArray(fromCre) ? fromCre : Array.isArray(fromCc) ? fromCc : [];
  });
  const [activeUserId, setActiveUserId] = useState(() => (
    localStorage.getItem('cre_active_id') || localStorage.getItem('cc_active_id') || null
  ));
  const [treasury, setTreasury] = useState(() => {
    const fromCre = localStorage.getItem('cre_v1_treasury');
    const fromCc = localStorage.getItem('cc_treasury');
    return loadNumber(fromCre ?? fromCc, 1000000);
  });
  const [transactions, setTransactions] = useState(() => {
    const fromCre = safeJsonParse(localStorage.getItem('cre_v1_tx'), null);
    const fromCc = safeJsonParse(localStorage.getItem('cc_tx'), null);
    return Array.isArray(fromCre) ? fromCre : Array.isArray(fromCc) ? fromCc : [];
  });
  const [requests, setRequests] = useState(() => {
    const fromCre = safeJsonParse(localStorage.getItem('cre_v1_req'), null);
    const fromCc = safeJsonParse(localStorage.getItem('cc_req'), null);
    return Array.isArray(fromCre) ? fromCre : Array.isArray(fromCc) ? fromCc : [];
  });
  
  // --- GUN SYNC (hydrate first, then subscribe + write with de-dupe) ---
  const [gunHydrated, setGunHydrated] = useState(false);
  const lastSentRef = React.useRef({
    users: null,
    pendingUsers: null,
    loans: null,
    treasury: null,
    transactions: null,
    requests: null
  });

  const readOnce = (key) => new Promise((resolve) => {
    gunRoot.get(key).once((data) => resolve(data));
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [uRaw, pRaw, lRaw, tRaw, txRaw, rRaw, seededRaw] = await Promise.all([
        readOnce('users'),
        readOnce('pendingUsers'),
        readOnce('loans'),
        readOnce('treasury'),
        readOnce('transactions'),
        readOnce('requests'),
        readOnce('seeded')
      ]);
      if (cancelled) return;

      if (typeof uRaw === 'string') {
        const parsed = safeJsonParse(uRaw, null);
        if (Array.isArray(parsed) && parsed.length > 0) setUsers(parsed);
      }
      if (typeof pRaw === 'string') {
        const parsed = safeJsonParse(pRaw, null);
        if (Array.isArray(parsed)) setPendingUsers(parsed);
      }
      if (typeof lRaw === 'string') {
        const parsed = safeJsonParse(lRaw, null);
        if (Array.isArray(parsed)) setLoans(parsed);
      }
      if (tRaw !== undefined && tRaw !== null && tRaw !== '') {
        const n = Number(tRaw);
        if (Number.isFinite(n)) setTreasury(n);
      }
      if (typeof txRaw === 'string') {
        const parsed = safeJsonParse(txRaw, null);
        if (Array.isArray(parsed)) setTransactions(parsed);
      }
      if (typeof rRaw === 'string') {
        const parsed = safeJsonParse(rRaw, null);
        if (Array.isArray(parsed)) setRequests(parsed);
      }

      // One-time demo seed: if the shared DB isn't initialized yet, ensure treasury is non-zero.
      // This prevents "starts at 0" demos when the DB is fresh or got reset.
      const seeded = Boolean(seededRaw);
      const hasTreasuryValue = tRaw !== undefined && tRaw !== null && tRaw !== '';
      const treasuryNumber = Number(tRaw);
      const treasuryIsZeroish = !Number.isFinite(treasuryNumber) || treasuryNumber <= 0;

      if (!seeded && (!hasTreasuryValue || treasuryIsZeroish)) {
        setTreasury(DEMO_TREASURY_AMOUNT);
        gunRoot.get('treasury').put(DEMO_TREASURY_AMOUNT);
      }

      if (!seeded) {
        gunRoot.get('seeded').put(true);
      }

      setGunHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gunHydrated) return;

    const sub = (key, handler) => gunRoot.get(key).on(handler);

    const offUsers = sub('users', (data) => {
      if (typeof data !== 'string') return;
      lastSentRef.current.users = data;
      const parsed = safeJsonParse(data, null);
      if (Array.isArray(parsed) && parsed.length > 0) setUsers(parsed);
    });

    const offPending = sub('pendingUsers', (data) => {
      if (typeof data !== 'string') return;
      lastSentRef.current.pendingUsers = data;
      const parsed = safeJsonParse(data, null);
      if (Array.isArray(parsed)) setPendingUsers(parsed);
    });

    const offLoans = sub('loans', (data) => {
      if (typeof data !== 'string') return;
      lastSentRef.current.loans = data;
      const parsed = safeJsonParse(data, null);
      if (Array.isArray(parsed)) setLoans(parsed);
    });

    const offTreasury = sub('treasury', (data) => {
      if (data === undefined || data === null || data === '') return;
      const n = Number(data);
      if (!Number.isFinite(n)) return;
      lastSentRef.current.treasury = String(n);
      setTreasury(n);
    });

    const offTx = sub('transactions', (data) => {
      if (typeof data !== 'string') return;
      lastSentRef.current.transactions = data;
      const parsed = safeJsonParse(data, null);
      if (Array.isArray(parsed)) setTransactions(parsed);
    });

    const offReq = sub('requests', (data) => {
      if (typeof data !== 'string') return;
      lastSentRef.current.requests = data;
      const parsed = safeJsonParse(data, null);
      if (Array.isArray(parsed)) setRequests(parsed);
    });

    return () => {
      offUsers?.off?.();
      offPending?.off?.();
      offLoans?.off?.();
      offTreasury?.off?.();
      offTx?.off?.();
      offReq?.off?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gunHydrated]);

  useEffect(() => {
    if (!gunHydrated) return;

    const usersStr = JSON.stringify(users);
    if (usersStr !== lastSentRef.current.users) {
      lastSentRef.current.users = usersStr;
      gunRoot.get('users').put(usersStr);
    }

    const pendingStr = JSON.stringify(pendingUsers);
    if (pendingStr !== lastSentRef.current.pendingUsers) {
      lastSentRef.current.pendingUsers = pendingStr;
      gunRoot.get('pendingUsers').put(pendingStr);
    }

    const loansStr = JSON.stringify(loans);
    if (loansStr !== lastSentRef.current.loans) {
      lastSentRef.current.loans = loansStr;
      gunRoot.get('loans').put(loansStr);
    }

    const treasuryStr = String(treasury);
    if (treasuryStr !== lastSentRef.current.treasury) {
      lastSentRef.current.treasury = treasuryStr;
      gunRoot.get('treasury').put(treasury);
    }

    const txStr = JSON.stringify(transactions);
    if (txStr !== lastSentRef.current.transactions) {
      lastSentRef.current.transactions = txStr;
      gunRoot.get('transactions').put(txStr);
    }

    const reqStr = JSON.stringify(requests);
    if (reqStr !== lastSentRef.current.requests) {
      lastSentRef.current.requests = reqStr;
      gunRoot.get('requests').put(reqStr);
    }

    if (activeUserId) {
      localStorage.setItem('cre_active_id', activeUserId);
      localStorage.setItem('cc_active_id', activeUserId);
    } else {
      localStorage.removeItem('cre_active_id');
      localStorage.removeItem('cc_active_id');
    }
  }, [gunHydrated, users, pendingUsers, loans, treasury, transactions, requests, activeUserId]);
  
  // --- VIEW STATE ---
  const [view, setView] = useState('LOGIN'); // LOGIN, REGISTER

  // --- AUTH STATE ---
  const [auth, setAuth] = useState({ show: false, action: null, targetPin: "" });

  useEffect(() => {
    localStorage.setItem('cc_users', JSON.stringify(users));
    localStorage.setItem('cc_pending', JSON.stringify(pendingUsers));
    localStorage.setItem('cc_loans', JSON.stringify(loans));
    localStorage.setItem('cc_treasury', String(treasury));
    localStorage.setItem('cc_tx', JSON.stringify(transactions));
    localStorage.setItem('cc_req', JSON.stringify(requests));

    localStorage.setItem('cre_v1_users', JSON.stringify(users));
    localStorage.setItem('cre_v1_pending', JSON.stringify(pendingUsers));
    localStorage.setItem('cre_v1_loans', JSON.stringify(loans));
    localStorage.setItem('cre_v1_treasury', String(treasury));
    localStorage.setItem('cre_v1_tx', JSON.stringify(transactions));
    localStorage.setItem('cre_v1_req', JSON.stringify(requests));
  }, [users, pendingUsers, loans, treasury, transactions, requests]);

  const currentUser = useMemo(() => users.find(u => u.id === activeUserId) || null, [users, activeUserId]);

  useEffect(() => {
    if (!gunHydrated) return;
    if (activeUserId && !currentUser) setActiveUserId(null);
  }, [gunHydrated, activeUserId, currentUser]);

  // --- CORE LOGIC ---
  const addTx = (f, t, a, c, s) => setTransactions([{ id: Date.now(), f, t, a, c, s, time: new Date().toLocaleTimeString() }, ...transactions]);

  const scoreLoanSettlement = ({ repaymentCount, fundedAt, settledAt }) => {
    const expectedPayments = 3;
    const payments = Math.max(1, Number(repaymentCount) || 1);
    let delta = 0;

    if (payments <= expectedPayments) delta += (expectedPayments - payments + 1) * 12;
    else delta -= (payments - expectedPayments) * 10;

    const start = Number(fundedAt);
    const end = Number(settledAt);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      const days = (end - start) / (1000 * 60 * 60 * 24);
      if (days <= 1) delta += 20;
      else if (days <= 7) delta += 10;
      else if (days > 30) delta -= 10;
    }

    return delta;
  };

  const normalizeTxList = (txList) => {
    if (!Array.isArray(txList)) return [];
    return txList
      .filter(Boolean)
      .filter(tx => tx && (typeof tx.id === 'number' || typeof tx.id === 'string'))
      .map(tx => ({ ...tx }))
      .sort((a, b) => {
        const ai = typeof a.id === 'number' ? a.id : Number(a.id);
        const bi = typeof b.id === 'number' ? b.id : Number(b.id);
        if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai;
        return String(b.id).localeCompare(String(a.id));
      });
  };

  const unionMergeTx = (a, b) => {
    const out = [];
    const seen = new Set();
    const push = (tx) => {
      if (!tx) return;
      const key = String(tx.id);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(tx);
    };
    normalizeTxList(a).forEach(push);
    normalizeTxList(b).forEach(push);
    return normalizeTxList(out);
  };

  const hashString = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
  };

  const ledgerFingerprint = (txList) => {
    const ids = normalizeTxList(txList).map(tx => String(tx.id)).join('|');
    return hashString(ids);
  };

  const publishLedgerSnapshot = (nodeId, txList) => {
    if (!nodeId) return;
    const normalized = normalizeTxList(txList);
    const fingerprint = ledgerFingerprint(normalized);
    gun.get('cre_v1_tx_snaps').get(nodeId).put({
      nodeId,
      hash: fingerprint,
      updatedAt: Date.now(),
      tx: JSON.stringify(normalized)
    });
  };

  const fetchLedgerSnapshots = async (nodeIds, timeoutMs = 1500) => {
    const ids = (nodeIds || []).filter(Boolean);
    if (ids.length === 0) return [];

    const readOne = (nodeId) => new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(null);
      }, timeoutMs);

      gun.get('cre_v1_tx_snaps').get(nodeId).once((data) => {
        if (settled) return;
        clearTimeout(timer);
        settled = true;
        resolve(data || null);
      });
    });

    const results = await Promise.all(ids.map(readOne));
    return results
      .filter(Boolean)
      .filter(s => typeof s.hash === 'string' && typeof s.tx === 'string');
  };

  const adoptMajorityLedger = async () => {
    const nodeIds = users.map(u => u.id);
    const snapshots = await fetchLedgerSnapshots(nodeIds);
    if (snapshots.length === 0) return;

    const byHash = new Map();
    for (const snap of snapshots) {
      const key = snap.hash;
      const prev = byHash.get(key);
      byHash.set(key, {
        count: (prev?.count || 0) + 1,
        latestAt: Math.max(prev?.latestAt || 0, Number(snap.updatedAt) || 0),
        snap
      });
    }

    let winner = null;
    for (const v of byHash.values()) {
      if (!winner) winner = v;
      else if (v.count > winner.count) winner = v;
      else if (v.count === winner.count && v.latestAt > winner.latestAt) winner = v;
    }
    if (!winner) return;

    const majorityTx = safeJsonParse(winner.snap.tx, []);
    const merged = winner.count >= 2 ? normalizeTxList(majorityTx) : unionMergeTx(transactions, majorityTx);
    const currentHash = ledgerFingerprint(transactions);
    const nextHash = ledgerFingerprint(merged);
    if (nextHash !== currentHash) setTransactions(merged);
  };

  const executePayment = (data) => {
    const sender = users.find(u => u.id === (data.fromId || activeUserId));
    const amt = data.amt;
    if (!sender) return;

    const sBal = sender.balance || 0;

    if (data.mid === 'SYSTEM_POOL') {
      const targetLoan = loans.find(l => l.id === data.loanId);
      if (!targetLoan) return alert("LOAN NOT FOUND");

      const remainingToFund = (targetLoan.amount || 0) - (targetLoan.fundedAmount || 0);
      if (remainingToFund <= 0) {
        addTx(sender.id, 'SYSTEM', 0, 'LEND_CONTRIBUTION', 'FAILED');
        return alert('POOL ALREADY FULL');
      }

      const contributeAmt = Math.min(Number(amt) || 0, remainingToFund);
      if (!Number.isFinite(contributeAmt) || contributeAmt <= 0) {
        addTx(sender.id, 'SYSTEM', 0, 'LEND_CONTRIBUTION', 'FAILED');
        return alert('ENTER VALID AMOUNT');
      }

      if (sBal < contributeAmt) {
        addTx(sender.id, 'SYSTEM', contributeAmt, 'LEND_CONTRIBUTION', 'FAILED');
        return alert('INSUFFICIENT FUNDS');
      }

      const newFunded = (targetLoan.fundedAmount || 0) + contributeAmt;
      const reached = newFunded >= targetLoan.amount;

      setUsers(prev => prev.map(u => {
        let newBal = u.balance || 0;
        if (u.id === sender.id) newBal -= contributeAmt;
        return { ...u, balance: newBal };
      }));

      setLoans(prev => prev.map(l => l.id === data.loanId ? {
        ...l,
        fundedAmount: newFunded,
        status: reached ? 'AWAIT_GUARANTOR' : 'PENDING',
        poolFundedAt: reached ? (l.poolFundedAt || Date.now()) : l.poolFundedAt,
        repaymentCount: l.repaymentCount || 0,
        repaidAmount: typeof l.repaidAmount === 'number' ? l.repaidAmount : 0,
        guarantorId: l.guarantorId || null,
        guarantorStatus: l.guarantorStatus || 'NONE',
        contributions: [...l.contributions, { lenderId: sender.id, amount: contributeAmt }]
      } : l));

      if (reached) addTx('SYSTEM', targetLoan.borrowerId, targetLoan.amount, 'POOL_FULL_AWAIT_GUARANTOR', 'SUCCESS');
      addTx(sender.id, 'SYSTEM', contributeAmt, 'LEND_CONTRIBUTION', 'SUCCESS');

      if (data.reqId) setRequests(prev => prev.filter(r => r.id !== data.reqId));
      if (data.callback) data.callback();
      return;
    }

    if (sBal >= amt) {
      setUsers(prev => prev.map(u => {
        if (u.id === sender.id) return { ...u, balance: (u.balance || 0) - amt };
        if (u.id === data.mid) return { ...u, balance: (u.balance || 0) + amt };
        return u;
      }));
      addTx(sender.id, data.mid, amt, 'GENERAL', 'SUCCESS');

      if (data.reqId) setRequests(prev => prev.filter(r => r.id !== data.reqId));
      if (data.callback) data.callback();
    } else {
      addTx(sender.id, data.mid, amt, 'GENERAL', 'FAILED');
      alert("INSUFFICIENT FUNDS");
    }
  };

  const executeWithdraw = (data) => {
    const fromId = data.fromId || activeUserId;
    const amt = Number(data.amt);
    if (!fromId) return;
    if (!Number.isFinite(amt) || amt <= 0) return alert('ENTER VALID AMOUNT');

    const actor = users.find(u => u.id === fromId);
    if (!actor) return;
    const bal = actor.balance || 0;
    if (bal < amt) return alert('INSUFFICIENT FUNDS');

    setUsers(prev => prev.map(u => u.id === fromId ? { ...u, balance: (u.balance || 0) - amt } : u));
    addTx(fromId, 'VOID', amt, 'TOKENS_BURNT', 'SUCCESS');
    alert(`WITHDRAWAL COMPLETE: ${amt} CRD BURNT`);
    if (data.callback) data.callback();
  };

  // Publish our ledger snapshot whenever it changes (signed-in nodes only)
  useEffect(() => {
    if (!activeUserId) return;
    publishLedgerSnapshot(activeUserId, transactions);
  }, [activeUserId, transactions]);

  // When coming online, reconcile ledger using majority snapshot
  useEffect(() => {
    const onOnline = () => {
      adoptMajorityLedger();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [users, transactions]);

  // On initial load, attempt a majority reconciliation once users are known
  useEffect(() => {
    if (!users || users.length === 0) return;
    adoptMajorityLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.length]);

  const getLoanTotalDue = (loan) => loan.amount + (loan.amount * (loan.interest / 100));
  const getLoanRepaidAmount = (loan) => {
    if (typeof loan.repaidAmount === 'number') return loan.repaidAmount;
    if (loan.status === 'SETTLED') return getLoanTotalDue(loan);
    return 0;
  };

  const repayLoan = (loanId, requestedAmount) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    if (!['FUNDED', 'REPAYING', 'SETTLED'].includes(loan.status)) return alert('LOAN NOT FUNDED');
    if (loan.status === 'SETTLED') return alert('LOAN ALREADY SETTLED');

    const totalDue = getLoanTotalDue(loan);
    const alreadyRepaid = getLoanRepaidAmount(loan);
    const remaining = Math.max(0, totalDue - alreadyRepaid);
    if (remaining <= 0) return;

    const borrower = users.find(u => u.id === activeUserId);
    if (!borrower) return;

    const parsed = requestedAmount === undefined || requestedAmount === null || requestedAmount === ''
      ? remaining
      : Number(requestedAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return alert('ENTER VALID REPAYMENT AMOUNT');

    const payAmount = Math.min(parsed, remaining);
    if ((borrower.balance || 0) < payAmount) return alert('INSUFFICIENT FUNDS FOR REPAYMENT');

    const priorRepaymentCount = Number.isFinite(Number(loan.repaymentCount)) ? Number(loan.repaymentCount) : 0;
    const fundedAt = loan.fundedAt;

    setAuth({
      show: true,
      targetPin: borrower.pin,
      action: {
        type: 'REPAY',
        loanId,
        amt: payAmount,
        callback: () => {
          setUsers(prev => prev.map(u => {
            let newBal = u.balance || 0;
            if (u.id === activeUserId) newBal -= payAmount;

            const contributedByUser = loan.contributions
              .filter(c => c.lenderId === u.id)
              .reduce((sum, c) => sum + (c.amount || 0), 0);
            if (contributedByUser > 0) {
              const share = contributedByUser / loan.amount;
              newBal += payAmount * share;
            }

            if (u.id === activeUserId) {
              const nextRepaid = alreadyRepaid + payAmount;
              const settled = nextRepaid >= totalDue - 1e-9;
              if (settled) {
                const settledAt = Date.now();
                const delta = scoreLoanSettlement({
                  repaymentCount: priorRepaymentCount + 1,
                  fundedAt,
                  settledAt
                });
                const nextScore = clamp(getRepayScore(u) + delta, 300, 900);
                return { ...u, balance: newBal, repayScore: nextScore };
              }
            }
            return { ...u, balance: newBal };
          }));

          const nextRepaid = alreadyRepaid + payAmount;
          const settled = nextRepaid >= totalDue - 1e-9;
          const settledAt = settled ? Date.now() : undefined;

          setLoans(prev => prev.map(l => l.id === loanId ? {
            ...l,
            repaidAmount: settled ? totalDue : nextRepaid,
            repaymentCount: priorRepaymentCount + 1,
            settledAt: settled ? (l.settledAt || settledAt) : l.settledAt,
            status: settled ? 'SETTLED' : 'REPAYING'
          } : l));

          addTx(activeUserId, 'LENDERS', payAmount, settled ? 'LOAN_REPAID' : 'LOAN_REPAYMENT', 'SUCCESS');
          alert(settled ? 'LOAN FULLY SETTLED!' : 'INSTALLMENT PAYMENT SUCCESSFUL');
        }
      }
    });
  };

  const approveGuarantorRequest = (reqId) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    if (req.type !== 'GUARANTOR') return;
    if (req.to !== activeUserId) return;

    const loan = loans.find(l => l.id === req.loanId);
    if (!loan) return alert('LOAN NOT FOUND');
    if (loan.status !== 'AWAIT_GUARANTOR') return alert('LOAN NOT AWAITING GUARANTOR');

    const guarantor = users.find(u => u.id === activeUserId);
    const borrower = users.find(u => u.id === loan.borrowerId);
    if (!guarantor || !borrower) return;

    if (guarantor.role !== 'other') return alert('ONLY NODES CAN GUARANTEE');
    const lenderIds = new Set((loan.contributions || []).map(c => c && c.lenderId).filter(Boolean));
    if (lenderIds.has(guarantor.id)) return alert('LENDERS CANNOT BE GUARANTORS FOR THIS LOAN');

    const totalDue = getLoanTotalDue(loan);
    if ((guarantor.balance || 0) < totalDue) return alert('INSUFFICIENT FUNDS TO GUARANTEE');

    setAuth({
      show: true,
      targetPin: guarantor.pin,
      action: {
        type: 'GUARANTOR_APPROVE',
        reqId,
        callback: () => {
          setLoans(prev => prev.map(l => l.id === loan.id ? {
            ...l,
            status: 'FUNDED',
            fundedAt: l.fundedAt || Date.now(),
            guarantorId: activeUserId,
            guarantorStatus: 'APPROVED',
            guarantorApprovedAt: Date.now(),
            guaranteeAmount: totalDue
          } : l));

          setUsers(prev => prev.map(u => {
            if (u.id === loan.borrowerId) return { ...u, balance: (u.balance || 0) + (loan.amount || 0) };
            return u;
          }));

          setRequests(prev => prev.filter(r => r.id !== reqId));
          addTx(activeUserId, loan.borrowerId, totalDue, 'GUARANTOR_APPROVED', 'SUCCESS');
          addTx('SYSTEM_POOL', loan.borrowerId, loan.amount, 'LOAN_DISBURSED', 'SUCCESS');
          alert('GUARANTOR APPROVED. LOAN DISBURSED!');
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4">
      <header className="max-w-7xl mx-auto flex justify-between border-b border-white/5 pb-4 mb-8">
        <div className="flex items-center gap-4">
          <ShieldCheck className="text-emerald-500" />
          <h1 className="font-black tracking-tighter text-xl text-white">CREDOS <span className="text-[10px] text-emerald-500/50">v1.0_LendingNode</span></h1>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="hidden sm:inline text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full font-bold border border-blue-500/20">TREASURY: {treasury.toLocaleString()} CRD</span>
          {activeUserId && (
            <div className="flex items-center gap-4">
              <span className="text-slate-500 uppercase">{currentUser?.name || activeUserId} ({currentUser?.role || 'unknown'})</span>
              <button onClick={() => setActiveUserId(null)} className="hover:text-red-400 flex items-center gap-1"><LogOut size={12}/> DISCONNECT</button>
            </div>
          )}
        </div>
      </header>

      {!activeUserId ? (
        view === 'LOGIN' ? (
          <div className="max-w-md mx-auto mt-24">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
              <Lock className="mx-auto mb-4 text-emerald-500" size={32}/>
              <input id="login-id" className="w-full bg-black border border-slate-800 p-4 rounded-xl mb-4 outline-none focus:border-emerald-500 text-white transition-all font-mono" placeholder="ENTER NODE ID" />
              <button onClick={() => {
                  const val = document.getElementById('login-id').value;
                  const u = users.find(x => x.id === val);
                  if(u) {
                    if (!u.isApproved) return alert("ACCOUNT PENDING ADMIN APPROVAL");
                    setAuth({ show: true, targetPin: u.pin, action: { type: 'LOGIN', id: u.id } });
                  } else alert("UNKNOWN NODE ID");
                }} className="w-full bg-emerald-600 text-black font-black py-4 rounded-xl hover:bg-emerald-400 transition-all mb-4">AUTH NODE</button>
              <button onClick={() => setView('REGISTER')} className="w-full bg-slate-800 text-slate-400 font-bold py-3 rounded-xl hover:bg-slate-750 transition-all text-xs">CREATE NEW NODE (REGISTER)</button>
              <div className="mt-8 bg-black/50 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest text-center">Quick Access Nodes</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] hover:bg-white/5 p-1 px-2 rounded cursor-pointer group" onClick={() => document.getElementById('login-id').value = 'admin'}><span className="text-slate-500 uppercase">Admin:</span><span className="text-emerald-500 font-bold">admin</span></div>
                  <div className="flex justify-between items-center text-[11px] hover:bg-white/5 p-1 px-2 rounded cursor-pointer group" onClick={() => document.getElementById('login-id').value = 'CRED-101'}><span className="text-slate-500 uppercase">Node:</span><span className="text-emerald-500 font-bold">CRED-101</span></div>
                  <div className="flex justify-between items-center text-[11px] hover:bg-white/5 p-1 px-2 rounded cursor-pointer group" onClick={() => document.getElementById('login-id').value = 'M-999'}><span className="text-slate-500 uppercase">Merchant:</span><span className="text-emerald-500 font-bold">M-999</span></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto mt-24">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
              <h2 className="text-xl font-black text-white mb-6 text-center">REGISTER_NEW_NODE</h2>
              <div className="space-y-4">
                <div><label className="text-[10px] text-slate-500 font-bold ml-1">FULL NAME</label><input id="reg-name" className="w-full bg-black border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500 text-white" placeholder="NAME" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold ml-1">USER ROLE</label><select id="reg-role" className="w-full bg-black border border-slate-800 p-4 rounded-xl outline-none text-white appearance-none"><option value="other">Node (Lender/Borrower)</option><option value="merchant">Merchant</option></select></div>
                <div><label className="text-[10px] text-slate-500 font-bold ml-1">SET PIN (4 DIGITS)</label><input id="reg-pin" type="password" maxLength="4" className="w-full bg-black border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500 text-white" placeholder="0000" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold ml-1">AADHAR CARD NO. (MANUAL VERIF)</label><input id="reg-aadhar" className="w-full bg-black border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500 text-white" placeholder="XXXX-XXXX-XXXX" /></div>
                <button onClick={() => {
                    const name = document.getElementById('reg-name').value;
                    const role = document.getElementById('reg-role').value;
                    const pin = document.getElementById('reg-pin').value;
                    const aadhar = document.getElementById('reg-aadhar').value;
                    if (!name || !pin || !aadhar) return alert("FILL ALL FIELDS");
                    if (pin.length !== 4) return alert("PIN MUST BE 4 DIGITS");
                    if (pin.length !== 4) return alert("PIN MUST BE 4 DIGITS");
                    const newId = role === 'merchant' ? `M-${Math.floor(100+Math.random()*899)}` : `CRED-${Math.floor(100+Math.random()*899)}`;
                    setPendingUsers(prev => [...prev, { id: newId, name, role, pin, aadhar, balance: 0, isApproved: false, repayScore: 500, joinedAt: Date.now(), timestamp: new Date().toLocaleString() }]);
                    alert(`REGISTRATION SUBMITTED! YOUR NODE ID: ${newId}. PLEASE WAIT FOR VERIFICATION.`);
                    setView('LOGIN');
                  }} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-500 transition-all mt-4">SUBMIT APPLICATION</button>
                <button onClick={() => setView('LOGIN')} className="w-full text-slate-500 font-bold py-2 hover:text-slate-300 transition-all text-[10px]">BACK TO LOGIN</button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
            {currentUser?.role === 'admin' && <AdminPanel users={users} setUsers={setUsers} pendingUsers={pendingUsers} setPendingUsers={setPendingUsers} treasury={treasury} setTreasury={setTreasury} addTx={addTx} />}
            {currentUser?.role === 'other' && (
              <NodePanel
                user={currentUser}
                users={users}
                requests={requests}
                setRequests={setRequests}
                setAuth={setAuth}
                loans={loans}
                setLoans={setLoans}
                addTx={addTx}
                repayLoan={repayLoan}
                approveGuarantorRequest={approveGuarantorRequest}
              />
            )}
            {currentUser?.role === 'merchant' && <MerchantPanel user={currentUser} users={users} setUsers={setUsers} requests={requests} setRequests={setRequests} setAuth={setAuth} addTx={addTx} />}
          </div>
          <div className="lg:col-span-8 order-1 lg:order-2"><Ledger transactions={transactions} /></div>
        </div>
      )}
      <PinPad auth={auth} setAuth={setAuth} onSuccess={(data) => {
          if (data.type === 'LOGIN') setActiveUserId(data.id);
          if (data.type === 'PAY') executePayment(data);
          if (data.type === 'REPAY') data.callback();
          if (data.type === 'GUARANTOR_APPROVE') data.callback();
          if (data.type === 'WITHDRAW') executeWithdraw(data);
        }}
      />
    </div>
  );
};

export default App;