import React from 'react';
// Prompt said "Drag/drop upload". I'll use simple HTML5 drag/drop if I don't want to add dependency, 
// OR I can assume standard libraries. I will use standard input for now to avoid package issues, 
// or simple custom dnd.

import { UploadCloud, FileText, X } from 'lucide-react';

interface UploadDropzoneProps {
    onFileSelect: (file: File) => void;
    selectedFile: File | null;
    onClear: () => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onFileSelect, selectedFile, onClear }) => {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                onFileSelect(file);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    if (selectedFile) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-neon-teal/10 rounded text-neon-teal">
                        <FileText size={20} />
                    </div>
                    <div className="text-sm">
                        <p className="font-medium text-white">{selectedFile.name}</p>
                        <p className="text-white/40">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
                <button onClick={onClear} className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>
        );
    }

    return (
        <label
            className="border-2 border-dashed border-white/10 hover:border-neon-teal/50 hover:bg-white/5 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <input type="file" className="hidden" accept=".pdf" onChange={handleChange} />
            <div className="p-4 bg-white/5 rounded-full mb-2">
                <UploadCloud className="text-white/40" size={32} />
            </div>
            <div>
                <p className="font-bold text-lg">Click to upload or drag PDF</p>
                <p className="text-sm text-white/40">Only .pdf supported (Max 10MB)</p>
            </div>
        </label>
    );
};
