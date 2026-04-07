import React from 'react';
import { ArrowRight } from 'lucide-react';

const Ledger = ({ transactions }) => {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-white/5 flex justify-between items-center text-xs font-bold">
        <span>NETWORK_LEDGER</span>
        <span className="text-[10px] text-slate-500">{transactions.length} RECORDS</span>
      </div>
      <div className="max-h-[600px] overflow-y-auto p-4 space-y-2">
        {transactions.map(tx => (
          <div key={tx.id} className={`flex justify-between items-center p-3 rounded-xl border ${tx.s === 'SUCCESS' ? 'border-emerald-500/10 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5 opacity-60'}`}>
            <div className="text-[10px]">
              <p className="text-slate-600">{tx.time}</p>
              <p className="font-bold">{tx.f} <ArrowRight size={10} className="inline mx-1"/> {tx.t}</p>
            </div>
            <div className="text-right">
              <p className={`font-black ${tx.s === 'SUCCESS' ? 'text-emerald-500' : 'text-red-500'}`}>{tx.a} CRD</p>
              <p className="text-[9px] uppercase">{tx.c}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ledger;