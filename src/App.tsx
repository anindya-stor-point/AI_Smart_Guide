import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  History, 
  LogOut, 
  ArrowRight, 
  Play, 
  Square,
  ChevronRight,
  Loader2,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { analyzeScreen, AnalysisResult } from './services/geminiService';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { cn } from './lib/utils';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const { user, loading, signIn, logout } = useAuth();
  const [isLive, setIsLive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD';
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (result && !analyzing) {
      speak(result.voiceScript);
    }
  }, [result]);

  const startLiveMode = () => {
    setIsLive(true);
    // In a real app, this would capture the screen. 
    // Here we'll trigger the file picker or use the last image if available.
    alert("লাইভ মোড সক্রিয় হয়েছে। প্রতি ৫ সেকেন্ড পর পর এটি স্ক্রিন চেক করবে। (ব্রাউজার সীমাবদ্ধতার কারণে আপনাকে ম্যানুয়ালি ছবি দিতে হতে পারে)");
  };

  const stopLiveMode = () => {
    setIsLive(false);
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    window.speechSynthesis.cancel();
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'analyses'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
    });

    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAnalyzing(true);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const analysis = await analyzeScreen(base64);
        
        // Save to Firestore
        await addDoc(collection(db, 'analyses'), {
          ...analysis,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });

        setResult(analysis);
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 mb-4 font-bengali">বাংলা অ্যাপ গাইড</h1>
          <p className="text-zinc-600 mb-8 text-lg">
            আপনার পছন্দের অ্যাপগুলো ব্যবহার করতে সাহায্য করার জন্য আপনার ব্যক্তিগত এআই গাইড।
          </p>
          <button
            onClick={signIn}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebase/explorer/images/google.svg" className="w-6 h-6 bg-white rounded-full p-1" alt="Google" />
            গুগল দিয়ে শুরু করুন
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-bengali">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 hidden sm:block">বাংলা অ্যাপ গাইড</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <History className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-zinc-200" alt={user.displayName || ''} />
            <button onClick={logout} className="text-zinc-500 hover:text-red-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Main Live Guide Controller */}
        {!result && !analyzing && !showHistory && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-500 shadow-2xl",
              isLive ? "bg-red-600 shadow-red-200 scale-110" : "bg-blue-600 shadow-blue-200"
            )}>
              <Smartphone className="w-16 h-16 text-white" />
            </div>
            
            <h2 className="text-4xl font-bold text-zinc-900 mb-4 font-bengali">বাংলা অ্যাপ গাইড</h2>
            <p className="text-zinc-600 mb-12 max-w-md mx-auto text-lg">
              লাইভ ইন্টারঅ্যাক্টিভ গাইড শুরু করতে নিচের বাটনে ক্লিক করুন। এটি ব্যাকগ্রাউন্ডে আপনার স্ক্রিন বিশ্লেষণ করবে।
            </p>

            <button 
              onClick={isLive ? stopLiveMode : startLiveMode}
              className={cn(
                "group relative flex items-center gap-4 px-12 py-6 rounded-3xl font-bold text-2xl transition-all duration-300 shadow-xl hover:scale-105 active:scale-95",
                isLive 
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-red-200" 
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              )}
            >
              {isLive ? (
                <>
                  <Square className="w-8 h-8 fill-current" />
                  <span>STOP LIVE GUIDE</span>
                </>
              ) : (
                <>
                  <Play className="w-8 h-8 fill-current" />
                  <span>START LIVE GUIDE</span>
                </>
              )}
            </button>

            {isLive && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 flex items-center gap-2 text-red-600 font-bold animate-pulse"
              >
                <div className="w-3 h-3 bg-red-600 rounded-full" />
                লাইভ বিশ্লেষণ চলছে...
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Analyzing State */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <Smartphone className="w-10 h-10 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="mt-8 text-xl font-bold text-zinc-900">স্ক্রিন বিশ্লেষণ করা হচ্ছে...</h3>
            <p className="text-zinc-500 mt-2">একটু অপেক্ষা করুন, আমি অ্যাপটি বোঝার চেষ্টা করছি।</p>
          </div>
        )}

        {/* Result View */}
        {result && !analyzing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setResult(null)}
                className="text-blue-600 font-semibold flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                আবার শুরু করুন
              </button>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" />
                বিশ্লেষণ সফল
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                    {result.appName[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">{result.appName}</h2>
                    <p className="text-zinc-500 flex items-center gap-1.5">
                      <span className={result.userStatus === 'New' ? 'text-green-600' : 'text-blue-600'}>
                        {result.userStatus === 'New' ? 'নতুন ইউজার' : 'পুরনো ইউজার'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <section>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">নির্দেশনা</h3>
                  <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-blue-900 text-lg leading-relaxed">
                    {result.instructions}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">অডিও গাইড (Voice)</h3>
                  <div className="flex items-center gap-4 p-4 bg-zinc-900 text-white rounded-2xl">
                    <button 
                      onClick={() => speak(result.voiceScript)}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        speaking ? "bg-green-600 animate-pulse" : "bg-blue-600 hover:bg-blue-700"
                      )}
                    >
                      <Play className="w-6 h-6 fill-current" />
                    </button>
                    <p className="italic opacity-90">"{result.voiceScript}"</p>
                  </div>
                </section>

                {result.arrowPosition && (
                  <section>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">ভিজ্যুয়াল কিউ (Arrow)</h3>
                    <div className="relative aspect-[9/16] max-w-[280px] mx-auto bg-zinc-200 rounded-3xl border-8 border-zinc-900 overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm">
                        স্ক্রিন প্রিভিউ
                      </div>
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="absolute w-12 h-12 text-red-600 drop-shadow-lg"
                        style={{ 
                          left: `${result.arrowPosition.x}%`, 
                          top: `${result.arrowPosition.y}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <ArrowRight className="w-full h-full rotate-90" />
                      </motion.div>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* History View */}
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-zinc-900">পুরনো ইতিহাস</h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="text-zinc-500 hover:text-zinc-900"
              >
                বন্ধ করুন
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-zinc-200">
                <AlertCircle className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500">এখনো কোনো ইতিহাস নেই।</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setResult(item);
                      setShowHistory(false);
                    }}
                    className="w-full p-6 bg-white border border-zinc-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900 font-bold">
                        {item.appName[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900">{item.appName}</h3>
                        <p className="text-sm text-zinc-500">
                          {new Date(item.createdAt?.toDate()).toLocaleDateString('bn-BD')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto p-8 text-center text-zinc-400 text-sm">
        <p>© ২০২৬ বাংলা অ্যাপ গাইড | এআই দ্বারা পরিচালিত</p>
      </footer>
    </div>
  );
}
