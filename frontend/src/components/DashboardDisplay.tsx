// Fichier: frontend/src/components/DashboardDisplay.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Toaster, toast } from 'react-hot-toast';

import ExpirationGauge from "./ExpirationGauge";
import AddDomainModal from "./AddDomainModal";
import CertificateDetailModal from "./CertificateDetailModal";

// --- Types et Constantes ---
export interface Certificate {
  domain: string;
  status: 'OK' | 'Expire bientôt' | 'Expiré' | 'Erreur' | 'En attente' | 'Vérification...';
  days_left?: number;
  expiry_date?: string;
  error_message?: string;
}

type SortKey = 'days_left' | 'domain';
type SortDirection = 'asc' | 'desc';

const API_URL = typeof window !== 'undefined' && process.env.NXH_API_URL
  ? process.env.NXH_API_URL
  : (typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.hostname}${window.location.hostname === 'localhost' ? ':8000' : ''}` 
      : "http://localhost:8000");

// --- Sous-Composant : Badge de Statut ---
const StatusBadge = ({ status }: { status: Certificate['status'] }) => {
    const colorClasses = {
        'OK': 'bg-green-500/10 text-green-400 border-green-500/20',
        'Expire bientôt': 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
        'Expiré': 'bg-red-500/10 text-red-400 border-red-500/20',
        'Erreur': 'bg-red-500/10 text-red-400 border-red-500/20',
        'En attente': 'bg-slate-700/50 text-slate-400 border-slate-700',
        'Vérification...': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    return <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${colorClasses[status]}`}>{status}</span>;
};

// --- Sous-Composant : Carte Certificat ---
const CertificateCard = ({ cert, onCardClick, onDeleteClick }: { cert: Certificate, onCardClick: () => void, onDeleteClick: (domain: string) => void }) => {
    
    // Calcul de secours si days_left est absent de l'API
    const daysRemaining = useMemo(() => {
        if (cert.days_left !== undefined) return cert.days_left;
        if (!cert.expiry_date) return 0;
        
        const expiry = new Date(cert.expiry_date).getTime();
        const now = new Date().getTime();
        const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    }, [cert.days_left, cert.expiry_date]);

    const isExpiringSoon = daysRemaining <= 15 && cert.status !== 'Expiré';

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onCardClick} 
            className={`group cursor-pointer bg-[#111827] border rounded-2xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] ${
                isExpiringSoon 
                    ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                    : 'border-slate-800/60 hover:border-blue-500/40'
            }`}
        >
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                    <h2 className="font-black text-xl text-white tracking-tight group-hover:text-blue-400 transition-colors">{cert.domain}</h2>
                    <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">Domaine Sécurisé</p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={cert.status} />
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(cert.domain); }} 
                        className="p-2 rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>

            <div className="h-px bg-gradient-to-r from-slate-800/50 via-slate-700/50 to-transparent mb-6" />

            {(cert.status !== 'Erreur' && cert.status !== 'En attente' && cert.status !== 'Vérification...') ? (
                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Expiration</p>
                            <p className="text-sm font-bold text-slate-200">{cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('fr-FR') : '---'}</p>
                        </div>
                    </div>
                    
                    {/* Affichage de la Jauge */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full" />
                        <ExpirationGauge daysRemaining={daysRemaining} />
                    </div>
                </div>
            ) : (
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3 mt-auto">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {cert.status === 'Vérification...' ? 'Analyse en cours...' : (cert.error_message || cert.status)}
                    </span>
                </div>
            )}
        </motion.div>
    );
};

// --- Composant Principal ---
export default function DashboardDisplay() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('days_left');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const fetchInitialData = useCallback(async () => {
        try {
            const [statusRes, domainsRes] = await Promise.all([
                fetch(`${API_URL}/api/status?t=${Date.now()}`),
                fetch(`${API_URL}/api/domains`)
            ]);
            
            const statuses: Certificate[] = statusRes.ok ? await statusRes.json() : [];
            const { domains }: { domains: string[] } = domainsRes.ok ? await domainsRes.json() : { domains: [] };
            
            const statusMap = new Map(statuses.map(s => [s.domain, s]));
            const merged = domains.map(domain => statusMap.get(domain) || { domain, status: 'En attente' } as Certificate);
            
            setCertificates(merged);
            setError(null);
        } catch (err) {
            setError("Impossible de charger les données. Vérifiez la connexion au backend.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
        const interval = setInterval(fetchInitialData, 60000);
        return () => clearInterval(interval);
    }, [fetchInitialData]);

    const handleDomainsAdded = (newDomains: string[]) => {
        const placeholders: Certificate[] = newDomains.map(d => ({ domain: d, status: 'Vérification...' }));
        setCertificates(prev => [...prev, ...placeholders]);
        fetchInitialData();
    };

    const handleDelete = async (domain: string) => {
        if (!window.confirm(`Supprimer la surveillance pour ${domain} ?`)) return;
        try {
            const res = await fetch(`${API_URL}/api/domains/${domain}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success(`${domain} supprimé`);
                fetchInitialData();
            }
        } catch (err) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const filteredAndSorted = useMemo(() => {
        return certificates
            .filter(c => c.domain.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (sortKey === 'days_left') {
                    const valA = a.days_left ?? 999;
                    const valB = b.days_left ?? 999;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                }
                return sortDirection === 'asc' ? a.domain.localeCompare(b.domain) : b.domain.localeCompare(a.domain);
            });
    }, [certificates, searchTerm, sortKey, sortDirection]);

    return (
        <div className="min-h-screen bg-[#0a0f19] text-slate-200 p-6 md:p-12 font-sans">
            <Toaster position="bottom-right" toastOptions={{ style: { background: '#111827', color: '#fff', border: '1px solid #1e293b' }}} />
            
            <AddDomainModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onDomainsAdded={handleDomainsAdded} />
            <CertificateDetailModal cert={selectedCert} onClose={() => setSelectedCert(null)} />

            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tighter">SSL-Cert-Monitor</h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">Central Control Tower</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-green-900/20"
                    >
                        <span className="text-xl">+</span> Ajouter Domaines
                    </button>
                </header>

                <div className="bg-[#111827]/50 border border-slate-800 p-2 rounded-2xl flex flex-col md:flex-row gap-2 mb-10">
                    <div className="relative flex-grow">
                        <input 
                            type="text" 
                            placeholder="Rechercher un domaine..." 
                            className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 text-sm font-medium placeholder-slate-600"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setSearchTerm(inputValue)}
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-[#0a0f19] rounded-xl p-1 border border-slate-800">
                        <button 
                            onClick={() => setSortKey('days_left')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${sortKey === 'days_left' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Expiration
                        </button>
                        <button 
                            onClick={() => setSortKey('domain')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${sortKey === 'domain' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Nom
                        </button>
                        <button 
                            onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                            className="p-2 text-slate-400 hover:text-white"
                        >
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-slate-900 rounded-2xl animate-pulse" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <AnimatePresence mode="popLayout">
                            {filteredAndSorted.map(cert => (
                                <CertificateCard key={cert.domain} cert={cert} onCardClick={() => setSelectedCert(cert)} onDeleteClick={handleDelete} />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}