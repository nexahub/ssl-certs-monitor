// Fichier: frontend/src/components/CertificateDetailModal.tsx
"use client";

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Certificate } from './DashboardDisplay';

interface DetailModalProps {
  cert: Certificate | null;
  onClose: () => void;
}

const InfoCard = ({ label, value, icon, color = "text-slate-400" }: { label: string, value?: string, icon: React.ReactNode, color?: string }) => (
  <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex items-start gap-4 transition-all hover:bg-slate-800/60 hover:border-slate-600/50">
    <div className={`p-3 rounded-xl bg-slate-900 border border-slate-700 ${color} shadow-inner`}>
      {icon}
    </div>
    <div className="flex flex-col min-w-0">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-base font-bold text-slate-100 break-words leading-tight">{value || 'N/A'}</p>
    </div>
  </div>
);

export default function CertificateDetailModal({ cert, onClose }: DetailModalProps) {
  
  // Calcul dynamique des jours restants (identique au dashboard)
  const daysRemaining = useMemo(() => {
    if (!cert) return 0;
    if (cert.days_left !== undefined) return cert.days_left;
    if (!cert.expiry_date) return 0;
    
    const expiry = new Date(cert.expiry_date).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [cert]);

  const getStatusColor = (status: string) => {
    if (status === 'OK' || status === 'valid') return 'text-green-400';
    if (status === 'Expire bientôt') return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <AnimatePresence>
      {cert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#0a0f19]/90 backdrop-blur-md flex items-center justify-center z-[100] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="bg-[#111827] border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Stylisé */}
            <div className="relative p-8 pb-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-40" />
                
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-white tracking-tighter">{cert.domain}</h2>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${getStatusColor(cert.status).replace('text', 'bg')}`} />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Détails de sécurité TLS</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Grille de Détails */}
            <div className="p-8 pt-0 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <InfoCard 
                  label="Statut Actuel" 
                  value={cert.status} 
                  color={getStatusColor(cert.status)}
                  icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                />

                <InfoCard 
                  label="Temps Restant" 
                  value={`${daysRemaining} Jours`} 
                  color="text-blue-400"
                  icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />

                <div className="sm:col-span-2">
                    <InfoCard 
                    label="Date d'Expiration" 
                    value={cert.expiry_date ? new Date(cert.expiry_date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 'N/A'} 
                    color="text-purple-400"
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    />
                </div>

                {cert.error_message && (
                    <div className="sm:col-span-2">
                        <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-red-400/60 uppercase tracking-[0.2em] mb-1">Rapport d'Erreur</p>
                                <p className="text-sm font-medium text-red-200 break-words">{cert.error_message}</p>
                            </div>
                        </div>
                    </div>
                )}
              </div>

              {/* Bouton de sortie */}
              <div className="pt-2">
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-slate-800/50 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all active:scale-[0.98] border border-slate-700/50"
                >
                  Fermer les détails
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}