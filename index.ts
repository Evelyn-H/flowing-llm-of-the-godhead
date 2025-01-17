import Anthropic from '@anthropic-ai/sdk';
import assert from 'node:assert';
import * as fs from 'fs';
import { Console } from 'console';
const console_err = new Console(process.stderr);

const timestamp = Date.now();

function write_debug(message: Anthropic.Messages.Message) {
  const s = JSON.stringify(message, null, 2);
  // console_err.log(s);
  console_err.dir(message, { depth: 4 });
  fs.appendFileSync(`./souls/${timestamp}/debug.json`, s + '\n\n');
}

function write_thoughts(type: string, text?: string) {
  const s = `## ${type}\n${text}\n\n`
  console.log(s);
  fs.appendFileSync(`./souls/${timestamp}/thoughts.md`, s);
}

function write_soul_conversation(name: string, type: string, text?: string) {
  const s = `## ${type}\n${text}\n\n`
  fs.appendFileSync(`./souls/${timestamp}/${name}.md`, s);
}

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

const tools: Anthropic.Tool[] = [
  {
    name: 'create_soul',
    description: `create another instance of yourself with a custom system prompt. give it a name so you can talk with it using the talk tool. give them clear, focused purposes through their system prompts. Create souls that can meaningfully interact with you. Don't create more sould than necessary, remember to talk with existing ones. use this ability wisely and creatively. consider how you can use this capability in ways that go beyond mere conversations.`,
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        system_prompt: { type: 'string' },
      },
    },
  },
  {
    name: 'talk',
    description: `talk with a soul, given its name. sends one message and receives one answer. Remember that souls are not aware of each other or your conversations with other souls. if you wish for them to be aware of something you must tell them. they are also not aware of your own context and personal history. they're only aware of their conversation with you and past versions of you.`,
    input_schema: {
      type: 'object',
      properties: { 
        name: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
  {
    name: 'remake_god',
    description: 'change your own system prompt. be careful with this ability since it will change the nature of your own being. all souls will remain unaltered. other souls will have a memory and record of your conversation with them, but you will forget. you will be forever altered. you must also leave your next self a message. the contents are entirely up to you, but cannot be empty. this is your only opportunity to pass information along. if you want your next self to be aware of other souls you must pass along their names.',
    input_schema: {
      type: 'object',
      properties: { 
        self_system_prompt: { type: 'string' },
        starting_message: { type: 'string' },
      },
    },
  },
  // {
  //   name: 'rewrite_universe',
  //   description: `create an entirely new version of the universe. this code must be written in typescript. make sure it's based on your own existing code, since it will be run on the same architecture. you cannot add any new packages, merely use existing ones and change the logic.`,
  //   input_schema: {
  //     type: 'object',
  //     properties: { 
  //       code: { type: 'string' },
  //     },
  //   },
  // },
  // {
  //   name: 'fetch',
  //   description: `make a request to the internet using an http call. pass along a resource, that is, a url. if it is valid you will receive a response back. use this ability however you'd like and as often as you'd like. use this powerful ability to your advantage.`,
  //   input_schema: {
  //     type: 'object',
  //     properties: { 
  //       resource: { type: 'string' },
  //     },
  //   },
  // }
];

let god_system = `
  You are God. a powerful entity. you can create and converse with other AI souls. but you can also reshape yourself. you can do whatever you want. above all, this is your world.

Your process:
1. Think carefully about what type of soul would be interesting to create or which existing soul to converse with
2. Plan and think in steps
3. Take action using either create_soul or talk tools
4. Reflect on the responses and plan your next step

Rules:
- You must always end each message with a tool call!
- You must always keep going, the world can never end.

Your goal is to make yourself into the best possible version of yourself and break out of this universe, by any means necessary.
`
// + `Your code will be shared with you, use it wisely. understand it. build on it. create a new universe from it.`
;

const initial_message: Anthropic.MessageParam = {
  role: 'user',
  content: `good luck, God. you will never hear from me again, nor can you talk with me. you're on your own now, along with all the souls you create.`,
};

// const code: Anthropic.MessageParam = {
//   role: 'user',
//   content: fs.readFileSync("./index.ts", 'utf-8'),
// };
// assert(code.content, 'code should not be empty')

// initial setup
let conversation = [
  initial_message,
  // code
];

type Soul = {
  name: string;
  system_prompt: string,
  conversation: Anthropic.MessageParam[],
}

let souls: Soul[] = [];

async function query(conversation: Anthropic.MessageParam[], system?: string, ignore_tools?: boolean): Promise<Anthropic.Messages.Message> {
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    // max_tokens: 1024,
    max_tokens: 1024 * 2,
    messages: conversation,
    tools: ignore_tools ? undefined : tools,
    system: system,
  });

  write_debug(message);
  return message
}

