import { Request, Response } from 'express';
import { twinsMiddleware } from '../twins';

const defaultRequest = {
    method: 'GET',
    body: {},
    cookies: {},
    query: {},
    get: () => '',
};

async function run(req: object) {
    const set = jest.fn();
    const status = jest.fn();
    const middleware = await twinsMiddleware('./test_twins');
    return new Promise((resolve, reject) => {
        const res = {
            set,
            status,
            send: (reply: unknown) => resolve({ reply, set, status }),
        } as unknown as Response;
        middleware(
            req as unknown as Request,
            res,
            (err) => reject(err || 'empty')
        );
    });
}

it('Finds "can" with story set in get parameter', async () => {
    const { reply, set, status } = await run({
        ...defaultRequest,
        query: {
            api_twin: 'story1:user_exists',
            seriesId: '8',
            mode: '2',
        },
        url: '/api/forms/v1/form',
    }) as any;
    expect(reply).toEqual({
        key1: 'value1',
        key2: 'value2'
    });
    expect(set).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(status).toHaveBeenCalledWith(200);
});

it('Finds "can" with story set in the header', async () => {
    const { reply, set, status } = await run({
        ...defaultRequest,
        query: {
            seriesId: '8',
            mode: '2',
        },
        get: (hdr: string) => hdr === 'x-api-twin'
            ? 'story1:user_exists'
            : '',
        url: '/api/forms/v1/form',
    }) as any;
    expect(reply).toEqual({
        key1: 'value1',
        key2: 'value2'
    });
    expect(set).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(status).toHaveBeenCalledWith(200);
});

it('Finds with story set in the cookie', async () => {
    const { reply, set, status } = await run({
        ...defaultRequest,
        query: {
            seriesId: '8',
            mode: '2',
        },
        cookies: {
            api_twin: 'story1:user_exists',
        },
        url: '/api/forms/v1/form',
    }) as any;
    expect(reply).toEqual({
        key1: 'value1',
        key2: 'value2'
    });
    expect(set).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(status).toHaveBeenCalledWith(200);
});

it('Calls next() if not found', () => {
    return expect(run({
        ...defaultRequest,
        query: {
            seriesId: '8',
            mode: '3',
        },
        cookies: {
            api_twin: 'story1:user_exists',
        },
        url: '/api/forms/v1/form',
    })).rejects.toMatch('empty');
});
