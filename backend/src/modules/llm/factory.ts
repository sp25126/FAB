import { LLMProvider } from './types';
import { OllamaProvider } from './ollama';
import { RemoteProvider } from './remote';
import dotenv from 'dotenv';
dotenv.config();

export type BrainType = 'local' | 'remote' | 'cloud';

export class LLMFactory {
    static getProvider(overrideType?: string): LLMProvider {
        const type = overrideType || process.env.BRAIN_TYPE || 'local';
        const remoteUrl = process.env.REMOTE_BRAIN_URL || '';

        console.log(`🧠 LLMFactory: Creating provider for type="${type}"`);

        switch (type) {
            case 'local':
                return new OllamaProvider();
            case 'remote':
                if (!remoteUrl) {
                    console.warn('⚠️ REMOTE_BRAIN_URL not set, falling back to local');
                    return new OllamaProvider();
                }
                return new RemoteProvider(remoteUrl);
            case 'cloud':
                // TODO: Implement Cloud Provider (OpenAI/Gemini)
                return new OllamaProvider(); // Fallback for now
            default:
                return new OllamaProvider();
        }
    }
}
