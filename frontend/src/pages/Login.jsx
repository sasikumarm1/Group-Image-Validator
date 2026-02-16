import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Zap } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (!email.includes('@')) {
                setError("Please enter a valid email address");
                setLoading(false);
                return;
            }
            // Simulate a brief delay for effect
            await new Promise(resolve => setTimeout(resolve, 800));
            await login(email);
            navigate('/upload');
        } catch (err) {
            setError("Login failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans text-slate-800">

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md p-1"
            >
                <div className="relative bg-white p-8 rounded-2xl border border-slate-200 shadow-2xl">
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-sm group"
                        >
                            <Lock className="w-8 h-8 text-blue-600 group-hover:text-blue-500 transition-colors" />
                        </motion.div>
                        <motion.h1
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-bold text-slate-900 tracking-tight font-heading"
                        >
                            System Access
                        </motion.h1>
                        <motion.p
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-slate-500 mt-2 text-sm"
                        >
                            Authenticate to continue to Image Validator
                        </motion.p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Identity</label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all"
                                    placeholder="Enter your access ID (email)..."
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </motion.div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4 fill-current" />
                                {error}
                            </motion.div>
                        )}

                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full relative overflow-hidden bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Initialize Session</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                            {/* Shine Effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                        </motion.button>
                    </form>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-8 pt-6 border-t border-slate-100 text-center"
                    >
                        <p className="text-xs text-slate-400 font-mono">
                            SECURE CONNECTION • ANTIGRAVITY PROTOCOL v2.1
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
