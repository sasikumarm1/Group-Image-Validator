import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { processLocalPath, exportLocalPathExcel, downloadTemplate } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowRight, X, Download, HardDrive, Upload as UploadIcon } from 'lucide-react';

const LocalPathUpload = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [path, setPath] = useState('');
    const [excelFile, setExcelFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [message, setMessage] = useState('');
    const [processedCount, setProcessedCount] = useState(0);

    const excelInputRef = useRef(null);

    const handleExcelChange = (e) => {
        if (e.target.files[0]) setExcelFile(e.target.files[0]);
    };

    const handleProcess = async () => {
        if (!path.trim() && !excelFile) {
            setStatus('error');
            setMessage("Please enter a directory path or upload an Excel file with absolute paths.");
            return;
        }

        try {
            setStatus('processing');
            const data = await processLocalPath(user, path, excelFile);
            setProcessedCount(data.count || (data.results ? data.results.length : 0));
            setStatus('success');
            setMessage(data.message || "Local path processed successfully!");
        } catch (e) {
            console.error(e);
            setStatus('error');
            setMessage(e.response?.data?.detail || "Processing failed. Please check the path.");
        }
    };

    const handleExport = () => {
        exportLocalPathExcel(user);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center p-6 relative overflow-hidden text-slate-800">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative z-10"
            >
                {/* Header */}
                <div className="relative p-10 pb-6 border-b border-slate-100 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <span className="bg-emerald-50 text-emerald-600 p-2 rounded-xl border border-emerald-100 shadow-sm">
                                    <HardDrive className="w-6 h-6" />
                                </span>
                                Image Validator
                            </h1>
                            <p className="text-slate-500 mt-2">Scan an instance directory for images and export Excel</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => downloadTemplate('ftp')}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl transition-all text-sm font-semibold shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Template
                            </button>
                            <button onClick={() => navigate('/upload')} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    {/* Path Selection */}
                    <section>
                        <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-3 font-heading mb-4">
                            <span className="flex items-center justify-center w-6 h-6 rounded bg-emerald-50 border border-emerald-100 text-xs text-emerald-700">01</span>
                            Server Directory Path (Optional to check the path)
                        </h3>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <FolderOpen className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                placeholder="e.g. /root/Group-Image-Validator/image/'(IMAGE NAME)'"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-700 font-mono shadow-inner"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5 ml-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Ensure the path is accessible by the server process.
                        </p>
                    </section>

                    {/* Optional Excel Upload */}
                    <section>
                        <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-3 font-heading mb-4">
                            <span className="flex items-center justify-center w-6 h-6 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">02</span>
                            Excel Upload
                        </h3>
                        <div
                            onClick={() => excelInputRef.current?.click()}
                            className={`group relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300
                                ${excelFile
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
                        >
                            <input type="file" ref={excelInputRef} onChange={handleExcelChange} accept=".xlsx, .xls, .csv" className="hidden" />

                            <div className="flex items-center justify-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${excelFile ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-medium transition-colors ${excelFile ? 'text-blue-700' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                        {excelFile ? excelFile.name : "Upload Excel"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">Match images in path by 'Image Path and Name' column</p>
                                </div>
                                {excelFile && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setExcelFile(null); }}
                                        className="ml-auto p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Status Display */}
                    <AnimatePresence>
                        {status === 'error' && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium shadow-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {message}
                            </motion.div>
                        )}

                        {status === 'success' && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center gap-3 text-sm font-medium shadow-sm">
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold">{message}</p>
                                    <p className="text-emerald-500 opacity-80 text-xs mt-0.5">Found {processedCount} records. You can now export the Excel report.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Actions */}
                    <div className="flex flex-col gap-4 pt-4">
                        {status !== 'success' ? (
                            <button
                                onClick={handleProcess}
                                disabled={status === 'processing'}
                                className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all flex items-center justify-center gap-3 relative overflow-hidden group
                                    ${status === 'processing' ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] hover:shadow-emerald-500/20'}
                                `}
                            >
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                                <span className="relative z-20 flex items-center gap-2">
                                    {status === 'processing' ? <><Loader2 className="animate-spin" /> Scanning & Merging...</> : <><FolderOpen className="w-5 h-5" /> Start Extraction <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                                </span>
                            </button>
                        ) : (
                            <div className="flex gap-4">
                                <button
                                    onClick={handleExport}
                                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-3 group"
                                >
                                    <FileSpreadsheet className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    Export Excel
                                </button>
                                <button
                                    onClick={() => navigate('/validate')}
                                    className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3"
                                >
                                    Go to Validation
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/upload')}
                            className="w-full py-2 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
                        >
                            Cancel and go back
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LocalPathUpload;
