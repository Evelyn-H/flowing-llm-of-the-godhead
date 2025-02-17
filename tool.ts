
import Anthropic from '@anthropic-ai/sdk';
import assert from 'node:assert';

export class Tool {
    name: string;
    description: string;
    input_schema: Anthropic.Messages.Tool.InputSchema;
    run: (input: any) => Promise<string | Anthropic.Messages.MessageParam>;

    constructor(config: {
        name: string;
        description: string;
        input_schema: Anthropic.Messages.Tool.InputSchema;
    },
        run: (input: any) => Promise<string | Anthropic.Messages.MessageParam>
    ) {
        this.name = config.name;
        this.description = config.description;
        this.input_schema = config.input_schema;
        this.run = run;
    }
}

export async function execute_tools(tool_call: Anthropic.Messages.ToolUseBlock, tool_impls: Tool[]): Promise<Anthropic.Messages.MessageParam> {
    const impl = tool_impls.find(impl => impl.name === tool_call.name);
    if (!impl) {
        throw Error('unkown tool type')
    }

    const build_response = (text: string): Anthropic.Messages.MessageParam => {
        return {
            role: 'user',
            content: [
                {
                    type: 'tool_result',
                    tool_use_id: tool_call.id,
                    content: [{ type: 'text', text: text }],
                },
            ],
        }
    }

    try {
        const result = await impl.run(tool_call.input);
        return (typeof result === 'string') ? build_response(result) : result;
    } catch (error) {
        return build_response(`tool error: ${error}`);
    }
}

export function compile_tools(tools: Tool[]): Anthropic.Messages.Tool[] {
    return tools.map(tool => {
        return {
            name: tool.name,
            description: tool.description,
            input_schema: tool.input_schema,
        }
    })
}
