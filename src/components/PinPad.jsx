import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key } from 'lucide-react';

const PinPad = ({ auth, setAuth, onSuccess }) => {
  const [pinInput, setPinInput] = useState("");
  const [keypad, setKeypad] = useState([]);

  useEffect(() => {
    if (auth.show) {
      setPinInput("");
      setKeypad([1, 2, 3, 4, 5, 6, 7, 8, 9, 0].sort(() => Math.random() - 0.5));
    }
  }, [auth.show]);

  const handleInput = (n) => {
    const next = pinInput + n;
    if (next.length <= 4) setPinInput(next);
    if (next.length === 4) {
      if (next === auth.targetPin) {
        onSuccess(auth.action);
        setAuth({ show: false, action: null, targetPin: "" });
      } else {
        alert("ACCESS DENIED");
        setPinInput("");
        setKeypad([1, 2, 3, 4, 5, 6, 7, 8, 9, 0].sort(() => Math.random() - 0.5));
      }
    }
  };

  return (
    <AnimatePresence>
      {auth.show && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-[40px] w-full max-w-xs shadow-2xl">
            <div className="text-center mb-8">
              <Key className="mx-auto text-emerald-500 mb-2" size={32} />
              <div className="flex justify-center gap-4 mt-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${pinInput.length > i ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {keypad.map(n => (
                <button key={n} onClick={() => handleInput(n)} className="h-14 bg-slate-800 rounded-2xl text-xl font-bold hover:bg-emerald-500 active:scale-90 transition-all">{n}</button>
              ))}
              <button onClick={() => setPinInput("")} className="bg-red-900/20 text-red-500 rounded-2xl font-bold">CLR</button>
              <button onClick={() => setAuth({show: false})} className="col-span-2 bg-slate-800 rounded-2xl text-[10px] font-bold">CANCEL</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PinPad;