export interface LLMProvider {
    name: string;
    generate(prompt: string, options?: any): Promise<string>;
    generateJSON<T>(prompt: string, schema?: any): Promise<T>;
    healthCheck(): Promise<boolean>;
    evaluateAnswer(question: string, answer: string, expectedPoints?: string[], context?: string): Promise<any>;
}
