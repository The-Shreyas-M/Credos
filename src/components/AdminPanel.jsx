import React, { useState } from 'react';
import { Banknote, Users, Trash2, ShieldCheck } from 'lucide-react';

const AdminPanel = ({ users = [], setUsers, pendingUsers = [], setPendingUsers, treasury, setTreasury, addTx }) => {
  const [selectedRecipient, setSelectedRecipient] = useState("");

  const approveUser = (id) => {
    const userToApprove = pendingUsers.find(u => u.id === id);
    if (!userToApprove) return;

    setUsers([...users, { ...userToApprove, isApproved: true }]);
    setPendingUsers(pendingUsers.filter(u => u.id !== id));
    addTx('SYSTEM', id, 0, 'NODE_APPROVED', 'SUCCESS');
    alert(`NODE ${id} APPROVED`);
  };

  const declineUser = (id) => {
    if (window.confirm("ARE YOU SURE YOU WANT TO DECLINE THIS REGISTRATION?")) {
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
      addTx('SYSTEM', id, 0, 'NODE_DECLINED', 'SUCCESS');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. DIRECTORY */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-white/5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2"><Users size={14} className="text-blue-400"/> ACTIVE_NODES</div>
          <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[8px]">{users.length} TOTAL</span>
        </div>
        <div className="max-h-32 overflow-y-auto">
          <table className="w-full text-[10px] text-left">
            <tbody className="divide-y divide-slate-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/5 group">
                  <td className="p-2 font-mono text-blue-400">{u.id}</td>
                  <td className="p-2 font-bold uppercase">{u.name}</td>
                  <td className="p-2 text-slate-500 uppercase text-[8px]">{u.role}</td>
                  <td className="p-2 text-right opacity-0 group-hover:opacity-100">
                    {u.role !== 'admin' && (
                      <Trash2 
                        size={12} 
                        className="cursor-pointer text-red-500 inline" 
                        onClick={() => {
                          if(window.confirm(`Delete ${u.name}?`)) {
                            setUsers(users.filter(x => x.id !== u.id));
                            addTx('SYSTEM', 'VOID', 0, 'NODE_DELETED', 'SUCCESS');
                          }
                        }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. PENDING REGISTRATIONS */}
      <div className="bg-slate-900 rounded-2xl border border-yellow-500/20 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-yellow-500/5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-yellow-500"/> VERIFICATION_QUEUE</div>
          <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[8px]">{pendingUsers.length} PENDING</span>
        </div>
        <div className="max-h-60 overflow-y-auto p-4 space-y-4">
          {pendingUsers.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-4 italic">NO APPLICATIONS_IN_QUEUE</p>
          ) : (
            pendingUsers.map(u => (
              <div key={u.id} className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-white">{u.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">{u.id} | {u.role.toUpperCase()}</p>
                  </div>
                  <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">{u.timestamp}</span>
                </div>
                
                <div className="bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                   <p className="text-[8px] text-blue-400 font-bold uppercase mb-1">KYC DATA (Verified against Registry)</p>
                   <p className="text-[10px] text-slate-300 font-mono break-all line-clamp-1">AADHAR/ID: {u.aadhar}</p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => approveUser(u.id)}
                    className="flex-1 bg-emerald-600/20 text-emerald-500 border border-emerald-600/30 font-black py-2 rounded-lg text-[9px] uppercase hover:bg-emerald-600 hover:text-black transition-all"
                  >
                    APPROVE
                  </button>
                  <button 
                    onClick={() => declineUser(u.id)}
                    className="flex-1 bg-red-600/10 text-red-500 border border-red-600/20 font-black py-2 rounded-lg text-[9px] uppercase hover:bg-red-600 hover:text-white transition-all"
                  >
                    DECLINE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. MINTING ENGINE */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-blue-500/20">
        <h3 className="text-blue-400 font-bold mb-4 text-xs tracking-widest flex items-center gap-2">
          <Banknote size={14}/> LIQUIDITY_MINTING_MODULE
        </h3>
        <div className="space-y-4">
          
          <div>
            <p className="text-[9px] text-slate-500 uppercase mb-1 ml-1">Target Account</p>
            <select 
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="w-full bg-black border border-slate-800 p-3 rounded-lg text-xs text-white"
            >
              <option value="">-- TARGET RECIPIENT --</option>
              {users.filter(u => u.role !== 'admin').map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
              ))}
            </select>
          </div>
          
          <div>
             <p className="text-[9px] text-slate-500 uppercase mb-1 ml-1">Distribution Amount (CRD)</p>
             <input id="m-amt" type="number" className="w-full bg-black border border-slate-800 p-3 rounded-lg text-xs font-bold text-blue-400" placeholder="0" />
          </div>

          <button onClick={() => {
            const amt = parseInt(document.getElementById('m-amt').value);
            if(!selectedRecipient || isNaN(amt) || amt <= 0) {
                return alert("FAILURE: INVALID PARAMETERS");
            }
            if(amt > treasury) return alert("TREASURY_LIMIT_EXCEEDED");
            
            setUsers(users.map(u => u.id === selectedRecipient ? {
              ...u, 
              balance: (u.balance || 0) + amt
            } : u));
            setTreasury(prev => prev - amt);
            addTx('TREASURY', selectedRecipient, amt, 'LIQUIDITY', 'SUCCESS');
            
            document.getElementById('m-amt').value = "";
            alert(`MINT SUCCESS: ${amt} CRD -> ${selectedRecipient}`);
          }} className="w-full bg-blue-600 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
            INITIALIZE DISTRIBUTION
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;