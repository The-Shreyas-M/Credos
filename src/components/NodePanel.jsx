import React, { useState } from 'react';
import { Wallet, ShieldCheck, HeartHandshake, TrendingUp, Clock } from 'lucide-react';

const NodePanel = ({ user, users = [], requests = [], setRequests, loans, setLoans, setAuth, addTx, repayLoan, approveGuarantorRequest }) => {
  const [activeTab, setActiveTab] = useState("WALLET"); // WALLET, BORROW, LEND
  const [loanAmt, setLoanAmt] = useState("");
  const [loanDesc, setLoanDesc] = useState("");
  const [contributeState, setContributeState] = useState({ id: null, amt: "" });
  const [repayState, setRepayState] = useState({ id: null, amt: "" });
  const [guarantorPick, setGuarantorPick] = useState({ loanId: null, guarantorId: "" });
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const balance = user.balance || 0;

  const repayScore = Number.isFinite(Number(user.repayScore)) ? Number(user.repayScore) : 500;
  const getBorrowTier = (s) => {
    if (s >= 750) return { name: 'PLATINUM', limit: 5000 };
    if (s >= 650) return { name: 'GOLD', limit: 2500 };
    if (s >= 550) return { name: 'SILVER', limit: 1500 };
    return { name: 'BRONZE', limit: 800 };
  };
  const tier = getBorrowTier(repayScore);

  const getLoanTotalDue = (l) => (l.amount || 0) + ((l.amount || 0) * ((l.interest || 0) / 100));

  const createLoanRequest = () => {
    const amt = parseInt(loanAmt);
    if (isNaN(amt) || amt <= 0) return alert("ENTER VALID AMOUNT");
    if (!loanDesc) return alert("ENTER DESCRIPTION");

    if (amt > tier.limit) {
      return alert(`LOAN LIMIT EXCEEDED. TIER: ${tier.name} | MAX: ${tier.limit} CRD`);
    }

    const newLoan = {
        id: `LOAN-${Date.now()}`,
        borrowerId: user.id,
        borrowerName: user.name,
        amount: amt,
        interest: 5,
        description: loanDesc,
        status: 'PENDING',
        fundedAmount: 0,
      repaidAmount: 0,
      repaymentCount: 0,
      guarantorId: null,
      guarantorStatus: 'NONE',
        contributions: [], 
        timestamp: new Date().toLocaleString()
    };

    setLoans([newLoan, ...loans]);
    setLoanAmt("");
    setLoanDesc("");
    alert("LOAN REQUEST CREATED!");
  };

  const handleLend = (loanId) => {
    const amt = parseInt(contributeState.amt);
    if (isNaN(amt) || amt <= 0) return alert("ENTER VALID AMOUNT");
    if (balance < amt) return alert("INSUFFICIENT FUNDS");

    const loan = loans.find(l => l.id === loanId);
    if (loan.borrowerId === user.id) return alert("CANNOT LEND TO YOURSELF");

    const remaining = (loan.amount || 0) - (loan.fundedAmount || 0);
    if (remaining <= 0) return alert('POOL ALREADY FULL');
    if (amt > remaining) return alert(`MAX CONTRIBUTION: ${remaining} CRD`);

    setAuth({ 
      show: true, 
      targetPin: user.pin, 
      action: { 
          type: 'PAY', 
          mid: 'SYSTEM_POOL', 
          amt, 
          cat: 'GENERAL',
          loanId: loanId,
          callback: () => setContributeState({ id: null, amt: "" })
      } 
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. TOP NAV */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 sticky top-0 z-10 backdrop-blur-md">
        {["WALLET", "BORROW", "LEND"].map(tab => (
            <button 
                key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeTab === tab ? 'bg-emerald-600 text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
                {tab}
            </button>
        ))}
      </div>

      {activeTab === "WALLET" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] text-emerald-500 font-bold tracking-[0.2em] mb-1 uppercase text-left">Liquid_Assets</p>
                <h2 className="text-2xl font-black text-white">{user.name}</h2>
                <p className="text-[9px] text-slate-500 font-mono mt-1">NODE: {user.id}</p>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20"><Wallet className="text-emerald-500" size={20}/></div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-end">
               <div>
                  <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Available Balance</p>
                  <p className="text-4xl font-black text-white tracking-tighter">{balance.toLocaleString()} <span className="text-sm text-emerald-500 ml-1">CRD</span></p>
                  <p className="text-[9px] text-slate-500 mt-2">
                    Repay Score: <span className="text-white font-black">{Math.round(repayScore)}</span> · Tier: <span className="text-emerald-400 font-black">{tier.name}</span> · Limit: <span className="text-white font-black">{tier.limit} CRD</span>
                  </p>
               </div>
               <ShieldCheck className="text-emerald-500/20 mb-1" size={40} />
            </div>
          </div>

          <div className="bg-slate-900 border border-white/5 p-5 rounded-3xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">WITHDRAW_TO_REAL_WORLD</p>
            <div className="space-y-3">
              <input
                type="number"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                className="w-full bg-black border border-slate-800 p-3 rounded-xl text-xs text-white outline-none focus:border-red-500"
                placeholder="Amount to withdraw (burn)"
              />
              <button
                onClick={() => {
                  const amt = Number(withdrawAmt);
                  if (!Number.isFinite(amt) || amt <= 0) return alert('ENTER VALID AMOUNT');
                  if ((user.balance || 0) < amt) return alert('INSUFFICIENT FUNDS');
                  setAuth({
                    show: true,
                    targetPin: user.pin,
                    action: {
                      type: 'WITHDRAW',
                      fromId: user.id,
                      amt,
                      callback: () => setWithdrawAmt('')
                    }
                  });
                }}
                className="w-full bg-red-600 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all"
              >
                WITHDRAW & BURN
              </button>
              <p className="text-[9px] text-slate-500">This permanently burns tokens (non-recoverable).</p>
            </div>
          </div>

          {requests.filter(r => r && r.type === 'GUARANTOR' && r.to === user.id).length > 0 && (
            <div className="bg-slate-900 border border-white/5 p-5 rounded-3xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">GUARANTOR_INBOX</p>
              <div className="space-y-3">
                {requests
                  .filter(r => r && r.type === 'GUARANTOR' && r.to === user.id)
                  .map(r => (
                    <div key={r.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-white">REQUEST FROM {r.fromId}</p>
                          <p className="text-[9px] text-slate-500">Loan: {r.loanId}</p>
                        </div>
                        <span className="text-[9px] font-black text-emerald-400">{Number(r.requiredAmount || 0).toFixed(2)} CRD</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => approveGuarantorRequest && approveGuarantorRequest(r.id)}
                          className="flex-1 bg-emerald-600/20 text-emerald-500 border border-emerald-600/30 font-black py-2 rounded-lg text-[9px] uppercase hover:bg-emerald-600 hover:text-black transition-all"
                        >
                          APPROVE
                        </button>
                        <button
                          onClick={() => setRequests && setRequests(prev => prev.filter(x => x.id !== r.id))}
                          className="flex-1 bg-red-600/10 text-red-500 border border-red-600/20 font-black py-2 rounded-lg text-[9px] uppercase hover:bg-red-600 hover:text-white transition-all"
                        >
                          DECLINE
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "BORROW" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-slate-900 p-6 rounded-3xl border border-blue-500/20">
            <h3 className="text-blue-400 font-bold mb-5 text-xs flex items-center gap-2"><TrendingUp size={14}/> CREATE_BORROW_POOL</h3>
            <div className="space-y-4">
              <input type="number" value={loanAmt} onChange={e => setLoanAmt(e.target.value)} className="w-full bg-black border border-slate-800 p-4 rounded-xl text-xs text-white outline-none focus:border-blue-500" placeholder="REQUEST AMOUNT (CRD)" />
              <textarea value={loanDesc} onChange={e => setLoanDesc(e.target.value)} className="w-full bg-black border border-slate-800 p-4 rounded-xl text-xs text-white outline-none focus:border-blue-500 h-24" placeholder="REASON FOR CREDIT / REPAYMENT PLAN" />
              <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 flex justify-between items-center">
                 <span className="text-[10px] text-slate-400 font-bold uppercase transition-all">Interest Rate</span>
                 <span className="text-[12px] text-blue-400 font-black">5.00%</span>
              </div>
              <button onClick={createLoanRequest} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40">INITIALIZE POOL</button>
            </div>
          </div>

          <div className="space-y-3">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">ACTIVE_LOAN_STATUS</p>
             {loans.filter(l => l.borrowerId === user.id).map(l => (
                <div key={l.id} className="bg-slate-900 border border-white/5 p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between">
                        <span className="text-[10px] font-black text-white">{l.amount} CRD</span>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${l.status === 'FUNDED' ? 'bg-emerald-500/20 text-emerald-500' : l.status === 'SETTLED' ? 'bg-blue-500/20 text-blue-500' : l.status === 'AWAIT_GUARANTOR' ? 'bg-purple-500/20 text-purple-400' : l.status === 'REPAYING' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-yellow-500/20 text-yellow-500'}`}>{l.status}</span>
                    </div>
                    <div className="w-full bg-black h-1.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full transition-all" style={{ width: `${(l.fundedAmount / l.amount) * 100}%` }}></div></div>
                    <p className="text-[9px] text-slate-500 italic">Progress: {l.fundedAmount} / {l.amount} CRD</p>

                    {l.status === 'AWAIT_GUARANTOR' && (() => {
                      const totalDue = getLoanTotalDue(l);
                      const lenderIds = new Set((l.contributions || []).map(c => c && c.lenderId).filter(Boolean));
                      const eligible = users
                        .filter(u => u && u.id !== user.id)
                        .filter(u => u.role === 'other')
                        .filter(u => !lenderIds.has(u.id))
                        .filter(u => (u.balance || 0) >= totalDue);

                      const existingReq = requests.find(r => r && r.type === 'GUARANTOR' && r.loanId === l.id && r.fromId === user.id);

                      return (
                        <div className="pt-3 border-t border-white/5 space-y-2">
                          <p className="text-[9px] text-slate-400">Guarantor required before disbursal.</p>
                          <div className="bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Required Coverage</span>
                            <span className="text-[10px] text-purple-300 font-black">{totalDue.toFixed(2)} CRD</span>
                          </div>

                          {existingReq ? (
                            <div className="text-[9px] text-slate-500 font-bold uppercase">REQUEST_SENT_TO: <span className="text-white">{existingReq.to}</span></div>
                          ) : eligible.length === 0 ? (
                            <div className="text-[9px] text-red-400 font-bold uppercase">NO_GUARANTOR_AVAILABLE</div>
                          ) : (
                            <div className="space-y-2">
                              <select
                                value={guarantorPick.loanId === l.id ? guarantorPick.guarantorId : ""}
                                onChange={(e) => setGuarantorPick({ loanId: l.id, guarantorId: e.target.value })}
                                className="w-full bg-black border border-purple-500/20 p-3 rounded-xl text-xs text-white"
                              >
                                <option value="">-- SELECT GUARANTOR --</option>
                                {eligible.map(u => (
                                  <option key={u.id} value={u.id}>{u.name} ({u.id}) · {u.balance} CRD</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  const gid = guarantorPick.loanId === l.id ? guarantorPick.guarantorId : "";
                                  if (!gid) return alert('SELECT GUARANTOR');
                                  if (!setRequests) return;
                                  setRequests(prev => [...prev, {
                                    id: Date.now(),
                                    type: 'GUARANTOR',
                                    loanId: l.id,
                                    fromId: user.id,
                                    to: gid,
                                    requiredAmount: totalDue,
                                    timestamp: new Date().toLocaleString()
                                  }]);
                                  if (addTx) addTx(user.id, gid, 0, 'GUARANTOR_REQUEST', 'SUCCESS');
                                  alert('GUARANTOR REQUEST SENT');
                                }}
                                className="w-full bg-purple-600 text-white font-black py-2 rounded-xl text-[9px] uppercase"
                              >
                                SEND GUARANTOR REQUEST
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {(l.status === 'FUNDED' || l.status === 'REPAYING') && (() => {
                      const totalDue = l.amount + (l.amount * (l.interest / 100));
                      const repaid = typeof l.repaidAmount === 'number' ? l.repaidAmount : 0;
                      const remaining = Math.max(0, totalDue - repaid);

                      return (
                        <div className="pt-2 border-t border-white/5 space-y-3">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-500 font-bold uppercase">Due</span>
                            <span className="text-white font-black">{remaining.toFixed(2)} / {totalDue.toFixed(2)} CRD</span>
                          </div>

                          {repayState.id === l.id ? (
                            <div className="flex gap-2">
                              <input
                                type="number"
                                className="flex-1 bg-black border border-yellow-500/30 p-3 rounded-xl text-xs text-white outline-none focus:border-yellow-500"
                                placeholder={`Max ${remaining.toFixed(2)}`}
                                value={repayState.amt}
                                onChange={(e) => setRepayState({ ...repayState, amt: e.target.value })}
                                autoFocus
                              />
                              <button
                                onClick={() => repayLoan(l.id, repayState.amt)}
                                className="bg-yellow-600 px-4 rounded-xl text-[10px] font-black text-black"
                              >
                                PAY
                              </button>
                              <button
                                onClick={() => setRepayState({ id: null, amt: "" })}
                                className="bg-slate-800 px-4 rounded-xl text-[10px] font-black text-slate-400"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRepayState({ id: l.id, amt: "" })}
                              className="w-full bg-yellow-600 text-black font-black py-2 rounded-xl text-[9px] uppercase"
                            >
                              PAY INSTALLMENT
                            </button>
                          )}
                        </div>
                      );
                    })()}
                </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === "LEND" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-slate-900 p-6 rounded-3xl border border-emerald-500/20 overflow-hidden">
             <h3 className="text-emerald-400 font-bold mb-5 text-xs flex items-center gap-2"><HeartHandshake size={14}/> GLOBAL_LENDING_POOLS</h3>
             <div className="space-y-4">
                {loans.filter(l => l.status === 'PENDING').length === 0 ? (<p className="text-[10px] text-slate-500 text-center py-8">NO_ACTIVE_POOLS_WAITING_FOR_FUNDING</p>) : (
                    loans.filter(l => l.status === 'PENDING').map(l => (
                        <div key={l.id} className="bg-black/50 border border-white/5 p-5 rounded-2xl space-y-4">
                            <div className="flex justify-between items-start">
                                <div><p className="text-xs font-black text-white uppercase">{l.borrowerName}</p><p className="text-[9px] text-emerald-500 font-bold">🎯 {l.amount} CRD · 📈 5% Yield</p></div>
                                <span className="bg-emerald-500/10 text-emerald-500 text-[8px] px-2 py-1 rounded-full font-bold">ACTIVE</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">{l.description}</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[8px] font-bold uppercase text-slate-500">
                                    <span>Funding Progress</span>
                                    <span>{Math.floor((l.fundedAmount / l.amount) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(l.fundedAmount / l.amount) * 100}%` }}></div>
                                </div>
                            </div>
                            
                            <div className="pt-2 border-t border-white/5 space-y-3">
                                {contributeState.id === l.id ? (
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" 
                                            className="flex-1 bg-black border border-emerald-500/30 p-3 rounded-xl text-xs text-white outline-none focus:border-emerald-500" 
                                            placeholder="Amt..." 
                                            value={contributeState.amt}
                                            onChange={(e) => setContributeState({ ...contributeState, amt: e.target.value })}
                                            autoFocus
                                        />
                                        <button 
                                            onClick={() => handleLend(l.id)} 
                                            className="bg-emerald-600 px-4 rounded-xl text-[10px] font-black text-black"
                                        >
                                            CONFIRM
                                        </button>
                                        <button 
                                            onClick={() => setContributeState({ id: null, amt: "" })} 
                                            className="bg-slate-800 px-4 rounded-xl text-[10px] font-black text-slate-400"
                                        >
                                            X
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setContributeState({ id: l.id, amt: "" })} 
                                        className="w-full bg-emerald-600/10 text-emerald-500 border border-emerald-600/20 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-black transition-all"
                                    >
                                        INITIALIZE LEND
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
             </div>
          </div>
          <div className="space-y-3">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Clock size={12}/> My Portfolio</p>
             {loans.filter(l => l.contributions.some(c => c.lenderId === user.id)).map(l => {
                const myCont = l.contributions.filter(c => c.lenderId === user.id).reduce((s, c) => s + c.amount, 0);
                return (
                    <div key={l.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center">
                        <div><p className="text-[10px] font-bold text-slate-300 uppercase">{l.borrowerName}'s Pool</p><p className="text-[9px] text-slate-500 mt-0.5">My Share: <span className="text-white font-bold">{myCont} CRD</span></p></div>
                        <div className="text-right"><p className="text-[10px] font-black text-emerald-400">+{Math.floor(myCont * 0.05)} CRD</p><p className="text-[8px] text-slate-500 uppercase font-bold text-right">Returns</p></div>
                    </div>
                );
             })}
          </div>
        </div>
      )}
    </div>
  );
};
export default NodePanel;