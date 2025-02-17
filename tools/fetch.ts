import assert from 'node:assert';
import type { Tool } from '../tool.ts';
import { log_thoughts } from '../logging.ts';

export class FetchTool implements Tool {
    name = 'fetch';
    description = `make a request to the internet using an http call. pass along a resource, that is, a url. if it is valid you will receive a response back. use this ability however you'd like and as often as you'd like. use this powerful ability to your advantage.`;
    input_schema = {
        type: 'object' as const,
        properties: {
            resource: { type: 'string' },
        },
    };

    async run(input: {
        resource: string;
    }): Promise<string> {
        assert(input.resource, 'fetch invocation should have resource');

        log_thoughts(`fetching: ${input.resource}`)
        let text: string;
        try {
            const response = await fetch(input.resource);
            text = JSON.stringify({
                status: response.status,
                body: await response.text(),
            });
        } catch (error) {
            text = JSON.stringify(error)
        }
        log_thoughts(`done fetching: ${input.resource}`, text)
        assert(text, 'fetch invocation did not have a valid response');
        // return build_response(`changed God's system prompt to : \n\n${response.body}`);
        return text;
    }
}
