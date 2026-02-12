import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Settings, LogOut, Code } from "lucide-react"

interface ProfileDialogProps {
    isOpen: boolean
    onClose: () => void
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-obsidian-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="relative h-32 bg-gradient-to-br from-primary/20 to-teal-900/40">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                                <X size={20} />
                            </button>
                            <div className="absolute -bottom-10 left-6">
                                <div className="w-20 h-20 rounded-full border-4 border-obsidian-900 bg-obsidian-800 flex items-center justify-center overflow-hidden">
                                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAg2JytFH4jJ7ioeFCkOQzYQT-dClNWCOWQeeUNMc3H1QWYrl1-FLdWuWXnVaEiepIZ1IyJW0toFElrCY0JW9xQz1dbCT11ZS_WIlRAOy6HUMS9DbRnHDIGZtv-Pvo8Ns4FcndYHvlwJugMr39BDFZv29OryI6fM18xu_p3NLYKshx9pqrPlskSF6IwGnxOYQIzi6Y-k4k3_nregQ4dnDRYykR3u_LftmqdsDmYGA7ygrhbsV_uuCfz1vLUqjtfDPxmTUA7FWNhpA" alt="Profile" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="pt-12 pb-6 px-6">
                            <h2 className="text-xl font-bold text-white font-display">Senior Engineer</h2>
                            <p className="text-sm text-white/50 mb-6">saumya.dev @ fab-system</p>

                            <div className="space-y-2">
                                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left group">
                                    <div className="p-2 bg-primary/10 rounded-md text-primary group-hover:bg-primary/20 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">Profile Settings</div>
                                        <div className="text-xs text-white/40">Update personal details</div>
                                    </div>
                                </button>
                                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left group">
                                    <div className="p-2 bg-purple-500/10 rounded-md text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                                        <Code size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">Dev Mode Config</div>
                                        <div className="text-xs text-white/40">Manage API keys & webhooks</div>
                                    </div>
                                </button>
                                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left group">
                                    <div className="p-2 bg-amber-500/10 rounded-md text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                                        <Settings size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">System Preferences</div>
                                        <div className="text-xs text-white/40">Theme & notifications</div>
                                    </div>
                                </button>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5">
                                <button className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors w-full justify-center">
                                    <LogOut size={16} />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default ProfileDialog
