export interface LLMProvider {
    name: string;
    generate(prompt: string, options?: any): Promise<string>;
    generateJSON<T>(prompt: string, schema?: any): Promise<T>;
    healthCheck(): Promise<boolean>;
}
