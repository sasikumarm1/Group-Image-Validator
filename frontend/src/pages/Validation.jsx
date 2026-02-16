import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSkus, getImagesBySku, updateImageStatus, exportExcel, exportApprovedExcel, resetSku } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Check, X, RotateCcw, Upload, LogOut, CheckCircle, AlertCircle, Download, RefreshCw, ZoomIn, Image, FileSpreadsheet } from 'lucide-react';

const Validation = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [skus, setSkus] = useState([]);
    const [selectedSku, setSelectedSku] = useState(null);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingImages, setLoadingImages] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [previewImage, setPreviewImage] = useState(null);

    // --- Initial Load ---
    useEffect(() => {
        loadSkus();
    }, [user]);

    const loadSkus = async () => {
        try {
            const data = await getSkus(user);
            const validSkus = Array.isArray(data) ? data : [];
            setSkus(validSkus);
            if (validSkus.length > 0 && !selectedSku) {
                handleSkuSelect(validSkus[0].sku_id);
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to load SKUs", error);
            setLoading(false);
            setSkus([]);
        }
    };

    const handleSkuSelect = async (skuId) => {
        setSelectedSku(skuId);
        setLoadingImages(true);
        try {
            const data = await getImagesBySku(user, skuId);
            setImages(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load images", error);
            setImages([]);
        }
        setLoadingImages(false);
    };

    const handleStatusChange = async (imageName, newStatus) => {
        setImages(prev => prev.map(img =>
            img.image_name === imageName ? { ...img, status: newStatus, display_order: newStatus === 'Approved' ? img.display_order : null } : img
        ));

        try {
            const currentImg = images.find(img => img.image_name === imageName);
            if (currentImg) {
                await updateImageStatus(user, imageName, newStatus, currentImg.display_order, currentImg.notes);
                loadSkus();
            }
        } catch (error) {
            console.error("Update failed", error);
        }
    };

    const handleOrderChange = async (imageName, newOrder) => {
        setImages(prev => prev.map(img =>
            img.image_name === imageName ? { ...img, display_order: newOrder } : img
        ));
        const currentImg = images.find(img => img.image_name === imageName);
        if (currentImg) {
            await updateImageStatus(user, imageName, currentImg.status, newOrder, currentImg.notes);
        }
    };

    const handleNotesChange = async (imageName, newNotes) => {
        setImages(prev => prev.map(img =>
            img.image_name === imageName ? { ...img, notes: newNotes } : img
        ));
        const currentImg = images.find(img => img.image_name === imageName);
        if (currentImg) {
            await updateImageStatus(user, imageName, currentImg.status, currentImg.display_order, newNotes);
        }
    };

    const handleReset = async () => {
        if (!selectedSku) return;

        // Optimistic UI update
        setImages(prev => prev.map(img => ({ ...img, status: 'Pending', display_order: null })));

        try {
            await resetSku(user, selectedSku);
            // Refresh both current view and sidebar counts to ensure sync with server
            await handleSkuSelect(selectedSku);
            await loadSkus();
            // alert("Reset successful"); // Optional: could use a toast
        } catch (error) {
            console.error("Reset failed", error);
            alert("Failed to reset SKU. Please try again.");
            // Re-fetch to restore state from server
            await handleSkuSelect(selectedSku);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // --- Filtering ---
    const filteredSkus = skus.filter(s =>
        s && s.sku_id && String(s.sku_id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Derived state for stats
    const validImages = images.filter(Boolean);
    const stats = {
        approved: validImages.filter(i => i.status === 'Approved').length,
        rejected: validImages.filter(i => i.status === 'Rejected').length,
        pending: validImages.filter(i => i.status !== 'Approved' && i.status !== 'Rejected').length
    };

    // Group images by provider
    const groupedImages = {
        client: validImages.filter(img => !img.image_provided_by || (img.image_provided_by && !img.image_provided_by.toLowerCase().includes('mfr'))),
        mfr: validImages.filter(img => img.image_provided_by && img.image_provided_by.toLowerCase().includes('mfr'))
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800 relative">
            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent z-10">
                {/* NavBar */}
                <header className="bg-white h-16 flex items-center justify-between px-6 shrink-0 border-b border-slate-200 shadow-sm z-30">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <h1 className="font-heading font-bold text-xl text-slate-900 tracking-tight flex items-center gap-2">
                                <span>Group Image Validator</span>
                            </h1>
                        </div>

                        {/* Navigation Links */}
                        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 shadow-inner">
                            <button
                                onClick={() => navigate('/upload')}
                                className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white/50 rounded-lg transition-all flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" /> Upload
                            </button>
                            <button
                                className="px-4 py-1.5 text-sm font-medium text-blue-700 bg-white rounded-lg shadow-sm border border-blue-200 transition-all flex items-center gap-2 relative overflow-hidden group"
                            >
                                <CheckCircle className="w-4 h-4 text-blue-600" /> Validation
                            </button>
                        </nav>

                        <div className="h-8 w-px bg-slate-200 mx-2"></div>

                        <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-3 shadow-sm">
                            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Active SKU</span>
                            <span className="text-blue-600 tracking-wide font-mono font-bold text-base">{selectedSku || "---"}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white transition-all font-medium text-sm flex items-center gap-2 group"
                        >
                            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Logout
                        </button>
                    </div>
                </header>

                {/* Controls Bar */}
                <div className="bg-white border-b border-slate-200 flex items-center justify-between px-6 py-3 shrink-0 z-20 gap-4 shadow-sm">
                    {/* Left: Pagination */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500 font-mono">
                            Record <span className="text-slate-900">{selectedSku ? filteredSkus.findIndex(s => s.sku_id === selectedSku) + 1 : 0}</span> / <span className="text-slate-400">{filteredSkus.length}</span>
                        </span>
                    </div>

                    {/* Center Left: Stats */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 rounded-full border border-green-200 shadow-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 text-sm font-bold tracking-wide">{stats.approved} <span className="hidden xl:inline opacity-70">Approved</span></span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 rounded-full border border-red-200 shadow-sm">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-700 text-sm font-bold tracking-wide">{stats.rejected} <span className="hidden xl:inline opacity-70">Rejected</span></span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 rounded-full border border-amber-200 shadow-sm">
                            <RefreshCw className="w-4 h-4 text-amber-600" />
                            <span className="text-amber-700 text-sm font-bold tracking-wide">{stats.pending} <span className="hidden xl:inline opacity-70">Pending</span></span>
                        </div>
                    </div>

                    {/* Center Right: Search */}
                    <div className="flex items-center gap-2 ml-auto">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Filter SKUs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none w-56 transition-all placeholder-slate-400 shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all font-medium text-sm flex items-center gap-2 shadow-sm"
                        >
                            <RotateCcw className="w-4 h-4" /> Reset
                        </button>
                        <button
                            onClick={() => exportExcel(user)}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 text-sm relative overflow-hidden group"
                        >
                            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span>Export Report</span>
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                        </button>
                        <button
                            onClick={() => exportApprovedExcel(user)}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 text-sm relative overflow-hidden group"
                        >
                            <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span>Approved Images Only</span>
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 pb-24 custom-scrollbar">
                    {loadingImages ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <div className="relative w-16 h-16 mb-6">
                                <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                            </div>
                            <p className="text-slate-600 animate-pulse text-xl font-heading font-medium tracking-wide">Loading Assets...</p>
                        </div>
                    ) : (
                        <div className="max-w-[1700px] mx-auto space-y-10">

                            {/* Side-by-Side Layout Container */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                                {/* Manufacturer Images Section (Left) */}
                                {groupedImages.mfr.length > 0 && (
                                    <div className="space-y-5 lg:col-start-1">
                                        <h2 className="text-base font-bold text-purple-600 uppercase tracking-widest flex items-center gap-3 font-heading pl-1">
                                            <div className="w-8 h-[2px] bg-purple-500/30"></div>
                                            MRF IMAGES: {selectedSku}
                                            <div className="flex-1 h-[1px] bg-slate-200"></div>
                                        </h2>
                                        <div className="grid grid-cols-1 gap-6">
                                            {groupedImages.mfr.map((img, index) => (
                                                <ImageValidationCard
                                                    key={img.image_name}
                                                    img={img}
                                                    index={index} // Start from 0 since it's the left column
                                                    onStatusChange={handleStatusChange}
                                                    onNotesChange={handleNotesChange}
                                                    providedBy="Mfr"
                                                    onOrderChange={handleOrderChange}
                                                    onPreview={(path, name) => setPreviewImage({ path, name, sku: selectedSku })}
                                                    reverse={false} // Details on Left, Image on Right (New Sketch)
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Client Images Section (Right) */}
                                {groupedImages.client.length > 0 && (
                                    <div className="space-y-5 lg:col-start-2">
                                        <h2 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-3 font-heading pl-1">
                                            <div className="w-8 h-[2px] bg-blue-500/30"></div>
                                            CLIENT IMAGES: {selectedSku}
                                            <div className="flex-1 h-[1px] bg-slate-200"></div>
                                        </h2>
                                        <div className="grid grid-cols-1 gap-6">
                                            {groupedImages.client.map((img, index) => (
                                                <ImageValidationCard
                                                    key={img.image_name}
                                                    img={img}
                                                    index={groupedImages.mfr.length + index} // Follow after MRF
                                                    onStatusChange={handleStatusChange}
                                                    onNotesChange={handleNotesChange}
                                                    providedBy="Client"
                                                    onOrderChange={handleOrderChange}
                                                    onPreview={(path, name) => setPreviewImage({ path, name, sku: selectedSku })}
                                                    reverse={true} // Image on Left, Details on Right (New Sketch)
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Empty State */}
                            {Object.values(groupedImages).every(g => g.length === 0) && (
                                <div className="flex flex-col items-center justify-center h-80 text-slate-400 border border-dashed border-slate-300 rounded-3xl bg-white shadow-sm">
                                    <div className="bg-slate-50 p-6 rounded-full mb-4 border border-slate-100">
                                        <Search className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-xl font-heading font-medium text-slate-600">No images localized</p>
                                    <p className="text-sm opacity-60 font-mono mt-1">Select a different SKU or adjust filters</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="bg-white border-t border-slate-200 px-10 py-4 shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-between">
                    <button
                        onClick={() => {
                            const currentIndex = filteredSkus.findIndex(s => s.sku_id === selectedSku);
                            if (currentIndex > 0) handleSkuSelect(filteredSkus[currentIndex - 1].sku_id);
                        }}
                        disabled={!selectedSku || filteredSkus.findIndex(s => s.sku_id === selectedSku) <= 0}
                        className="px-8 py-3 flex items-center gap-3 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-base border border-slate-200 shadow-sm active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5" /> Back
                    </button>

                    <button
                        onClick={() => {
                            const currentIndex = filteredSkus.findIndex(s => s.sku_id === selectedSku);
                            if (currentIndex < filteredSkus.length - 1) handleSkuSelect(filteredSkus[currentIndex + 1].sku_id);
                        }}
                        disabled={!selectedSku || filteredSkus.findIndex(s => s.sku_id === selectedSku) >= filteredSkus.length - 1}
                        className="px-10 py-3 flex items-center gap-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-base shadow-md hover:shadow-lg active:scale-95"
                    >
                        Save & Next <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Image Preview Modal */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPreviewImage(null)}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-5xl w-full max-h-full flex flex-col items-center gap-4 cursor-default"
                        >
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <img
                                src={`http://localhost:8000${previewImage.path}`}
                                alt={previewImage.name}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                            />
                            <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl flex flex-col items-center gap-1 shadow-2xl">
                                <span className="text-slate-900 font-medium text-lg">{previewImage.name}</span>
                                <span className="text-slate-500 text-sm font-mono uppercase tracking-widest">{previewImage.sku}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ImageValidationCard = ({ img, index, onStatusChange, onNotesChange, onOrderChange, providedBy, onPreview, reverse }) => {
    if (!img) return null;

    const metadataRows = [
        { label: "Image Provided By", value: providedBy },
        { label: "Image Name", value: img.image_name },
        { label: "Image Size", value: img.size || '-' },
        { label: "Resolution", value: img.resolution || '-' },
        { label: "DPI", value: img.dpi || '-' },
        { label: "Image Format", value: img.format || '-' },
        { label: "Approved Status", value: img.status || 'Pending', isStatus: true },
        { label: "Display Order", value: img.display_order ?? '', isOrder: true },
        { label: "Notes", value: img.notes || '', isNotes: true }
    ];

    return (
        <div className={`bg-white border border-slate-300 rounded overflow-hidden flex h-[400px] shadow-sm hover:shadow-md transition-shadow ${reverse ? 'flex-row-reverse' : ''}`}>
            {/* Metadata Table */}
            <div className={`w-1/2 flex flex-col ${reverse ? 'border-l' : 'border-r'} border-slate-300`}>
                {metadataRows.map((row, idx) => (
                    <div
                        key={idx}
                        className={`flex border-b border-slate-300 last:border-b-0 h-[44.4px] items-center ${row.isStatus || row.isOrder ? 'bg-slate-100' : ''}`}
                    >
                        <div className="w-2/5 px-3 py-1 font-medium text-slate-700 text-sm border-r border-slate-300 h-full flex items-center">
                            {row.label}
                        </div>
                        <div className="w-3/5 px-3 py-1 text-slate-900 text-sm h-full flex items-center overflow-hidden">
                            {row.isStatus ? (
                                <div className="flex gap-2 w-full pr-1">
                                    <button
                                        onClick={() => onStatusChange(img.image_name, 'Approved')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded transition-all font-bold text-[11px] uppercase tracking-wider
                                            ${row.value === 'Approved'
                                                ? 'bg-emerald-600 text-white shadow-sm scale-105'
                                                : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 active:scale-95'}`}
                                    >
                                        <Check className="w-3.5 h-3.5" /> Approved
                                    </button>
                                    <button
                                        onClick={() => onStatusChange(img.image_name, 'Rejected')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded transition-all font-bold text-[11px] uppercase tracking-wider
                                            ${row.value === 'Rejected'
                                                ? 'bg-rose-600 text-white shadow-sm scale-105'
                                                : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:scale-95'}`}
                                    >
                                        <X className="w-3.5 h-3.5" /> Rejected
                                    </button>
                                </div>
                            ) : row.isOrder ? (
                                <input
                                    type="number"
                                    value={row.value}
                                    onChange={(e) => onOrderChange(img.image_name, e.target.value === '' ? null : parseInt(e.target.value) || 0)}
                                    placeholder="Enter order..."
                                    className="bg-transparent border-none outline-none w-full font-mono placeholder-slate-400"
                                />
                            ) : row.isNotes ? (
                                <input
                                    type="text"
                                    value={row.value}
                                    onChange={(e) => onNotesChange(img.image_name, e.target.value)}
                                    placeholder="Add notes..."
                                    className="bg-transparent border-none outline-none w-full placeholder-slate-400"
                                />
                            ) : (
                                <span className="truncate" title={row.value}>{row.value}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview Area */}
            <div className="w-1/2 bg-white flex flex-col items-center justify-center p-6 gap-4">
                <div
                    onClick={() => img.image_path && onPreview(img.image_path, img.image_name)}
                    className="w-full flex-1 border border-slate-200 rounded flex items-center justify-center relative bg-slate-50 group/preview h-full cursor-zoom-in"
                >
                    {img.image_path ? (
                        <>
                            <img
                                src={`http://localhost:8000${img.image_path}`}
                                alt={img.image_name}
                                className="max-w-full max-h-full object-contain p-2"
                            />
                            <div className="absolute inset-0 bg-white/0 group-hover/preview:bg-black/5 transition-colors pointer-events-none" />
                        </>
                    ) : (
                        <div className="text-slate-300 flex flex-col items-center">
                            <Image className="w-12 h-12 opacity-20" />
                            <span className="text-xs uppercase tracking-tighter opacity-30 mt-2">No Image</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => img.image_path && onPreview(img.image_path, img.image_name)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-slate-200 border border-slate-300 rounded text-slate-700 text-sm font-medium hover:bg-slate-300 transition-colors"
                >
                    <ZoomIn className="w-4 h-4" /> Preview
                </button>
            </div>
        </div>
    );
};

export default Validation;

