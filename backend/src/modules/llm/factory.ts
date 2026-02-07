import { LLMProvider } from './types';
import { OllamaProvider } from './ollama';
import { RemoteProvider } from './remote';
import { MockProvider } from './mock';
import dotenv from 'dotenv';
dotenv.config();

export type BrainType = 'local' | 'remote' | 'cloud' | 'mock';

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
                    console.warn('⚠️ REMOTE_BRAIN_URL not set, falling back to mock');
                    return new MockProvider();
                }
                return new RemoteProvider(remoteUrl);
            case 'cloud':
                // TODO: Implement Cloud Provider (OpenAI/Gemini)
                console.warn('⚠️ Cloud provider not implemented, using mock');
                return new MockProvider();
            case 'mock':
                return new MockProvider();
            default:
                console.warn(`⚠️ Unknown brain type "${type}", using mock`);
                return new MockProvider();
        }
    }

    /**
     * Get provider with automatic fallback to mock if primary fails health check
     */
    static async getProviderWithFallback(overrideType?: string): Promise<LLMProvider> {
        const type = overrideType || process.env.BRAIN_TYPE || 'local';

        // Try primary provider first
        const primary = this.getProvider(type);

        try {
            const isHealthy = await primary.healthCheck();
            if (isHealthy) {
                console.log(`✅ ${primary.name} is available`);
                return primary;
            }
        } catch (e) {
            console.warn(`⚠️ ${primary.name} health check failed`);
        }

        // Fallback to mock
        console.warn(`⚠️ Primary provider unavailable, falling back to mock`);
        return new MockProvider();
    }
}
