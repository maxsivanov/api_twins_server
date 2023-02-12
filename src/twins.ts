import { promises as fs } from 'fs';
import { join } from 'path';
import { parse } from 'url';
import { Request, Response, NextFunction} from 'express';
import pathToRegexp from 'path-to-regexp';
import pino from 'pino';

const logger = pino();

interface TwinCase {
    story: string;
    file: string;
    storyPath: string | undefined;
}

interface TwinCaseWithData extends TwinCase {
    method: string | undefined;
    url: string;
    urlRegex: RegExp;
    body: unknown;
    query: object;
    status: number | undefined;
    reply: unknown;
    replyHeaders: {[key: string]: string};
}

export async function twinsMiddleware() {
    const defs = await loadTwins(process.env.TWINS_PATH || './api_twins');
    return (req: Request, res: Response, next: NextFunction) => {
        const story = getStory(req);
        const params = {
            url: parse(req.url).pathname || '/',
            method: req.method,
            body: req.body,
            query: req.query,
        };
        const found = findTwin(defs, {
            ...params,
            ...story,
        }) || findTwin(defs, {
            ...params,
            story: '_default',
            storyPath: undefined,
        }) || findTwin(defs, {
            ...params,
            story: '_manual',
            storyPath: undefined,
        });
        if (!found) {
            logger.info({
                ...story,
                ...params,
                msg: 'Not found',
            });
            return next();
        }
        found.sort(compareWeights);
        const top = found[0];
        Object.keys(top.replyHeaders)
            .forEach((key: string) => res.set(key, top.replyHeaders[key]));
        res.status(top.status || 200);
        res.send(top.reply);
    };
}

function compareWeights(a: TwinCaseWithData, b: TwinCaseWithData) {
    const keysA = countKeys(a.query) + countKeys(a.body);
    const keysB = countKeys(b.query) + countKeys(b.body);
    if (keysA > keysB) {
        return -1;
    }
    if (keysA < keysB) {
        return 1;
    }
    return 0;
}

function countKeys(data: unknown): number {
    if (data === null) {
        return 1;
    }
    if (typeof data === 'object' && data instanceof Array) {
        return data.length +
            data.reduce((sum, item) => sum + countKeys(item), 0);
    }
    if (typeof data === 'object') {
        return Object.keys(data).length +
            Object.values(data).reduce((sum, item) => sum + countKeys(item), 0);
    }
    return 1;
}

const storyPathRe = /^\[([^)]+)\]/;

function getStoryPath(name: string) {
    const storyPathMatch = storyPathRe.exec(name);
    if (storyPathMatch) {
        return storyPathMatch[1];
    }
}

function parseContent(content: string) {
    const parsed = JSON.parse(content);
    if (!parsed.method) {
        parsed.method = 'GET';
    }
    if (!parsed.status) {
        parsed.status = 200;
    }
    if (!parsed.reply) {
        parsed.reply = '';
    }
    if (!parsed.query) {
        parsed.query = {};
    }
    if (!parsed.body) {
        parsed.body = {};
    }
    if (!parsed.replyHeaders) {
        parsed.replyHeaders = {};
    }
    parsed.urlRegex = pathToRegexp(parsed.url);
    return parsed;
}

async function loadTwins(dir: string) {
    const all = await fs.readdir(dir, { withFileTypes: true });
    const dirs = all.filter(dirent => dirent.isDirectory());
    const dirsFiles = await Promise.all(dirs.map(curr => {
        return fs.readdir(join(dir, curr.name));
    }));
    const flat = dirs.reduce((sum: TwinCase[], curr, idx) => {
        const story = curr.name;
        return [...sum, ...dirsFiles[idx].map(file => (
            { story, file, storyPath: getStoryPath(file) }
        ))];
    }, []);
    const withFiles = await Promise.all(flat.map(async cur => {
        const content = await fs.readFile(join(dir, cur.story, cur.file), 'utf8');
        logger.info({ story: cur.story, loaded: cur.file });
        try {
            return { ...cur, ...parseContent(content) };
        } catch (err: unknown) {
            logger.error({
                error: (err as Error).message,
                story: cur.story,
                file: cur.file,
            });
            process.exit(-1);
        }
    }));
    return withFiles as TwinCaseWithData[];
}

interface TwinSearch {
    method: Request['method'];
    url: Request['url'];
    body: Request['body'];
    query: Request['query'];
    story: string | undefined;
    storyPath: string | undefined;
}

function findTwin(list: TwinCaseWithData[], search: TwinSearch) {
    const found = list.filter(item => {
        return (
            item.urlRegex.exec(search.url) &&
            search.method === item.method &&
            search.story === item.story &&
            search.storyPath === item.storyPath &&
            match(search.body, item.body) &&
            match(search.query, item.query)
        );
    });
    return found.length ? found : false;
}

const TwinsCookieOrQuery = 'api_twin';
const TwinsHeader = 'x-api-twin';

function getStory(req: Request) {
    const cookie = req.cookies[TwinsCookieOrQuery];
    const query = req.query[TwinsCookieOrQuery];
    const header = req.get(TwinsHeader);
    const twin = header || query || cookie;
    if (!twin) {
        return {
            story: undefined,
            storyPath: undefined,
            uuid: undefined,
        };
    }
    const [story, storyPath, uuid] = twin.split(':');
    return {
        story,
        storyPath,
        uuid,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function match(check: any, sample: any): boolean {
    if (typeof check !== typeof sample) {
        return false;
    }
    if (typeof sample === 'object' && sample) {
        return !Object.keys(sample).some(key => {
            return !match(check[key], sample[key]);
        });
    }
    return check === sample;
}
