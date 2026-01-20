import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { logger } from '../utils/logger';

export interface WebArticle {
    title: string;
    content: string;
    textContent: string;
    excerpt: string;
    byline: string;
    siteName: string;
    originalUrl: string;
    isRaw?: boolean;
}

const PROXIES = [
    {
        name: 'Jina Reader',
        type: 'markdown',
        url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(`https://r.jina.ai/${target}`)}`,
        extract: async (res: Response) => {
            const text = await res.text();
            if (text.includes('Jina AI - Report Issue') || text.length < 50) return '';
            return text;
        }
    },
    {
        name: 'CodeTabs',
        type: 'html',
        url: (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
        extract: async (res: Response) => await res.text()
    },
    {
        name: 'CORS Proxy IO',
        type: 'html',
        url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
        extract: async (res: Response) => await res.text()
    },
    {
        name: 'AllOrigins',
        type: 'html',
        url: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
        extract: async (res: Response) => {
            const data = await res.json();
            return data.contents;
        }
    },
    {
        name: 'ThingProxy',
        type: 'html',
        url: (target: string) => `https://thingproxy.freeboard.io/fetch/${target}`,
        extract: async (res: Response) => await res.text()
    }
];

export const fetchAndParseArticle = async (url: string): Promise<WebArticle> => {
    logger.info('WebExtractor', `Fetching article from: ${url}`);

    const cleanUrl = url.trim();
    let lastError;
    let bestRawContent = '';

    for (const proxy of PROXIES) {
        try {
            logger.info('WebExtractor', `Trying proxy: ${proxy.name}`);
            const response = await fetch(proxy.url(cleanUrl));

            if (!response.ok) {
                // If 403, keep trying other proxies
                throw new Error(`Status ${response.status}`);
            }

            const rawData = await proxy.extract(response);

            if (!rawData || rawData.length < 100) {
                throw new Error('Fetched content too short');
            }

            if (rawData.length > bestRawContent.length) {
                bestRawContent = rawData;
            }

            // --- JINA (Markdown) ---
            if (proxy.type === 'markdown') {
                const lines = rawData.split('\n');
                let startIdx = 0;
                let title = '';

                for (let i = 0; i < Math.min(lines.length, 20); i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('Title:')) title = line.replace('Title:', '').trim();
                    if (line === '' || line.startsWith('#')) { startIdx = i; break; }
                }

                const cleanText = lines.slice(startIdx).join('\n').trim();
                logger.success('WebExtractor', `Success via ${proxy.name} (Markdown Mode)`);

                return {
                    title: title || 'Web Article',
                    content: cleanText,
                    textContent: cleanText,
                    excerpt: '',
                    byline: 'Jina AI',
                    siteName: new URL(cleanUrl).hostname,
                    originalUrl: cleanUrl
                };
            }

            // --- STANDARD (HTML) ---
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawData, 'text/html');
            const base = doc.createElement('base');
            base.href = cleanUrl;
            doc.head.appendChild(base);

            const reader = new Readability(doc);
            const article = reader.parse();

            if (article && article.content.length > 200) {
                // Convert HTML to Markdown
                const turndownService = new TurndownService({
                    headingStyle: 'atx',
                    codeBlockStyle: 'fenced'
                });
                const markdownContent = turndownService.turndown(article.content);

                logger.success('WebExtractor', `Success via ${proxy.name}: ${article.title}`);
                return {
                    title: article.title || 'Untitled Article',
                    content: markdownContent,
                    textContent: article.textContent,
                    excerpt: article.excerpt || '',
                    byline: article.byline || '',
                    siteName: article.siteName || new URL(cleanUrl).hostname,
                    originalUrl: cleanUrl
                };
            } else {
                logger.warn('WebExtractor', `Readability failed for ${proxy.name}, but saved raw content.`);
            }

        } catch (e: any) {
            logger.warn('WebExtractor', `Proxy ${proxy.name} failed: ${e.message}`);
            lastError = e;
        }
    }

    // --- FALLBACK: RETURN RAW CONTENT FOR AI ---
    if (bestRawContent.length > 500) {
        logger.warn('WebExtractor', 'All parsers failed. Returning RAW content for AI Cleaning.');
        return {
            title: 'Raw Extraction',
            content: bestRawContent,
            textContent: bestRawContent,
            excerpt: 'Needs AI Cleaning',
            byline: '',
            siteName: new URL(cleanUrl).hostname,
            originalUrl: cleanUrl,
            isRaw: true
        };
    }

    throw new Error(`All proxies failed. Last error: ${lastError?.message || 'Unknown'}`);
};
