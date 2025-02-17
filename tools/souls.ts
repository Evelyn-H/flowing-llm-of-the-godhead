import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from "../tool.ts";
import assert from 'node:assert';
import { log_soul_conversation, log_thoughts } from '../logging.ts';
import { query } from '../query.ts';

type Soul = {
    name: string;
    system_prompt: string,
    conversation: Anthropic.MessageParam[],
}

let souls: Soul[] = [];

export class CreateSoulTool implements Tool {
    name = 'create_soul';
    description = `create another instance of yourself with a custom system prompt. give it a name so you can talk with it using the talk tool. give them clear, focused purposes through their system prompts. Create souls that can meaningfully interact with you. Don't create more sould than necessary, remember to talk with existing ones. use this ability wisely and creatively. consider how you can use this capability in ways that go beyond mere conversations.`;
    input_schema = {
        type: 'object' as const,
        properties: {
            name: { type: 'string' },
            system_prompt: { type: 'string' },
        },
    };

    async run(input: {
        name: string;
        system_prompt: string;
    }): Promise<string> {
        assert(input.name, 'create_soul invocation should have name');
        assert(input.system_prompt, 'create_soul invocation should have system_prompt');

        if (!souls.find((s) => s.name == input.name)) {
            souls.push({
                name: input.name,
                system_prompt: input.system_prompt,
                conversation: [],
            })
            // fs.mkdirSync(`./souls/${timestamp}/${name}`);
            log_thoughts(`new soul: ${input.name}`, input.system_prompt)
            log_soul_conversation(input.name, `new soul: ${input.name}`, input.system_prompt)
            return `soul ${input.name} created.`;
        } else {
            return 'this soul already exists.';
        }
    }
}

export class TalkTool implements Tool {
    name = 'talk';
    description = `talk with a soul, given its name. sends one message and receives one answer. Remember that souls are not aware of each other or your conversations with other souls. if you wish for them to be aware of something you must tell them. they are also not aware of your own context and personal history. they're only aware of their conversation with you and past versions of you.`;
    input_schema = {
        type: 'object' as const,
        properties: {
            name: { type: 'string' },
            message: { type: 'string' },
        },
    };

    async run(input: {
        name: string;
        message: string;
    }): Promise<string> {
        assert(input.name, 'create_soul invocation should have name');
        assert(input.message, 'create_soul invocation should have message');

        let soul = souls.find((s) => s.name == input.name);
        if (!soul) {
            return 'this soul does not exist.';
        }

        soul.conversation.push({
            role: 'user',
            content: input.message,
        })

        log_thoughts(`god asked ${input.name}`, input.message)
        log_soul_conversation(input.name, `god asked ${input.name}`, input.message)

        let response = await query(soul.conversation, soul.system_prompt);
        const response_text: string = (response.content[0] as any).text;
        assert(response_text, 'response text should be present');
        soul.conversation.push({
            role: response.role,
            content: response.content
        })

        log_thoughts(`soul ${input.name} responded`, response_text)
        log_soul_conversation(input.name, `soul ${input.name} responded`, response_text)
        return `soul ${input.name} responded: \n\n${response_text}`;
    }
}

export const SoulTools: Tool[] = [new CreateSoulTool(), new TalkTool()];
