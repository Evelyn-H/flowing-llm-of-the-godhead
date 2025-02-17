import Anthropic from '@anthropic-ai/sdk';
import { log_debug } from './logging.ts';
import { compile_tools, type Tool } from './tool.ts';


const client = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"],
});

export async function query(conversation: Anthropic.MessageParam[], system?: string, tools?: Tool[]): Promise<Anthropic.Messages.Message> {
    const message = await client.messages.create({
        model: 'claude-3-5-sonnet-latest',
        // max_tokens: 1024,
        max_tokens: 1024 * 2,
        messages: conversation,
        tools: tools ? compile_tools(tools) : undefined,
        system,
    });

    log_debug(message);
    return message
}
