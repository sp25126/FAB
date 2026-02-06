const pdfUtil = require('pdf-to-text');
import mammoth from 'mammoth';
import fs from 'fs/promises';

export class ResumeExtractor {

    async extractFromPDF(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            pdfUtil.pdfToText(filePath, (err: any, data: string) => {
                if (err) {
                    reject(new Error(`PDF extraction failed: ${err.message || err}`));
                } else {
                    resolve(data);
                }
            });
        });
    }

    async extractFromDOCX(filePath: string): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } catch (error: any) {
            throw new Error(`DOCX extraction failed: ${error.message}`);
        }
    }

    async extractFromTXT(filePath: string): Promise<string> {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error: any) {
            throw new Error(`TXT extraction failed: ${error.message}`);
        }
    }

    async extractText(filePath: string, mimeType: string): Promise<string> {
        if (mimeType === 'application/pdf') {
            return this.extractFromPDF(filePath);
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword'
        ) {
            return this.extractFromDOCX(filePath);
        } else if (mimeType === 'text/plain') {
            return this.extractFromTXT(filePath);
        } else {
            throw new Error(`Unsupported file type: ${mimeType}`);
        }
    }

    async cleanup(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.error(`Failed to cleanup file: ${filePath}`);
        }
    }
}
