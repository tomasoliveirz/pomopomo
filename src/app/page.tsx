'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo'; // Certifica-te que o caminho está correto

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#FAFAFA]">

      {/* 1. Background Decorativo (Bolhas Suaves Kawaii) */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 max-w-xl w-full text-center space-y-10"
      >
        {/* 2. Hero Section */}
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

        {/* 3. Botões de Ação (A correção principal) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">

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
            className="w-full sm:w-auto px-10 py-4 bg-white text-gray-700 border-2 border-gray-100 rounded-full font-bold text-lg hover:border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <span>🚪 Join Room</span>
          </motion.button>
        </div>

        {/* 4. Footer minimalista */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-12 text-sm text-gray-400 flex flex-col gap-2 items-center"
        >
          <div className="flex gap-4 opacity-70">
            <span className="flex items-center gap-1">🔒 Privacy First</span>
            <span>•</span>
            <span className="flex items-center gap-1">⚡ Real-time</span>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
