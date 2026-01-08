'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import BackgroundPhysics from '@/components/BackgroundPhysics';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden pointer-events-none">

      {/* 1. Physics Background */}
      <BackgroundPhysics />

      {/* 2. Static Decor (Optional, can keep or remove if physics is enough) */}
      {/* Kept subtle for extra depth */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-200/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 max-w-xl w-full text-center space-y-10 pointer-events-auto"
      >
        {/* Card Container for Contrast */}
        <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-8 sm:p-12 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] border border-white/40">

          {/* 3. Hero Section */}
          <div className="flex flex-col items-center gap-6">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="cursor-default"
            >
              {/* Logo Grande */}
              <Logo size="large" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
                Your cozy corner to focus.
              </h1>
              <p className="text-gray-500 text-lg font-medium">
                Study solo or vibe with friends. No login required.
              </p>
            </div>
          </div>

          {/* 4. Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full mt-8">

            {/* Botão CREATE (Destaque) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/create')}
              className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white rounded-full font-bold text-lg shadow-lg shadow-gray-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              <span>✨ Create Room</span>
            </motion.button>

            {/* Botão JOIN (Secundário) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/join')}
              className="w-full sm:w-auto px-10 py-4 bg-white/50 text-gray-700 border-2 border-gray-100 rounded-full font-bold text-lg hover:border-gray-200 hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              <span>🚪 Join Room</span>
            </motion.button>
          </motion.button>
        </div>

        <div className="mt-8">
          <button
            onClick={() => router.push('/report')}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            <span>🐛 Report a bug</span>
          </button>
        </div>
    </div>



      </motion.div >
    </div >
  );
}
