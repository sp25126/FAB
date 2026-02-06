
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

export interface ScrapedQuestion {
    question: string;
    source: string;
    topic: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    url?: string;
    techStack?: string[];
    language?: string;
}

export class QuestionScraper {
    private cacheFile: string;
    private cache: Map<string, ScrapedQuestion[]> = new Map();

    constructor() {
        this.cacheFile = path.resolve(process.cwd(), 'data/questions_cache.json');
        this.loadCache();
    }

    private loadCache() {
        if (fs.existsSync(this.cacheFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
                for (const [key, val] of Object.entries(data)) {
                    this.cache.set(key, val as ScrapedQuestion[]);
                }
            } catch (e) {
                console.warn('Failed to load question cache', e);
            }
        }
    }

    private saveCache() {
        const obj: Record<string, ScrapedQuestion[]> = {};
        for (const [key, val] of this.cache.entries()) {
            obj[key] = val;
        }
        try {
            const dir = path.dirname(this.cacheFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.cacheFile, JSON.stringify(obj, null, 2));
        } catch (e) {
            console.warn('Failed to save cache', e);
        }
    }

    async scrapeQuestions(topic: string): Promise<ScrapedQuestion[]> {
        const normalizedTopic = topic.toLowerCase();

        if (this.cache.has(normalizedTopic)) {
            console.log(`[Scraper] Returning cached questions for ${topic}`);
            return this.cache.get(normalizedTopic)!;
        }

        console.log(`[Scraper] Scraping questions for ${topic}...`);

        // Race between multiple sources with independent isolation
        const results = await Promise.allSettled([
            this.scrapeGeeksForGeeks(topic).catch(e => { console.error(`[Scraper] GFG Failed: ${e.message}`); return []; }),
            this.scrapeJavatpoint(topic).catch(e => { console.error(`[Scraper] Javatpoint Failed: ${e.message}`); return []; }),
            this.scrapeGenericSources(topic).catch(e => { console.error(`[Scraper] Generic Sources Failed: ${e.message}`); return []; }),
            this.scrapeViaSearch(topic).catch(e => { console.error(`[Scraper] SearchDiscovery Failed: ${e.message}`); return []; })
        ]);

        const allQuestions: ScrapedQuestion[] = [];
        results.forEach(res => {
            if (res.status === 'fulfilled') {
                allQuestions.push(...res.value);
            }
        });

        if (allQuestions.length > 0) {
            this.cache.set(normalizedTopic, allQuestions);
            this.saveCache();
        }

        return allQuestions;
    }

    private async scrapeGenericSources(topic: string): Promise<ScrapedQuestion[]> {
        // Only using stable, bot-friendly sites that don't trigger connection resets
        const sources = [
            { name: 'Sanfoundry', url: `https://www.sanfoundry.com/${topic.toLowerCase().replace(/\s+/g, '-')}-interview-questions-answers/` },
            { name: 'Programiz', url: `https://www.programiz.com/javascript/interview-questions` },
            { name: 'Simplilearn', url: `https://www.simplilearn.com/tutorials/${topic.toLowerCase().replace(/\s+/g, '-')}-tutorial/interview-questions` }
        ];

        const all: ScrapedQuestion[] = [];
        for (const source of sources) {
            try {
                const html = await this.robustFetch(source.url, topic, 0);
                if (html) {
                    const questions = this.parseGenericPage(html, topic, source.url, source.name);
                    all.push(...questions);
                }
            } catch (e) {
                console.warn(`[Scraper] Source ${source.name} skipped: Connection issue.`);
            }
        }
        return all;
    }

    private async scrapeViaSearch(topic: string): Promise<ScrapedQuestion[]> {
        // Simple DuckDuckGo HTML search for more variety
        // This targets the "no-js" version of DDG
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(topic + ' interview questions')}`;
        const html = await this.robustFetch(searchUrl, topic, 0);
        if (!html) return [];

        const $ = cheerio.load(html);
        const links: string[] = [];
        $('.result__url').each((_, el) => {
            const url = $(el).text().trim();
            if (url.includes('interview') || url.includes('question')) {
                links.push(url.startsWith('http') ? url : `https://${url}`);
            }
        });

        const all: ScrapedQuestion[] = [];
        // Try top 3 discovered links
        for (const url of links.slice(0, 3)) {
            const pageHtml = await this.robustFetch(url, topic, 0);
            if (pageHtml) {
                all.push(...this.parseGenericPage(pageHtml, topic, url, 'SearchDiscovery'));
            }
        }
        return all;
    }

    private parseGenericPage(html: string, topic: string, url: string, source: string): ScrapedQuestion[] {
        const $ = cheerio.load(html);
        const questions: ScrapedQuestion[] = [];

        // Broad selectors for questions
        $('h1, h2, h3, h4, strong, .question, .qa-question, b, li').each((_, el) => {
            const text = $(el).text().trim().replace(/^\d+[\.\)]\s*/, '');
            // More aggressive filtering for technical questions
            if ((text.includes('?') || text.startsWith('What') || text.startsWith('Explain') || text.startsWith('How'))
                && text.length > 20 && text.length < 250) {

                if (!questions.some(q => q.question === text)) {
                    questions.push({
                        question: text,
                        source: source,
                        topic: topic,
                        url: url,
                        techStack: [topic],
                        language: topic.match(/(javascript|python|java|typescript|cpp|c#|rust|go)/i)?.[0] || undefined
                    });
                }
            }
        });

        return questions.slice(0, 15);
    }

    private async robustFetch(url: string, topic: string, retries: number = 2): Promise<string | null> {
        for (let i = 0; i <= retries; i++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);

                const res = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeout);

                if (res.ok) return await res.text();
                if (res.status === 404) return null;
                throw new Error(`Status ${res.status}`);
            } catch (e: any) {
                if (i < retries) {
                    const delay = (i + 1) * 2000 + Math.random() * 1000;
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        return null;
    }

    private async scrapeGeeksForGeeks(topic: string): Promise<ScrapedQuestion[]> {
        const url = `https://www.geeksforgeeks.org/${topic.replace(/\s+/g, '-').toLowerCase()}-interview-questions/`;
        const html = await this.robustFetch(url, topic);
        if (!html) return this.scrapeGeeksForGeeksAlternative(topic);
        return this.parseGenericPage(html, topic, url, 'GeeksForGeeks');
    }

    private async scrapeGeeksForGeeksAlternative(topic: string): Promise<ScrapedQuestion[]> {
        const variations = [
            `https://www.geeksforgeeks.org/top-50-${topic.toLowerCase().replace(/\s+/g, '-')}-interview-questions/`,
            `https://www.geeksforgeeks.org/common-${topic.toLowerCase().replace(/\s+/g, '-')}-interview-questions/`
        ];

        for (const url of variations) {
            const html = await this.robustFetch(url, topic, 1);
            if (html) return this.parseGenericPage(html, topic, url, 'GeeksForGeeks');
        }
        return [];
    }

    private async scrapeJavatpoint(topic: string): Promise<ScrapedQuestion[]> {
        const url = `https://www.javatpoint.com/${topic.replace(/\s+/g, '-').toLowerCase()}-interview-questions`;
        const html = await this.robustFetch(url, topic, 1);
        if (!html) return [];

        return this.parseGenericPage(html, topic, url, 'Javatpoint');
    }


    // Terminal.io scraping would go here - placeholder for now as it requires specific structure knowledge
}
