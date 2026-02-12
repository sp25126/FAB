import { LLMProvider } from './types';
import { OllamaProvider } from './ollama';
import { RemoteProvider } from './remote';
import dotenv from 'dotenv';
dotenv.config();

export type BrainType = 'local' | 'remote' | 'cloud';

export class LLMFactory {
    static getProvider(overrideType?: string): LLMProvider {
        const type = overrideType || process.env.BRAIN_TYPE || 'local';
        const remoteUrl = (process.env.REMOTE_BRAIN_URL || '').trim();

        console.log(`🧠 LLMFactory: Creating provider for type="${type}"`);

        switch (type) {
            case 'local':
                return new OllamaProvider();
            case 'remote':
                if (!remoteUrl) {
                    throw new Error('⚠️ REMOTE_BRAIN_URL not set. Cannot use remote provider.');
                }
                return new RemoteProvider(remoteUrl);
            case 'cloud':
                throw new Error('⚠️ Cloud provider not implemented.');
            default:
                throw new Error(`⚠️ Unknown brain type "${type}"`);
        }
    }

    /**
     * Get provider with automatic fallback to local Ollama if remote fails,
     * and automatic auto-start for Ollama if it's down.
     */
    static async getProviderWithFallback(overrideType?: string): Promise<LLMProvider> {
        const type = overrideType || process.env.BRAIN_TYPE || 'local';
        console.log(`🧠 LLMFactory: Resolving provider for "${type}" with fallback...`);

        // 1. Try Primary
        const primary = this.getProvider(type);
        if (await this.checkAndWarn(primary)) {
            return primary;
        }

        // 2. If Primary is Local and failed, try to start it
        if (type === 'local') {
            const started = await this.tryStartOllama(primary as OllamaProvider);
            if (started) return primary;
        }

        // 3. Fallback to Local Ollama - REMOVED to respect user choice
        // if (type !== 'local') { ... }

        throw new Error(`❌ Brain Failure: ${type} provider unavailable. Please check your configuration.`);
    }

    private static async checkAndWarn(provider: LLMProvider): Promise<boolean> {
        try {
            // Add timeout to health check to prevent indefinite hang
            const healthPromise = provider.healthCheck();
            const timeoutPromise = new Promise<boolean>((_, reject) =>
                setTimeout(() => reject(new Error('Health check timeout')), 10000)
            );
            const healthy = await Promise.race([healthPromise, timeoutPromise]);
            if (healthy) return true;
        } catch (e: any) {
            console.warn(`⚠️ Health check failed for ${provider.name}: ${e.message}`);
        }
        return false;
    }

    private static async tryStartOllama(provider: OllamaProvider): Promise<boolean> {
        console.log(`🚀 Attempting auto-start for ${provider.name}...`);
        try {
            await provider.startService();
            // Wait for service to warm up
            for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 2000));
                if (await provider.healthCheck()) {
                    console.log(`✅ ${provider.name} started successfully.`);
                    return true;
                }
            }
        } catch (e) {
            console.error(`❌ Failed to start Ollama:`, e);
        }
        return false;
    }

    static setRemoteUrl(url: string) {
        process.env.REMOTE_BRAIN_URL = url;
        console.log(`🔄 LLMFactory: Remote URL updated to ${url}`);
    }
}
