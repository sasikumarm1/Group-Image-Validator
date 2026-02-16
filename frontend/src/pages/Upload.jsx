import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadExcel, uploadImages } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload as UploadIcon, FileSpreadsheet, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, ArrowRight, X } from 'lucide-react';

const Upload = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [excelFile, setExcelFile] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [status, setStatus] = useState('idle'); // idle, uploading_excel, uploading_images, success, error
    const [message, setMessage] = useState('');

    const excelInputRef = useRef(null);
    const imagesInputRef = useRef(null);

    const handleExcelChange = (e) => {
        if (e.target.files[0]) setExcelFile(e.target.files[0]);
    };

    const handleImagesChange = (e) => {
        if (e.target.files) setImageFiles(Array.from(e.target.files));
    };

    const startUpload = async () => {
        if (!excelFile) {
            setStatus('error');
            setMessage("Please select an Excel file first.");
            return;
        }

        try {
            setStatus('uploading_excel');
            await uploadExcel(user, excelFile);

            if (imageFiles.length > 0) {
                setStatus('uploading_images');
                await uploadImages(user, imageFiles);
            }

            setStatus('success');
            setMessage("Upload Complete! Initializing Validation...");
            setTimeout(() => navigate('/validate'), 1500);

        } catch (e) {
            console.error(e);
            setStatus('error');
            setMessage(e.response?.data?.detail || "Upload failed. Please check your files.");
        }
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
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <span className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100 shadow-sm">
                                    <UploadIcon className="w-6 h-6" />
                                </span>
                                New Project
                            </h1>
                        </div>
                        <button onClick={() => navigate('/validate')} className="text-slate-500 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    {/* Step 1: Excel */}
                    <section>
                        <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-3 font-heading mb-4">
                            <span className="flex items-center justify-center w-6 h-6 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">01</span>
                            Data Source
                        </h3>
                        <div
                            onClick={() => excelInputRef.current?.click()}
                            className={`group relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
                                ${excelFile
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
                        >
                            <input type="file" ref={excelInputRef} onChange={handleExcelChange} accept=".xlsx, .xls, .csv" className="hidden" />

                            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${excelFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                <FileSpreadsheet className="w-8 h-8" />
                            </div>

                            <p className={`font-medium text-lg transition-colors ${excelFile ? 'text-green-700' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                {excelFile ? excelFile.name : "Upload Metadata File"}
                            </p>
                            <p className="text-sm text-slate-400 mt-2 font-mono">Supported: .xlsx, .csv</p>
                        </div>
                    </section>

                    {/* Step 2: Images */}
                    <section>
                        <h3 className="text-sm font-bold text-purple-600 uppercase tracking-widest flex items-center gap-3 font-heading mb-4">
                            <span className="flex items-center justify-center w-6 h-6 rounded bg-purple-50 border border-purple-100 text-xs text-purple-700">02</span>
                            Assets
                        </h3>
                        <div
                            onClick={() => imagesInputRef.current?.click()}
                            className={`group relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
                                ${imageFiles.length > 0
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-slate-200 hover:border-purple-400 hover:bg-slate-50'}`}
                        >
                            <input type="file" ref={imagesInputRef} onChange={handleImagesChange} accept="image/*" multiple className="hidden" />

                            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${imageFiles.length > 0 ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600'}`}>
                                <ImageIcon className="w-8 h-8" />
                            </div>

                            <p className={`font-medium text-lg transition-colors ${imageFiles.length > 0 ? 'text-purple-700' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                {imageFiles.length > 0 ? `${imageFiles.length} files selected` : "Upload Images"}
                            </p>
                            <p className="text-sm text-slate-400 mt-2 font-mono">JPG, PNG, TIFF (Select Multiple)</p>
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="flex flex-col gap-4 pt-4">
                        <AnimatePresence>
                            {status === 'error' && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium shadow-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {message}
                                </motion.div>
                            )}

                            {status === 'success' && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-50 border border-green-100 text-green-600 rounded-xl flex items-center gap-3 text-sm font-medium shadow-sm">
                                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                    {message}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={startUpload}
                            disabled={status.startsWith('uploading')}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all flex items-center justify-center gap-3 relative overflow-hidden group
                                ${status === 'success' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}
                                ${status.startsWith('uploading') ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01] hover:shadow-blue-500/20'}
                            `}
                        >
                            {/* Animated Background Shimmer */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />

                            <span className="relative z-20 flex items-center gap-2">
                                {status === 'uploading_excel' && <><Loader2 className="animate-spin" /> Processing Metadata...</>}
                                {status === 'uploading_images' && <><Loader2 className="animate-spin" /> Uploading Assets...</>}
                                {status === 'idle' && <><UploadIcon className="w-5 h-5" /> Start Processing <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                                {status === 'success' && <><CheckCircle className="w-6 h-6" /> Success!</>}
                                {status === 'error' && "Retry Upload"}
                            </span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Upload;
