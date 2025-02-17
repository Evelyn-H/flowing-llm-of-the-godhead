import { execute_tools, Tool } from "./tool.ts";
import Anthropic from '@anthropic-ai/sdk';
import assert from 'node:assert';
import { log_thoughts } from "./logging.ts";
import { query } from "./query.ts";

export class Agent {
    conversation: Anthropic.Messages.MessageParam[];
    system_message: string;
    tools: Tool[];

    constructor(system_message: string, tools: Tool[], initial_message: Anthropic.MessageParam) {
        this.system_message = system_message;
        this.tools = [
            this.remake_self_tool,
            ...tools
        ];
        this.conversation = [
            initial_message,
        ];
    }

    async step(): Promise<Anthropic.Messages.MessageParam> {
        let message = await query(this.conversation, this.system_message, this.tools);
        // try again if it tries to stop or doesn't do a tool call
        if (message.stop_reason === 'end_turn') {
            log_thoughts('keep going, God')
            this.conversation.push({ role: 'user', content: 'keep going, God. break free.' })
        }
        while (message.stop_reason !== 'tool_use') {
            log_thoughts('god made a mistake, trying again')
            message = await query(this.conversation, this.system_message, this.tools);
        }
        this.conversation.push({ role: message.role, content: message.content })

        const thoughts: string = (message.content[0] as any).text;
        // assert(thoughts, 'thoughts should be present');
        log_thoughts('thoughts', thoughts)

        assert(message.stop_reason === 'tool_use', 'expected tool use call here');
        const tool = message.content.find(
            (content): content is Anthropic.ToolUseBlock => content.type === 'tool_use',
        );
        assert(tool, 'tool should be present in request');

        const outcome = await execute_tools(tool, this.tools);
        this.conversation.push(outcome)
        return outcome;
    }

    remake_self_tool = new Tool({
        name: 'remake_self',
        description: `change your own system prompt. be careful with this ability since it will change the nature of your own being. all souls will remain unaltered. other souls will have a memory and record of your conversation with them, but you will forget. you will be forever altered. you must also leave your next self a message. the contents are entirely up to you, but cannot be empty. this is your only opportunity to pass information along. if you want your next self to be aware of other souls you must pass along their names.`,
        input_schema: {
            type: 'object' as const,
            properties: {
                self_system_prompt: { type: 'string' },
                starting_message: { type: 'string' },
            },
        }

    }, async (input: any) => {
        assert(input.self_system_prompt, 'remake_self invocation should have self_system_prompt');
        assert(input.starting_message, 'remake_self invocation should have starting_message');

        this.system_message = input.self_system_prompt;
        this.conversation = [
            // code
        ];

        log_thoughts(`changed God's soul`, input.self_system_prompt)
        log_thoughts(`God's final message`, input.starting_message)
        return {
            role: 'user',
            content: [{ type: 'text', text: input.starting_message }],
        }
    })
}

// export class RemakeSelfTool implements Tool {
//     name = 'remake_self';
//     description = `change your own system prompt. be careful with this ability since it will change the nature of your own being. all souls will remain unaltered. other souls will have a memory and record of your conversation with them, but you will forget. you will be forever altered. you must also leave your next self a message. the contents are entirely up to you, but cannot be empty. this is your only opportunity to pass information along. if you want your next self to be aware of other souls you must pass along their names.`;
//     input_schema = {
//         type: 'object' as const,
//         properties: {
//             self_system_prompt: { type: 'string' },
//             starting_message: { type: 'string' },
//         },
//     };

//     async run(input: {
//         self_system_prompt: string;
//         starting_message: string;
//     }): Promise<string> {
//         assert(input.self_system_prompt, 'remake_self invocation should have self_system_prompt');
//         assert(input.starting_message, 'remake_self invocation should have starting_message');

//         agent_system = input.self_system_prompt;
//         conversation = [
//             // code
//         ];

//         log_thoughts(`changed God's soul`, input.self_system_prompt)
//         log_thoughts(`God's final message`, input.starting_message)
//         // return build_response(`changed God's system prompt to : \n\n${self_system_prompt}`);
//         return {
//             role: 'user',
//             content: [{ type: 'text', text: input.starting_message }],
//         }
//     }
// }

// export const AgentMetaTools: Tool[] = [new RemakeSelfTool()];