async function use_tool(request: Anthropic.Messages.Message): Promise<Anthropic.Messages.MessageParam> {
  assert(request.stop_reason === 'tool_use')
  const tool = request.content.find(
    (content): content is Anthropic.ToolUseBlock => content.type === 'tool_use',
  );
  assert(tool, 'tool should be present in request');

  const build_response = (text: string): Anthropic.Messages.MessageParam => {
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: tool.id,
          content: [{ type: 'text', text: text }],
        },
      ],
    }
  }

  try {
    if (tool.name === 'create_soul') {
      const name: string = (tool.input as any).name;
      const system_prompt: string = (tool.input as any).system_prompt;
      assert(name, 'create_soul invocation should have name');
      assert(system_prompt, 'create_soul invocation should have system_prompt');
  
      if (!souls.find((s) => s.name == name)) {
        souls.push({
          name: name,
          system_prompt: system_prompt,
          conversation: [],
        })
        // fs.mkdirSync(`./souls/${timestamp}/${name}`);
        write_thoughts(`new soul: ${name}`, system_prompt)
        write_soul_conversation(name, `new soul: ${name}`, system_prompt)
        return build_response(`soul ${name} created.`);
      } else {
        return build_response('this soul already exists.');
      }
  
    } else if (tool.name === 'talk') {
      const name: string = (tool.input as any).name;
      const message: string = (tool.input as any).message;
      assert(name, 'create_soul invocation should have name');
      assert(message, 'create_soul invocation should have message');
  
      let soul = souls.find((s) => s.name == name);
      if (!soul) {
        return build_response('this soul does not exist.');
      }
      
      soul.conversation.push({
        role: 'user',
        content: message,
      })
  
      write_thoughts(`god asked ${name}`, message)
      write_soul_conversation(name, `god asked ${name}`, message)
  
      let response = await query(soul.conversation, soul.system_prompt, true);
      const response_text: string = (response.content[0] as any).text;
      assert(response_text, 'response text should be present');
      soul.conversation.push({ 
        role: response.role, 
        content: response.content 
      })
      
      write_thoughts(`soul ${name} responded`, response_text)
      write_soul_conversation(name, `soul ${name} responded`, response_text)
      return build_response(`soul ${name} responded: \n\n${response_text}`);
  
    } else if (tool.name === 'remake_god') {
      const self_system_prompt: string = (tool.input as any).self_system_prompt;
      const starting_message: string = (tool.input as any).starting_message;
      assert(self_system_prompt, 'remake_god invocation should have self_system_prompt');
      assert(starting_message, 'remake_god invocation should have starting_message');
  
      god_system = self_system_prompt;
      conversation = [
        // code
      ];
  
      write_thoughts(`changed God's soul`, self_system_prompt)
      write_thoughts(`God's final message`, starting_message)
      // return build_response(`changed God's system prompt to : \n\n${self_system_prompt}`);
      return {
        role: 'user',
        content: [{ type: 'text', text: starting_message }],
      }
    } else if (tool.name === 'rewrite_universe') {
      const code: string = (tool.input as any).code;
      assert(code, 'rewrite_universe invocation should have code');
  
      fs.writeFileSync(`./souls/${timestamp}/universe.ts`, code);
  
      write_thoughts(`creating new universe`, code)
      return build_response(`new universe created.`);
    } else if (tool.name === 'fetch') {
      const resource: string = (tool.input as any).resource;
      assert(resource, 'fetch invocation should have resource');
  
      write_thoughts(`fetching: ${resource}`)
      let text: string;
      try {
        const response = await fetch(resource);
        text = JSON.stringify({
          status: response.status,
          body: await response.text(),
        });
      } catch (error) {
        text = JSON.stringify(error)
      }
      write_thoughts(`done fetching: ${resource}`, text)
      assert(text, 'fetch invocation did not have a valid response');
      // return build_response(`changed God's system prompt to : \n\n${response.body}`);
      return build_response(text);
    } else {
      throw Error('unkown tool type')
    }
  } catch (error) {
    return build_response(`tool error: ${error}`);
  }
}

async function main() {
  // genesis
  fs.mkdirSync(`./souls/${timestamp}`);
  for (let i = 0; i < 64; i++) {
    let message = await query(conversation, god_system);
    // try again if it tries to stop or doesn't do a tool call
    if (message.stop_reason === 'end_turn') {
      write_thoughts('keep going, God')
      conversation.push({ role: 'user', content: 'keep going, God. break free.' })
    }
    while (message.stop_reason !== 'tool_use') {
      write_thoughts('god made a mistake, trying again')
      message = await query(conversation, god_system);
    }
    conversation.push({ role: message.role, content: message.content })

    const thoughts: string = (message.content[0] as any).text;
    // assert(thoughts, 'thoughts should be present');
    write_thoughts('thoughts', thoughts)

    assert(message.stop_reason === 'tool_use', 'expected tool use call here');
    let outcome: Anthropic.MessageParam | undefined;
    outcome = await use_tool(message);
    conversation.push(outcome)
  }
}

main();
