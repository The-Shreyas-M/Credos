import React, { useState } from 'react';
import { BellRing, Receipt, Send } from 'lucide-react';

const MerchantPanel = ({ user, users, setUsers, setRequests, setAuth, addTx }) => {
  const [targetId, setTargetId] = useState("");
  const [transferAmt, setTransferAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const balance = user.balance || 0;

  const handleTransfer = () => {
    const amt = parseInt(transferAmt);
    if (!targetId || isNaN(amt) || amt <= 0) return alert("INVALID_PARAMETERS");
    if (balance < amt) return alert("INSUFFICIENT_FUNDS");

    setAuth({ 
      show: true, 
      targetPin: user.pin, 
      action: { type: 'PAY', mid: targetId, amt, cat: 'GENERAL' } 
    });
    setTransferAmt("");
  };

  return (
    <div className="space-y-6">
      {/* 1. REVENUE OVERVIEW */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-yellow-500/20 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Revenue</p>
          <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded border border-yellow-500/20 font-mono font-bold">
            MERCHANT_NODE
          </span>
        </div>
        
        <h2 className="text-4xl font-black text-yellow-500 mb-6">{balance.toLocaleString()} <span className="text-sm">CRD</span></h2>
      </div>

      {/* 1B. WITHDRAW (BURN) */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-red-500/20 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Withdraw (Burn)</p>
          <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 font-mono font-bold">
            PERMANENT
          </span>
        </div>
        <div className="space-y-3">
          <input
            type="number"
            value={withdrawAmt}
            onChange={(e) => setWithdrawAmt(e.target.value)}
            className="w-full bg-black border border-slate-800 p-3 rounded-lg text-xs text-white"
            placeholder="Amount to withdraw (burn)"
          />
          <button
            onClick={() => {
              const amt = Number(withdrawAmt);
              if (!Number.isFinite(amt) || amt <= 0) return alert('INVALID_PARAMETERS');
              if ((user.balance || 0) < amt) return alert('INSUFFICIENT_FUNDS');
              setAuth({
                show: true,
                targetPin: user.pin,
                action: { type: 'WITHDRAW', fromId: user.id, amt, callback: () => setWithdrawAmt('') }
              });
            }}
            className="w-full bg-red-600 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all"
          >
            WITHDRAW & BURN
          </button>
          <p className="text-[9px] text-slate-500">Burnt tokens cannot be restored.</p>
        </div>
      </div>

      {/* 2. SEND CREDOS */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
            <Send size={14} className="text-blue-500"/> P2P_NODE_TRANSFER
        </h3>
        <div className="space-y-3">
            <select 
                value={targetId} onChange={e => setTargetId(e.target.value)}
                className="w-full bg-black border border-slate-800 p-3 rounded-lg text-xs text-white"
            >
                <option value="">-- SELECT RECIPIENT --</option>
                {users.filter(u => u.id !== user.id && u.role !== 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
            </select>
            <input 
                type="number" value={transferAmt} onChange={e => setTransferAmt(e.target.value)}
                className="w-full bg-black border border-slate-800 p-3 rounded-lg text-xs text-white" placeholder="Amount (CRD)" 
            />
            <button 
                onClick={handleTransfer}
                className="w-full bg-blue-600 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
            >
                EXECUTE TRANSFER
            </button>
        </div>
      </div>
      
      {/* 3. REQUEST PAYMENT (INVOICE) */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-xs font-bold flex items-center gap-2">
             <BellRing size={14} className="text-yellow-500"/> ISSUE_INVOICE
           </h3>
           <Receipt size={14} className="text-slate-600"/>
        </div>

        <div className="space-y-3">
          <select id="r-target" className="w-full bg-black border border-slate-800 p-3 rounded-lg text-xs text-white">
            <option value="">-- SELECT TARGET NODE --</option>
            {users.filter(u => u.role === 'other').map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
          </select>

          <input id="r-amt" type="number" className="w-full bg-black border border-slate-800 p-3 rounded-lg text-xs text-white" placeholder="Amount (CRD)" />

          <button onClick={() => {
            const sid = document.getElementById('r-target').value;
            const amt = parseInt(document.getElementById('r-amt').value);
            
            if(!sid || !amt || amt <= 0) return alert("INVALID_REQUEST_PARAMETERS");
            
            setRequests(prev => [...prev, { 
              id: Date.now(), 
              from: user.name, 
              fromId: user.id, 
              to: sid, 
              amt 
            }]);
            
            document.getElementById('r-amt').value = "";
            alert(`INVOICE ISSUED TO ${sid}`);
          }} className="w-full bg-yellow-600 text-black font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-yellow-500 transition-all active:scale-95 shadow-lg shadow-yellow-900/20">
            DISPATCH BILL
          </button>
        </div>
      </div>
    </div>
  );
};

export default MerchantPanel;
